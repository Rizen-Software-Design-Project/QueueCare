import express from 'express';
import OpenAI from 'openai';
import { supabase } from '../../lib/supabaseAdmin.js';
import env from 'dotenv';

env.config();

const router = express.Router();
if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV !== "test") {
  throw new Error("Missing API key");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "test-key",
});

const API_BASE = process.env.VITE_API_BASE || 'https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net';

// Here we define all the tools we give to GPT so it knows what actions it can take on behalf of the user
// This was actual easy to implement as it is a method I am using in coding one of my projects. I would love to refer to it as RAG but its not.
// Most of these objects may look similar but what makes tham differ are the names of the functiions,  the description or contect the AI has to take onand the values ior params the AI needs in order to execute those funcs
// Please Do not abuse this feature AI credits are expensive 😭 and if it does not work and you are keen to test it please email me at 2825328@students.wits.ac.za so I can buy the credits

const PATIENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_my_appointments',
      description: 'Get the current patient\'s upcoming and past appointments',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string', description: 'The patient profile ID' },
        },
        required: ['patient_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_queue_status',
      description: 'Get the patient\'s current position in the queue',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: 'Patient email or phone' },
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['contact', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_clinics',
      description: 'Search for clinics by name, province, or district. Use when patient asks to find a clinic or book somewhere.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Clinic name (partial match ok)' },
          province: { type: 'string', description: 'South African province' },
          district: { type: 'string', description: 'District name' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_slots',
      description: 'Get available appointment slots at a clinic. Returns slot UUIDs, dates, times and capacity.',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Book an appointment slot for the patient — only call this after showing the patient the slot details and getting their explicit confirmation',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string', description: 'Patient profile ID' },
          facility_id: { type: 'number', description: 'Facility ID where the slot belongs' },
          slot_id: { type: 'string', description: 'Slot UUID to book' },
          reason: { type: 'string', description: 'Reason for appointment (ask the patient if not provided)' },
        },
        required: ['patient_id', 'facility_id', 'slot_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_appointment',
      description: 'Cancel a patient\'s appointment — only call after patient confirms',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment ID to cancel' },
          patient_id: { type: 'string', description: 'Patient profile ID' },
        },
        required: ['appointment_id', 'patient_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'join_queue',
      description: 'Add the patient to the virtual queue at their clinic (requires an existing booked appointment)',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: 'Patient email or phone' },
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['contact', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'leave_queue',
      description: 'Remove the patient from the queue at their clinic',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: 'Patient email or phone' },
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['contact', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_appointment',
      description: 'Reschedule a patient appointment to a different slot. Show the new slot details and confirm before calling.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment UUID to reschedule' },
          patient_id: { type: 'string', description: 'Patient profile UUID' },
          new_slot_id: { type: 'string', description: 'New slot UUID to move to' },
        },
        required: ['appointment_id', 'patient_id', 'new_slot_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'join_walkin_queue',
      description: 'Add a walk-in patient (no existing appointment) directly to the queue',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string', description: 'Patient profile UUID' },
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['patient_id', 'facility_id'],
      },
    },
  },
];

