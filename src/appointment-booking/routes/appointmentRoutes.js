import express from 'express';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import env from 'dotenv';

env.config();

const router = express.Router();

const supabase = createClient(process.env.SB_URL, process.env.SB_KEY);

// ── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

transporter.verify()
    .then(() => console.log('SMTP ready'))
    .catch((err) => console.error('SMTP failed:', err.message));


const getEmailContext = async (patient_id, slot_id, facility_id) => {
    const [profileRes, slotRes, facilityRes] = await Promise.all([
        supabase.from('profiles').select('email, name, surname').eq('id', patient_id).single(),
        supabase.from('appointment_slots').select('slot_date, slot_time, duration_minutes').eq('id', slot_id).single(),
        supabase.from('facilities').select('name, address').eq('id', facility_id).single(),
    ]);


    let email = profileRes.data?.email;
    if (!email) {
        const { data: authUser } = await supabase.auth.admin.getUserById(patient_id);
        email = authUser?.user?.email;
    }

    return {
        email,
        name: profileRes.data?.name || 'Patient',
        surname: profileRes.data?.surname || '',
        slotDate: slotRes.data?.slot_date || 'TBD',
        slotTime: slotRes.data?.slot_time?.slice(0, 5) || 'TBD',
        duration: slotRes.data?.duration_minutes || 15,
        facilityName: facilityRes.data?.name || 'the clinic',
        facilityAddress: facilityRes.data?.address || '',
    };
};

