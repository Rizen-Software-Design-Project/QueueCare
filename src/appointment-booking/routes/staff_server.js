import express from "express";
import { supabase } from "../../lib/supabaseAdmin.js";


const router = express.Router();


// ─────────────────────────────────────────────
// Helper: format minutes into readable string
// ─────────────────────────────────────────────
function formatMinutes(totalMinutes) {
  if (totalMinutes < 0) return "0m";
  const days  = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins  = totalMinutes % 60;
  let out = "";
  if (days)  out += `${days}d `;
  if (hours) out += `${hours}h `;
  if (mins)  out += `${mins}m`;
  return out.trim() || "0m";
}

// ─────────────────────────────────────────────
// Helper: resolve patient ID from email or phone
// ─────────────────────────────────────────────
async function getPatientId(contact_details) {
  if (!contact_details) return { error: "Missing contact details" };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${contact_details},phone_number.eq.${contact_details}`)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!profile) return { error: "Person does not have an account." };

  return { patient_id: profile.id };
}

// ─────────────────────────────────────────────
// Check if booked
// ─────────────────────────────────────────────
router.get("/is_booked", async (req, res) => {
  const { contact_details } = req.query;

  const result = await getPatientId(contact_details);
  if (result.error) return res.status(404).json({ error: result.error });

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", result.patient_id)
      .eq("status", "booked"); // only count active bookings

    if (error) throw error;

    return res.status(200).json({ is_booked: (data || []).length > 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// View queue (staff view of today's queue)
// ─────────────────────────────────────────────
router.get("/view_queue", async (req, res) => {
  const { facility_id } = req.query;

  if (!facility_id) {
    return res.status(400).json({ error: "facility_id is required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("virtual_queues")
      .select(`
        id,
        patient_id,
        status,
        joined_at,
        appointments (
          reason,
          appointment_slots (
            slot_date,
            slot_time,
            duration_minutes
          )
        ),
        profiles (name, surname, sex, email, phone_number, dob)
      `)
      .eq("facility_id", facility_id)
      .order("joined_at", { ascending: true });

    if (error) throw error;

    // Filter to today's slots only and add computed fields
    // In view_queue, replace the filter line:
const todayEntries = (data || [])
  .filter(entry => {
    const appt = Array.isArray(entry.appointments) ? entry.appointments[0] : entry.appointments;
    return appt?.appointment_slots?.slot_date === today;
  })
  .sort((a, b) => {
    const aAppt = Array.isArray(a.appointments) ? a.appointments[0] : a.appointments;
    const bAppt = Array.isArray(b.appointments) ? b.appointments[0] : b.appointments;
    const aTime = aAppt?.appointment_slots?.slot_time || "";
    const bTime = bAppt?.appointment_slots?.slot_time || "";
    return aTime.localeCompare(bTime);
  });

    let waitingPosition = 0;

    const enriched = todayEntries.map((entry) => {
  const appt = Array.isArray(entry.appointments) ? entry.appointments[0] : entry.appointments;
  const slot = appt?.appointment_slots;

      let end_time = null;
      if (slot?.slot_time && slot?.duration_minutes) {
        const endDate = new Date(`1970-01-01T${slot.slot_time}`);
        endDate.setMinutes(endDate.getMinutes() + slot.duration_minutes);
        end_time = endDate.toTimeString().slice(0, 8);
      }

      let position = null;
      if (entry.status === "waiting") {
        waitingPosition++;
        position = waitingPosition;
      }

      return {
        ...entry,
        position,
        appointments: {
          ...entry.appointments,
          appointment_slots: slot ? { ...slot, end_time } : null,
        },
      };
    });

    return res.status(200).json({ data: enriched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Estimated time (time until patient's slot)
// ─────────────────────────────────────────────
router.get("/estimated_time", async (req, res) => {
  const { contact_details, facility_id } = req.query;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const result = await getPatientId(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("appointment_slots(slot_date, slot_time)")
      .eq("patient_id", result.patient_id)
      .eq("facility_id", facility_id)
      .eq("status", "booked")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "No active appointment found." });

    const slot = data.appointment_slots;
    if (!slot) return res.status(500).json({ error: "Missing slot data." });

    const appointmentTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
    const diffMinutes = Math.round((appointmentTime - new Date()) / 60000);

    return res.status(200).json({
      estimated_wait: diffMinutes < 0 ? "Appointment time has passed." : formatMinutes(diffMinutes),
      minutes: diffMinutes,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Queue position
// ─────────────────────────────────────────────
router.get("/queue_position", async (req, res) => {
  const { contact_details, facility_id } = req.query;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const result = await getPatientId(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });

  try {
    const { data, error } = await supabase
      .from("virtual_queues")
      .select("patient_id, appointments(appointment_slots(slot_time))")
      .eq("facility_id", facility_id)
      .eq("status", "waiting");

    if (error) throw error;

    const sorted = (data || []).sort((a, b) => {
  const aAppt = Array.isArray(a.appointments) ? a.appointments[0] : a.appointments;
  const bAppt = Array.isArray(b.appointments) ? b.appointments[0] : b.appointments;
  const aTime = aAppt?.appointment_slots?.slot_time || "";
  const bTime = bAppt?.appointment_slots?.slot_time || "";
  return aTime.localeCompare(bTime);
});

    const index = sorted.findIndex(e => e.patient_id === result.patient_id);

    if (index === -1) {
      return res.status(404).json({ error: "Patient not found in queue." });
    }

    return res.status(200).json({ position: index + 1 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get("/full_queue", async (req, res) => {
  const { facility_id } = req.query;
 
  if (!facility_id) return res.status(400).json({ error: "Missing facility_id" });
 
  const { data, error } = await supabase
    .from("virtual_queues")
    .select(
      `*,
      profiles(name, surname, email, phone_number),
      appointments(id, reason, appointment_slots(slot_time, slot_date, duration_minutes))`
    )
    .eq("facility_id", facility_id)
    .neq("status", "completed")
    .order("joined_at", { ascending: true });
 
  if (error) return res.status(500).json({ error: error.message });
 
  let waitingPosition = 0;
 
  const enriched = (data || []).map((entry) => {
    const appt = Array.isArray(entry.appointments)
      ? entry.appointments[0]
      : entry.appointments;
    const slot = appt?.appointment_slots;
 
    let end_time = null;
    if (slot?.slot_time && slot?.duration_minutes) {
      const endDate = new Date(`1970-01-01T${slot.slot_time}`);
      endDate.setMinutes(endDate.getMinutes() + slot.duration_minutes);
      end_time = endDate.toTimeString().slice(0, 5);
    }
 
    let position = null;
    if (entry.status === "waiting") {
      waitingPosition++;
      position = waitingPosition;
    }
 
    return {
      ...entry,
      position,
      appointments: appt
        ? { ...appt, appointment_slots: slot ? { ...slot, end_time } : null }
        : null,
    };
  });
 
  return res.json({ data: enriched });
});
export default router;