const STAFF_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_queue',
      description: 'Get the full patient queue for the staff member\'s clinic',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointments',
      description: 'Get appointments at the clinic, optionally filtered by date',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
          date: { type: 'string', description: 'Filter date YYYY-MM-DD (optional)' },
        },
        required: ['facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_queue_status',
      description: 'Update a patient\'s queue entry status to called or completed. Use patient contact (email/phone) and facility_id.',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: 'Patient email or phone number' },
          facility_id: { type: 'number', description: 'Facility ID' },
          status: { type: 'string', enum: ['waiting', 'called', 'completed'], description: 'New queue status' },
        },
        required: ['contact', 'facility_id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_appointment_status',
      description: 'Update an appointment status (booked, confirmed, complete, no_show, cancelled)',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string', description: 'Appointment UUID' },
          status: { type: 'string', enum: ['booked', 'confirmed', 'complete', 'no_show', 'cancelled'], description: 'New status' },
          facility_id: { type: 'number', description: 'Your facility ID (required for security)' },
        },
        required: ['appointment_id', 'status', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_slot',
      description: 'Create a new appointment slot at the clinic',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
          slot_date: { type: 'string', description: 'Date YYYY-MM-DD' },
          slot_time: { type: 'string', description: 'Time HH:MM' },
          total_capacity: { type: 'number', description: 'Max patients for this slot' },
          duration_minutes: { type: 'number', description: 'Duration in minutes' },
        },
        required: ['facility_id', 'slot_date', 'slot_time', 'total_capacity', 'duration_minutes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_slot',
      description: 'Update an existing appointment slot (change time, date, capacity, or duration)',
      parameters: {
        type: 'object',
        properties: {
          slot_id: { type: 'string', description: 'Slot UUID to update' },
          facility_id: { type: 'number', description: 'Your facility ID (required for security)' },
          slot_date: { type: 'string', description: 'New date YYYY-MM-DD (optional)' },
          slot_time: { type: 'string', description: 'New time HH:MM (optional)' },
          total_capacity: { type: 'number', description: 'New capacity (optional)' },
          duration_minutes: { type: 'number', description: 'New duration in minutes (optional)' },
        },
        required: ['slot_id', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_slot',
      description: 'Deactivate/delete an appointment slot. Will fail if patients are booked into it.',
      parameters: {
        type: 'object',
        properties: {
          slot_id: { type: 'string', description: 'Slot UUID to delete' },
          facility_id: { type: 'number', description: 'Your facility ID (required for security)' },
        },
        required: ['slot_id', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_walkin_for_patient',
      description: 'Book a walk-in appointment for a patient at the clinic (staff action). Use when a patient arrives without a prior booking.',
      parameters: {
        type: 'object',
        properties: {
          patient_id: { type: 'string', description: 'Patient profile UUID' },
          slot_id: { type: 'string', description: 'Slot UUID' },
          facility_id: { type: 'number', description: 'Facility ID' },
          reason: { type: 'string', description: 'Reason for visit' },
        },
        required: ['patient_id', 'slot_id', 'facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics_summary',
      description: 'Get a summary of wait times and no-show rates for the clinic',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
        },
        required: ['facility_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_users',
      description: 'Search for patients or staff by name, surname, or email. Use this to find a patient\'s profile_id when booking a walk-in or looking up queue status.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'First name (partial match)' },
          surname: { type: 'string', description: 'Surname (partial match)' },
          email: { type: 'string', description: 'Email (partial match)' },
          role: { type: 'string', enum: ['patient', 'staff', 'admin'], description: 'Filter by role' },
        },
        required: [],
      },
    },
  },
];

const ADMIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_all_analytics',
      description: 'Get analytics summary across all facilities or a specific one',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Optional specific facility ID' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_applications',
      description: 'Get pending staff/admin role applications',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], description: 'Filter by status' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'approve_application',
      description: 'Approve a role application',
      parameters: {
        type: 'object',
        properties: {
          application_id: { type: 'string', description: 'Application ID' },
        },
        required: ['application_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reject_application',
      description: 'Reject a role application',
      parameters: {
        type: 'object',
        properties: {
          application_id: { type: 'string', description: 'Application ID' },
        },
        required: ['application_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_all_staff',
      description: 'Get all users with role staff or admin, including their clinic assignments from staff_assignments. This is the correct way to find a staff member or admin by name.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_users',
      description: 'Search for users (patients, staff, or admins) by name, surname, or email in the profiles table. Use this to find a specific person before taking any action on them.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'First name (partial match)' },
          surname: { type: 'string', description: 'Surname (partial match)' },
          email: { type: 'string', description: 'Email (partial match)' },
          role: { type: 'string', enum: ['patient', 'staff', 'admin'], description: 'Filter by role' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_user_role',
      description: 'Remove admin or staff access from a user by setting their role back to patient. Also removes any staff_assignments entries. Only call this after explicit user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          profile_id: { type: 'string', description: 'The UUID of the user profile to demote' },
          name: { type: 'string', description: 'Name of the user (for confirmation display)' },
        },
        required: ['profile_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_clinics',
      description: 'Search clinics by name, province, or district',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          province: { type: 'string' },
          district: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_facility_status',
      description: 'Activate or deactivate a facility',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
          is_active: { type: 'boolean', description: 'Whether the facility should be active' },
        },
        required: ['facility_id', 'is_active'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appointments',
      description: 'Get appointments at a specific clinic',
      parameters: {
        type: 'object',
        properties: {
          facility_id: { type: 'number', description: 'Facility ID' },
          date: { type: 'string', description: 'Filter date YYYY-MM-DD (optional)' },
        },
        required: ['facility_id'],
      },
    },
  },
];

// This switch handles each tool call GPT makes and runs the actual Supabase or API calls to fulfill the request────────────────

async function executeTool(name, args) {
  switch (name) {
    case 'get_my_appointments': {
      const { data } = await supabase
        .from('appointments')
        .select('id, status, reason, booked_at, appointment_slots(slot_date, slot_time, duration_minutes, facilities(name, district))')
        .eq('patient_id', args.patient_id)
        .order('booked_at', { ascending: false })
        .limit(10);
      return data || [];
    }

    case 'get_my_queue_status': {
      const res = await fetch(`${API_BASE}/queue/my_queue?contact=${encodeURIComponent(args.contact)}&facility_id=${args.facility_id}`);
      return res.ok ? res.json() : { error: 'Could not fetch queue status' };
    }

    case 'search_clinics': {
      let query = supabase
        .from('facilities')
        .select('id, name, district, province, is_active')
        .eq('is_active', true)
        .limit(8);
      if (args.name) query = query.ilike('name', `%${args.name}%`);
      if (args.province) query = query.ilike('province', `%${args.province}%`);
      if (args.district) query = query.ilike('district', `%${args.district}%`);
      const { data } = await query;
      return data || [];
    }

    case 'get_available_slots': {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('appointment_slots')
        .select('id, slot_date, slot_time, duration_minutes, total_capacity, booked_count')
        .eq('facility_id', args.facility_id)
        .gte('slot_date', today)
        .order('slot_date')
        .order('slot_time')
        .limit(10);
      return (data || []).filter(s => (s.booked_count || 0) < (s.total_capacity || 1));
    }

    case 'book_appointment': {
      const res = await fetch(`${API_BASE}/appointments/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: args.patient_id,
          facility_id: args.facility_id,
          slot_id: args.slot_id,
          reason: args.reason || 'General consultation',
        }),
      });
      return res.json();
    }

    case 'cancel_appointment': {
      const res = await fetch(`${API_BASE}/appointments/${args.appointment_id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: args.patient_id }),
      });
      return res.json();
    }

    case 'join_queue': {
      const res = await fetch(`${API_BASE}/queue/add_to_queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_details: args.contact, facility_id: args.facility_id }),
      });
      return res.json();
    }

    case 'leave_queue': {
      const res = await fetch(
        `${API_BASE}/queue/remove_queue?contact_details=${encodeURIComponent(args.contact)}&facility_id=${args.facility_id}`,
        { method: 'DELETE' }
      );
      return res.ok ? { success: true } : { error: 'Could not leave queue' };
    }

    case 'reschedule_appointment': {
      const res = await fetch(`${API_BASE}/appointments/${args.appointment_id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: args.patient_id, new_slot_id: args.new_slot_id }),
      });
      return res.json();
    }

    case 'join_walkin_queue': {
      const res = await fetch(`${API_BASE}/appointments/queue/walk-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: args.patient_id, facility_id: args.facility_id }),
      });
      return res.json();
    }

    case 'get_queue': {
      const res = await fetch(`${API_BASE}/queue/full_queue?facility_id=${args.facility_id}`);
      return res.ok ? res.json() : { error: 'Could not fetch queue' };
    }

    case 'get_appointments': {
      let query = supabase
        .from('appointments')
        .select('id, status, reason, booked_at, appointment_slots(slot_date, slot_time), profiles(name, surname, email, phone_number)')
        .eq('facility_id', args.facility_id)
        .limit(20);
      if (args.date) {
        query = query.eq('appointment_slots.slot_date', args.date);
      }
      const { data } = await query;
      return data || [];
    }

    case 'update_queue_status': {
      const res = await fetch(`${API_BASE}/queue/update_status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_details: args.contact,
          facility_id: args.facility_id,
          status: args.status,
        }),
      });
      return res.ok ? { success: true } : { error: 'Could not update queue status' };
    }

    case 'update_appointment_status': {
      const res = await fetch(`${API_BASE}/appointments/staff/appointments/${args.appointment_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: args.status, facility_id: args.facility_id }),
      });
      return res.json();
    }

    case 'create_slot': {
      const res = await fetch(`${API_BASE}/appointments/staff/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: args.facility_id,
          slot_date: args.slot_date,
          slot_time: args.slot_time,
          total_capacity: args.total_capacity,
          duration_minutes: args.duration_minutes || 30,
        }),
      });
      return res.json();
    }

    case 'update_slot': {
      const body = { facility_id: args.facility_id };
      if (args.slot_date) body.slot_date = args.slot_date;
      if (args.slot_time) body.slot_time = args.slot_time;
      if (args.total_capacity) body.total_capacity = args.total_capacity;
      if (args.duration_minutes) body.duration_minutes = args.duration_minutes;
      const res = await fetch(`${API_BASE}/appointments/staff/slots/${args.slot_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.json();
    }

    case 'delete_slot': {
      const res = await fetch(`${API_BASE}/appointments/staff/slots/${args.slot_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: args.facility_id }),
      });
      return res.ok ? { success: true } : { error: 'Could not delete slot' };
    }

    case 'book_walkin_for_patient': {
      // The walk-in route expects a full profile object so we fetch it from Supabase before calling the endpoint
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, surname, email, phone_number')
        .eq('id', args.patient_id)
        .single();
      if (!profile) return { error: 'Patient not found' };
      const res = await fetch(`${API_BASE}/appointments/book-walkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          slot_id: args.slot_id,
          facility_id: args.facility_id,
          reason: args.reason || 'Walk-in',
        }),
      });
      return res.json();
    }

    case 'get_analytics_summary': {
      const [waitRes, noshowRes] = await Promise.all([
        supabase.from('analytics_avg_wait_times').select('*').eq(args.facility_id ? 'facility_id' : 'facility_id', args.facility_id || undefined).limit(24),
        supabase.from('analytics_noshows').select('*').order('date', { ascending: false }).limit(7),
      ]);
      return { wait_times: waitRes.data || [], no_shows: noshowRes.data || [] };
    }

    case 'get_all_analytics': {
      const [waitRes, noshowRes] = await Promise.all([
        args.facility_id
          ? supabase.from('analytics_avg_wait_times').select('*').eq('facility_id', args.facility_id)
          : supabase.from('analytics_avg_wait_times').select('*').limit(50),
        supabase.from('analytics_noshows').select('*').order('date', { ascending: false }).limit(14),
      ]);
      return { wait_times: waitRes.data || [], no_shows: noshowRes.data || [] };
    }

    case 'get_applications': {
      let query = supabase.from('role_applications').select('*').order('submitted_at', { ascending: false }).limit(20);
      if (args.status) query = query.eq('status', args.status);
      const { data } = await query;
      return data || [];
    }

    case 'approve_application': {
      const { error } = await supabase
        .from('role_applications')
        .update({ status: 'approved' })
        .eq('id', args.application_id);
      return error ? { error: error.message } : { success: true };
    }

    case 'reject_application': {
      const { error } = await supabase
        .from('role_applications')
        .update({ status: 'rejected' })
        .eq('id', args.application_id);
      return error ? { error: error.message } : { success: true };
    }

    case 'get_all_staff': {
      // Admins live in the profiles table with role=admin and not in staff_assignments so we need two separate queries to catch everyone
      const [staffRes, adminRes] = await Promise.all([
        supabase
          .from('staff_assignments')
          .select('id, role, facility_id, profile_id, profiles(id, name, surname, email, role), facilities(name, district)')
          .limit(30),
        supabase
          .from('profiles')
          .select('id, name, surname, email, role')
          .eq('role', 'admin')
          .limit(20),
      ]);
      return {
        staff_assignments: staffRes.data || [],
        admins: adminRes.data || [],
      };
    }

    case 'search_users': {
      let query = supabase
        .from('profiles')
        .select('id, name, surname, email, role, phone_number')
        .limit(15);
      if (args.name) query = query.ilike('name', `%${args.name}%`);
      if (args.surname) query = query.ilike('surname', `%${args.surname}%`);
      if (args.email) query = query.ilike('email', `%${args.email}%`);
      if (args.role) query = query.eq('role', args.role);
      const { data } = await query;
      return data || [];
    }

    case 'remove_user_role': {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ role: 'patient' })
        .eq('id', args.profile_id);
      if (profileErr) return { error: profileErr.message };
      // When removing a role we also clean up leftover rows in staff_assignments so the data stays consistent
      await supabase.from('staff_assignments').delete().eq('profile_id', args.profile_id);
      return { success: true, message: `${args.name || args.profile_id} has been demoted to patient and removed from all clinic assignments.` };
    }

    case 'update_facility_status': {
      const { error } = await supabase
        .from('facilities')
        .update({ is_active: args.is_active })
        .eq('id', args.facility_id);
      return error ? { error: error.message } : { success: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// These are the system prompts we inject at the start of each conversation to tell GPT who it is and what it can do for each role────────────

function buildSystemPrompt(context) {
  const { role, profile, facilityId, facilityName, pageContext } = context;
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const base = `You are QueueCare AI, an intelligent assistant embedded in the QueueCare healthcare platform. Today is ${today}. You speak naturally and helpfully. Keep responses concise and clear. Never expose raw IDs to the user unless they ask. Format dates and times in a human-readable way.`;

  if (role === 'patient') {
    return `${base}

You are helping a patient named ${profile?.name || 'the patient'} (ID: ${profile?.id}).
Their contact: ${profile?.email || profile?.phone_number || 'unknown'}.
Current page: ${pageContext || 'patient dashboard'}.

You can help them:
- View their upcoming and past appointments
- Find clinics by name or location (province/district)
- Check their position in the queue
- Book new appointments (always show slot details first and ask for confirmation before booking)
- Cancel an appointment (always confirm before doing it)
- Reschedule an appointment to a new slot (get available slots, show options, confirm, then call reschedule_appointment)
- Join the virtual queue (join_queue — requires an existing booked appointment)
- Join as a walk-in without a prior appointment (join_walkin_queue)
- Leave the queue (leave_queue)
- Answer any questions about how QueueCare works

When a patient says something like "book me at [clinic]" or "find a slot near Limpopo":
1. Search for clinics first — note the clinic's numeric facility id from the result.
2. Get available slots for that facility_id — note each slot's UUID id.
3. Show the slots and ask: "Shall I book slot [date/time] at [clinic name] for you?"
4. When patient confirms, call book_appointment with patient_id, the clinic's facility_id, the slot's UUID as slot_id, and a reason.
5. Never call book_appointment without a valid facility_id and slot UUID.`;
  }

  if (role === 'staff') {
    return `${base}

You are helping a staff member named ${profile?.name || 'staff'} (ID: ${profile?.id}).
Their assigned facility: ${facilityName || 'unknown'} (ID: ${facilityId || 'unknown'}).
Current page: ${pageContext || 'staff dashboard'}.

You can help them:
- View the full patient queue (get_queue)
- Call the next patient or mark a patient as completed (update_queue_status — needs their email/phone and facility_id)
- View and filter appointments by date or status (get_appointments)
- Update an appointment status to confirmed, no_show, cancelled, complete (update_appointment_status)
- Create new appointment slots (create_slot — all fields required including duration_minutes)
- Update an existing slot's time, date, capacity or duration (update_slot)
- Delete a slot (delete_slot — will fail if patients are booked into it)
- Book a walk-in appointment for a patient who arrives without a booking (book_walkin_for_patient — needs patient_id, slot_id, facility_id; search_users first if you need their ID)
- View analytics for their clinic (get_analytics_summary)

Always operate within their assigned facility (${facilityName || facilityId}). Do not access other facilities.
When the staff says "call next patient" or "mark as seen", use update_queue_status with the patient's contact and the facility_id.`;
  }

  if (role === 'admin') {
    return `${base}

You are helping an admin named ${profile?.name || 'admin'} (ID: ${profile?.id}).
Current page: ${pageContext || 'admin dashboard'}.

CRITICAL — Data model facts you must always follow:
- "Staff members" = users in the profiles table with role='staff'. Their clinic assignments live in staff_assignments.
- "Admins" = users in the profiles table with role='admin'. Admins do NOT appear in staff_assignments.
- To find ANY user by name, ALWAYS call search_users first — never assume someone does not exist without searching.
- To list all staff+admins, call get_all_staff (returns both staff_assignments rows AND admin profiles).
- "Remove" or "demote" a user means calling remove_user_role with their profile_id. This sets their profile role to 'patient' and deletes their staff_assignments.
- A name may appear in role_applications but have no profile entry (e.g. fully rejected applicants who never gained access). They cannot be "removed" because they have no active access.
- role_applications tracks application history only; actual system access is controlled by profiles.role and staff_assignments.

Workflow for removing a user:
1. Call search_users with their name/surname.
2. If found, tell the admin: "I found [Name] ([role]). Shall I remove their access?"
3. Only call remove_user_role after the admin confirms.
4. If not found in profiles, explain they have no active system account (they may only have a rejected application).

You can help them:
- View and manage all facilities across all provinces
- Approve or reject staff/admin role applications (use get_applications)
- View all staff members and admins (use get_all_staff or search_users)
- Remove a staff member or admin's access (search_users → confirm → remove_user_role)
- Access analytics across all clinics
- Activate or deactivate facilities
- Answer questions about system-wide operations and statistics`;
  }

  return `${base}\n\nHelp this user navigate QueueCare. Current page: ${pageContext || 'unknown'}.`;
}