const emailHtml = (patientName, facilityName, facilityAddress, slotDate, slotTime, duration, reason, type = 'confirmation') => {
    const isReminder = type === 'reminder';
    const heading = isReminder ? 'Appointment Reminder' : 'Appointment Confirmed';
    const icon = isReminder ? '⏰' : '✅';
    const intro = isReminder
        ? `This is a reminder that you have an appointment tomorrow.`
        : `Your appointment has been booked successfully.`;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #0F6E56; padding: 24px;">
            <h2 style="color: #ffffff; margin: 0;">${icon} ${heading}</h2>
        </div>
        <div style="padding: 24px;">
            <p>Hi ${patientName},</p>
            <p>${intro}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold; width: 130px;">Clinic</td>
                    <td style="padding: 10px;">${facilityName}</td>
                </tr>
                ${facilityAddress ? `
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Address</td>
                    <td style="padding: 10px;">${facilityAddress}</td>
                </tr>` : ''}
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold;">Date</td>
                    <td style="padding: 10px;">${slotDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Time</td>
                    <td style="padding: 10px;">${slotTime}</td>
                </tr>
                <tr style="background: #f5f5f5;">
                    <td style="padding: 10px; font-weight: bold;">Duration</td>
                    <td style="padding: 10px;">${duration} minutes</td>
                </tr>
                ${reason ? `
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Reason</td>
                    <td style="padding: 10px;">${reason}</td>
                </tr>` : ''}
            </table>
            <p style="color: #555;">Please arrive 5–10 minutes early.</p>
            <p style="color: #aaa; font-size: 12px;">— QueueCare Team</p>
        </div>
    </div>`;
};


const getAppointmentById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                appointment_slots (slot_date, slot_time, duration_minutes),
                facilities (name, address, province, district)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// ── PATIENT: Get all appointments for a patient ───────────────────────────────
// GET /appointments/my/:patient_id
const getMyAppointments = async (req, res) => {
    try {
        const { patient_id } = req.params;

        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                appointment_slots (slot_date, slot_time, duration_minutes),
                facilities (name, address, province, district)
            `)
            .eq('patient_id', patient_id)
            .order('booked_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


// ── PATIENT: Get available slots for a facility ───────────────────────────────
// POST /slots/available  body: { facility_id }
const getAvailableSlots = async (req, res) => {
    try {
        const { facility_id } = req.body;

        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id is required' });
        }

        const today = new Date().toISOString().slice(0, 10);

        // Only return slots where there is still capacity and the date is today or future
        const { data: slots, error } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('facility_id', facility_id)
            .gte('slot_date', today)
            .order('slot_date', { ascending: true })
            .order('slot_time', { ascending: true });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Filter in JS so we respect each slot's individual total_capacity
        const available = slots.filter(s => s.booked_count < s.total_capacity);

        if (available.length === 0) {
            return res.status(404).json({ error: 'No available slots for this clinic.' });
        }

        return res.status(200).json({ count: available.length, slots: available });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


const bookAppointment = async (req, res) => {
    try {
        const { patient_id, facility_id, slot_id, reason } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }
        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id is required' });
        }
        if (!slot_id) {
            return res.status(400).json({ error: 'slot_id is required' });
        }
        if (!reason?.trim()) {
            return res.status(400).json({ error: 'reason is required' });
        }

        // 1. Confirm slot still has capacity (prevent race condition)
        const { data: slot, error: slotError } = await supabase
            .from('appointment_slots')
            .select('id, booked_count, total_capacity, slot_date, slot_time, facility_id')
            .eq('id', slot_id)
            .eq('facility_id', facility_id)
            .maybeSingle();

            if (slotError) {
            return res.status(500).json({ error: slotError.message });
            }

            if (!slot) {
            return res.status(404).json({ error: 'Slot not found for this clinic' });
            }
        
        if (slot.booked_count >= slot.total_capacity) {
            return res.status(409).json({ error: 'This slot is fully booked. Please choose another.' });
        }

        // 2. Check patient has not already booked this slot
        const { data: existing } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', patient_id)
            .eq('slot_id', slot_id)
            .neq('status', 'cancelled')
            .single();

        if (existing) {
            return res.status(409).json({ error: 'You already have a booking for this slot.' });
        }

        // 3. Insert appointment
        const { data: appointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                patient_id,
                facility_id,
                slot_id,
                status: 'booked',
                appointment_type: 'scheduled',
                reason: reason.trim(),
            })
            .select()
            .single();

        if (insertError) {
            return res.status(400).json({ error: insertError.message });
        }

        // 4. Increment booked_count on the slot
        await supabase
            .from('appointment_slots')
            .update({ booked_count: slot.booked_count + 1 })
            .eq('id', slot_id);

        // 5. Insert in-app notification
        await supabase.from('notifications').insert({
            profile_id: patient_id,
            type: 'appointment_confirmation',
            channel: 'in_app',
            message: `Your appointment at the clinic on ${slot.slot_date} at ${slot.slot_time?.slice(0,5)} has been confirmed.`,
        });

        return res.status(201).json({
            message: 'Appointment booked successfully',
            appointment,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

//PATIENT: Cancel their own appointment
const cancelAppointment = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const { patient_id } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('id, patient_id, slot_id, status')
            .eq('id', appointment_id)
            .single();

        if (fetchError || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });}

            
        if (appointment.patient_id !== patient_id) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }
        if (appointment.status === 'cancelled') {
            return res.status(400).json({ error: 'Appointment is already cancelled' });
        }
        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
        }


        const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', appointment_id);

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        const { data: slot } = await supabase
            .from('appointment_slots')
            .select('booked_count')
            .eq('id', appointment.slot_id)
            .single();

        if (slot && slot.booked_count > 0) {
            await supabase
                .from('appointment_slots')
                .update({ booked_count: slot.booked_count - 1 })
                .eq('id', appointment.slot_id);
        }

        await supabase.from('notifications').insert({
            profile_id: patient_id,
            type: 'cancellation',
            channel: 'in_app',
            message: 'Your appointment has been cancelled successfully.',
        });

        return res.status(200).json({ message: 'Appointment cancelled successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


const rescheduleAppointment = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const { patient_id, new_slot_id } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }
        if (!new_slot_id) {
            return res.status(400).json({ error: 'new_slot_id is required' });
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointment_id)
            .single();

        if (fetchError || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (appointment.patient_id !== patient_id) {
            return res.status(403).json({ error: 'You can only reschedule your own appointments' });
        }
        if (['cancelled', 'completed'].includes(appointment.status)) {
            return res.status(400).json({ error: `Cannot reschedule a ${appointment.status} appointment` });
        }

        const { data: newSlot, error: slotError } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('id', new_slot_id)
            .single();

        if (slotError || !newSlot) {
            return res.status(404).json({ error: 'New slot not found' });
        }
        
        if (newSlot.booked_count >= newSlot.total_capacity) {
            return res.status(409).json({ error: 'New slot is fully booked. Please choose another.' });
        }


        const { data: oldSlot } = await supabase
            .from('appointment_slots')
            .select('booked_count')
            .eq('id', appointment.slot_id)
            .single();

        if (oldSlot && oldSlot.booked_count > 0) {
            await supabase
                .from('appointment_slots')
                .update({ booked_count: oldSlot.booked_count - 1 })
                .eq('id', appointment.slot_id);
        }


        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                slot_id: new_slot_id,
                facility_id: newSlot.facility_id,
                status: 'booked',
            })
            .eq('id', appointment_id)
            .select()
            .single();

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }


        await supabase
            .from('appointment_slots')
            .update({ booked_count: newSlot.booked_count + 1 })
            .eq('id', new_slot_id);

        // 6. In-app notification
        await supabase.from('notifications').insert({
            profile_id: patient_id,
            type: 'reschedule',
            channel: 'in_app',
            message: `Your appointment has been rescheduled to ${newSlot.slot_date} at ${newSlot.slot_time?.slice(0,5)}.`,
        });

        return res.status(200).json({
            message: 'Appointment rescheduled successfully',
            appointment: updated,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// ── PATIENT: Join virtual queue as walk-in ────────────────────────────────────
// POST /queue/walk-in  body: { patient_id, facility_id }
const joinWalkInQueue = async (req, res) => {
    try {
        const { patient_id, facility_id } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }
        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id is required' });
        }

        const today = new Date().toISOString().slice(0, 10);

        // Check patient is not already in today's queue at this facility
        const { data: existing } = await supabase
            .from('virtual_queue')
            .select('id, status')
            .eq('patient_id', patient_id)
            .eq('facility_id', facility_id)
            .eq('queue_date', today)
            .in('status', ['waiting', 'in_consultation'])
            .single();

        if (existing) {
            return res.status(409).json({ error: 'You are already in the queue at this clinic.' });
        }

        // Get current position (count of waiting patients today + 1)
        const { count } = await supabase
            .from('virtual_queue')
            .select('*', { count: 'exact', head: true })
            .eq('facility_id', facility_id)
            .eq('queue_date', today)
            .eq('status', 'waiting');

        const queue_position = (count || 0) + 1;

        const { data: entry, error } = await supabase
            .from('virtual_queue')
            .insert({
                patient_id,
                facility_id,
                status: 'waiting',
                entry_type: 'walk_in',
                queue_date: today,
                joined_at: new Date().toISOString(),
                queue_position,
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // In-app notification
        await supabase.from('notifications').insert({
            profile_id: patient_id,
            type: 'queue_joined',
            channel: 'in_app',
            message: `You have joined the queue at position ${queue_position}. We will notify you when your turn is near.`,
        });

        return res.status(201).json({
            message: 'You have joined the queue',
            queue_position,
            entry,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


//STAFF: Get all appointments for a facility

const getAppointmentsForFacility = async (req, res) => {
    try {
        const { facility_id, status, date } = req.query;

        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id is required' });
        }

        let query = supabase
            .from('appointments')
            .select(`
                *,
                profiles (name, surname, phone_number, email),
                appointment_slots (slot_date, slot_time, duration_minutes)
            `)
            .eq('facility_id', facility_id)
            .order('booked_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: appointments, error } = await query;

        if (error) {
            return res.status(400).json({ error: error.message });
        }

     
        const filtered = date
            ? appointments.filter(a => a.appointment_slots?.slot_date === date)
            : appointments;

        return res.status(200).json({ count: filtered.length, appointments: filtered });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

//STAFF: Update appointment status
const valid_statuses = ['booked', 'confirmed', 'cancelled', 'no_show', 'completed'];

const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointment_id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }
        if (!valid_statuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${valid_statuses.join(', ')}`

            });
        }

        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('id, slot_id, status, patient_id')
            .eq('id', appointment_id)
            .single();

        if (fetchError || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', appointment_id)
            .select()
            .single();

        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        if (status === 'cancelled' && appointment.status !== 'cancelled') {
            const { data: slot } = await supabase
                .from('appointment_slots')
                .select('booked_count')
                .eq('id', appointment.slot_id)
                .single();

            if (slot && slot.booked_count > 0) {
                await supabase
                    .from('appointment_slots')
                    .update({ booked_count: slot.booked_count - 1 })
                    .eq('id', appointment.slot_id);
            }

            if (appointment.patient_id) {
                await supabase.from('notifications').insert({
                    profile_id: appointment.patient_id,
                    type: 'cancellation',
                    channel: 'in_app',
                    message: 'Your appointment has been cancelled by the clinic. Please rebook.',
                });
            }
        }

        return res.status(200).json({ message: `Appointment updated to '${status}'`, appointment: updated });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// STAFF: Add a new appointment slot

const addSlot = async (req, res) => {
    try {
        const { facility_id, slot_date, slot_time, total_capacity, duration_minutes } = req.body;

        if (!facility_id || !slot_date || !slot_time || !total_capacity || !duration_minutes) {
            return res.status(400).json({
                error: 'facility_id, slot_date, slot_time, total_capacity, and duration_minutes are all required'
            });
        }


        const { data: existing } = await supabase
            .from('appointment_slots')
            .select('id')
            .eq('facility_id', facility_id)
            .eq('slot_date', slot_date)
            .eq('slot_time', slot_time)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'A slot already exists at this date and time for this clinic.' });
        }

        const { data: slot, error } = await supabase
            .from('appointment_slots')
            .insert({
                facility_id,
                slot_date,
                slot_time,
                total_capacity,
                duration_minutes,
                booked_count: 0,
               
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(201).json({ message: 'Slot created successfully', slot });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

//  STAFF: Update a slot 

const updateSlot = async (req, res) => {
    try {
        const { slot_id } = req.params;
        const { slot_time, slot_date, total_capacity, duration_minutes } = req.body;

        if (!slot_id) {
            return res.status(400).json({ error: 'slot_id is required' });
        }

        const updateData = {};
        if (slot_time !== undefined) {
            updateData.slot_time = slot_time;
        }
        if (slot_date !== undefined) {
            updateData.slot_date = slot_date;
        }
        if (total_capacity !== undefined) {
            updateData.total_capacity = total_capacity;
        }
        if (duration_minutes !== undefined) {
            updateData.duration_minutes = duration_minutes;
        }
        

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields provided to update' });
        }

        const { data, error } = await supabase
            .from('appointment_slots')
            .update(updateData)
            .eq('id', slot_id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json({ message: 'Slot updated', slot: data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

//STAFF: Delete a slot

const deactivateSlot = async (req, res) => {
    try {
        const { slot_id } = req.params;


        const { data: slot } = await supabase
            .from('appointment_slots')
            .select('booked_count')
            .eq('id', slot_id)
            .single();

        if (slot?.booked_count > 0) {
            return res.status(409).json({
                error: `Cannot remove this slot : ${slot.booked_count} patient/s have bookings. Cancel appointments first.`
            });
        }

        

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json({ message: 'Slot deactivated successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

//EMAIL: Send booking confirmation

const sendConfirmationEmail = async (req, res) => {
    try {
        const { patient_id, facility_id, slot_id, reason } = req.body;

        if (!patient_id || !slot_id || !facility_id) {
            return res.status(400).json({ error: 'patient_id, facility_id, and slot_id are required' });
        }

        const content = await getEmailContext(patient_id, slot_id, facility_id);

        if (!content.email) {
            return res.status(200).json({ message: 'No email address found for this patient, skipped' });
        }

        const info = await transporter.sendMail({
            from: `"QueueCare" <${process.env.SMTP_USER}>`,
            to: content.email,
            subject: `Appointment Confirmed – ${content.facilityName}`,
            html: emailHtml(content.name, content.facilityName, content.facilityAddress, content.slotDate, content.slotTime, content.duration, reason, 'confirmation'),
        });

        return res.status(200).json({ message: 'Confirmation email sent', messageId: info.messageId });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const remindPatientsOfUpcomingAppointments = async (req, res) => {
    try {
        const { patient_id } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().slice(0, 10);

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id, reason, facility_id, slot_id,
                appointment_slots!inner (slot_date, slot_time, duration_minutes)
            `)
            .eq('patient_id', patient_id)
            .eq('status', 'booked')
            .eq('appointment_slots.slot_date', tomorrowStr);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        if (!appointments || appointments.length === 0) {
            return res.status(200).json({ message: 'No upcoming appointments in the next 24 hours' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, surname')
            .eq('id', patient_id)
            .single();

        const email = profile?.email;
        if (!email) {
            return res.status(200).json({ message: 'No email found for this patient, skipped' });
        }

        const sentIds = [];

       
        for (const appt of appointments) {
            const slot = appt.appointment_slots;
            const { data: facility } = await supabase
                .from('facilities')
                .select('name, address')
                .eq('id', appt.facility_id)
                .single();

            await transporter.sendMail({
                from: `"QueueCare" <${process.env.SMTP_USER}>`,
                to: email,
                subject: `Appointment Reminder – ${facility?.name || 'your clinic'} tomorrow`,
                html: emailHtml(
                    profile.name,
                    facility?.name || 'the clinic',
                    facility?.address || '',
                    slot.slot_date,
                    slot.slot_time?.slice(0, 5),
                    slot.duration_minutes,
                    appt.reason,
                    'reminder'
                ),
            });

            await supabase.from('notifications').insert({
                profile_id: patient_id,
                type: 'appointment_reminder',
                channel: 'in_app',
                message: `Reminder: You have an appointment tomorrow at ${slot.slot_time?.slice(0,5)} at ${facility?.name}.`,
            });

            sentIds.push(appt.id);
        }

        return res.status(200).json({
            message: `Reminders sent for ${sentIds.length} appointment(s)`,
            appointment_ids: sentIds,
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


router.get('/:id',                         getAppointmentById);
router.get('/my/:patient_id',              getMyAppointments);
router.post('/slots/available',                         getAvailableSlots);
router.post('/book',                                    bookAppointment);
router.patch('/:appointment_id/cancel',    cancelAppointment);
router.patch('/:appointment_id/reschedule', rescheduleAppointment);
router.post('/queue/walk-in',                           joinWalkInQueue);


router.post('/send-confirmation',          sendConfirmationEmail);
router.post('/remind',                     remindPatientsOfUpcomingAppointments);


router.get('/staff/appointments',                       getAppointmentsForFacility);
router.patch('/staff/appointments/:appointment_id',     updateAppointmentStatus);
router.post('/staff/slots',                             addSlot);
router.patch('/staff/slots/:slot_id',                   updateSlot);
router.delete('/staff/slots/:slot_id',                  deactivateSlot);

export default router;