function getToolsForRole(role) {
  if (role === 'patient') return PATIENT_TOOLS;
  if (role === 'staff') return [...STAFF_TOOLS];
  if (role === 'admin') return ADMIN_TOOLS;
  return [];
}

// This is the main chat endpoint it receives messages from the frontend talks to GPT and runs any tool calls in a loop until GPT is done──────

router.post('/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const systemPrompt = buildSystemPrompt(context || {});
    const tools = getToolsForRole(context?.role);

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      max_tokens: 800,
      temperature: 0.4,
    });

    let msg = response.choices[0].message;
    let loopCount = 0;
    const MAX_LOOPS = 5;

    while (msg.tool_calls && msg.tool_calls.length > 0 && loopCount < MAX_LOOPS) {
      loopCount++;
      openaiMessages.push(msg);

      const toolResults = await Promise.all(
        msg.tool_calls.map(async (call) => {
          const args = JSON.parse(call.function.arguments);
          const result = await executeTool(call.function.name, args);
          return {
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          };
        })
      );

      openaiMessages.push(...toolResults);

      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        max_tokens: 800,
        temperature: 0.4,
      });

      msg = response.choices[0].message;
    }

    res.json({ reply: msg.content });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ error: 'AI service unavailable. Please try again.' });
  }
});

export default router;
