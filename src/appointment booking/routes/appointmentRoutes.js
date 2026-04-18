import express from 'express';
import env from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
env.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    .then(() => console.log('SMTP connection verified – emails will work'))
    .catch((err) => console.error('SMTP connection FAILED:', err.message));


const getAppointmentById = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getAvailableSlots = async (req, res) => {
    try {
        const body = req.body;
        const facility_id = body.facility_id;

        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id is required' });
        }

        const { data: slots, error: errorSlot } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('facility_id', facility_id);

        if (errorSlot) {
            return res.status(400).json({ error: errorSlot.message });
        }

        if (!slots || slots.length === 0) {
            return res.status(404).json({ error: 'No available slots for this clinic.' });
        }

        return res.status(200).json(slots);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const bookAppointment = async (req, res) => {
    try {
        const { patient_id, facility_id, slot_id, reason } = req.body;

        if (!patient_id) {
            return res.status(400).json({ error: 'patient_id is required' });
        }

        if (!facility_id || !slot_id) {
            return res.status(400).json({ error: 'facility_id and slot_id are required' });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'reason is required' });
        }

        const facilityUuid = '00000000-0000-0000-0000-' + String(facility_id).padStart(12, '0');

        const { data: appointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                patient_id,
                facility_id: facilityUuid,
                slot_id,
                status: 'booked',
                appointment_type: 'scheduled',
                reason: reason.trim()
            })
            .select()
            .single();

        if (insertError) {
            return res.status(400).json({ error: insertError.message });
        }

        return res.status(200).json({
            message: 'Appointment booked successfully',
            appointment
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};


const addSlot = async (req, res) => {
    try {
        const {slot_time, slot_date, total_capacity, duration_minutes, facility_id} = req.body;

        if (!slot_time || !slot_date || !total_capacity || !duration_minutes || !facility_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: slot, error: insertError } = await supabase
            .from('appointment_slots')
            .insert({
                slot_time,
                slot_date,
                total_capacity,
                duration_minutes,
                facility_id
            })
            .select()
            .single();

        if (insertError) {
            return res.status(400).json({ error: insertError.message });
        }

        return res.status(200).json({
            message: 'Slot created successfully',
            slot
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const sendConfirmationEmail = async (req, res) => {
    try {
        const { patient_id, facility_id, slot_id, reason } = req.body;
        if (!patient_id || !slot_id) {
            return res.status(400).json({ error: 'patient_id and slot_id required' });
        }

        const [profileRes, slotRes, facilityRes] = await Promise.all([
            supabase.from('profiles').select('email, name, surname').eq('id', patient_id).single(),
            supabase.from('appointment_slots').select('slot_date, slot_time, duration_minutes').eq('id', slot_id).single(),
            supabase.from('facilities').select('name').eq('id', facility_id).single(),
        ]);

        let patientEmail = profileRes.data?.email;
        if (!patientEmail) {
            const { data: authUser } = await supabase.auth.admin.getUserById(patient_id);
            patientEmail = authUser?.user?.email;
        }

        if (!patientEmail) {
            return res.status(200).json({ message: 'No email found, skipped' });
        }

        const patientName = profileRes.data?.name || 'Patient';
        const slotDate = slotRes.data?.slot_date || 'TBD';
        const slotTime = slotRes.data?.slot_time ? slotRes.data.slot_time.slice(0, 5) : 'TBD';
        const duration = slotRes.data?.duration_minutes || '';
        const facilityName = facilityRes.data?.name || 'the clinic';

        const info = await transporter.sendMail({
            from: `"QueueCare" <${process.env.SMTP_USER}>`,
            to: patientEmail,
            subject: `Appointment Confirmed – ${facilityName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #1976d2;">Appointment Confirmed ✅</h2>
                    <p>Hi ${patientName},</p>
                    <p>Your appointment has been booked successfully.</p>
                    <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                        <tr><td style="padding: 8px; font-weight: bold;">Clinic</td><td style="padding: 8px;">${facilityName}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Date</td><td style="padding: 8px;">${slotDate}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Time</td><td style="padding: 8px;">${slotTime}</td></tr>
                        ${duration ? `<tr><td style="padding: 8px; font-weight: bold;">Duration</td><td style="padding: 8px;">${duration} minutes</td></tr>` : ''}
                        <tr><td style="padding: 8px; font-weight: bold;">Reason</td><td style="padding: 8px;">${(reason || '').trim()}</td></tr>
                    </table>
                    <p>Please arrive a few minutes early.</p>
                    <p style="color: #888; font-size: 12px;">— QueueCare Team</p>
                </div>
            `,
        });

        return res.status(200).json({ message: 'Email sent', messageId: info.messageId });
    } catch (error) {
        console.error('Send confirmation error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};


async function remindPatientsOfUpcomingAppointments(req, res) {
    try {
        const {patient_id} = req.body;
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', patient_id)
            .eq('status', 'booked')
            .gte('booked_at', now.toISOString())
            .lte('booked_at', in24Hours.toISOString());

            
        if (error){
            console.error('Reminder error:', error.message);
            return res.status(500).json({ error: error.message });
        }

        const {data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, name, surname')
            .eq('id', patient_id)
            .single();


        for (const appt of appointments) {

            const { data: slot, error: slotError } = await supabase                .from('appointment_slots')
                .select('slot_date, slot_time, duration_minutes')
                .eq('id', appt.slot_id)
                .single();

            const { data: facility, error: facilityError } = await supabase
                .from('facilities')
                .select('name')
                .eq('id', appt.facility_id)
                .single();

            if (slotError || facilityError) {
                console.error('Reminder error:', slotError?.message || facilityError?.message);
                return res.status(500).json({ error: slotError?.message || facilityError?.message });
            }

            //get patient number in the queue for that slot

            const patientEmail = profile?.email;
            if (!patientEmail) {
                console.warn(`No email found for patient ${patient_id}, skipping reminder`);
                return res.status(400).json({ message: 'No email found' });
            }

            const patientName = profile?.name || 'Patient';
            const slotDate = slot?.slot_date || 'TBD';
            const slotTime = slot?.slot_time ? slot.slot_time.slice(0, 5) : 'TBD';
            const facilityName = facility?.name || 'the clinic';

            await transporter.sendMail({
                from: `"QueueCare" <${process.env.SMTP_USER}>`,
                to: patientEmail,
                subject: 'Appointment Reminder',
                text: `Hello ${patientName},\n\nThis is a reminder for your upcoming appointment at ${facilityName} on ${slotDate} at ${slotTime}.\n\nThank you,\nQueueCare`
            });

            return res.status(200).json({ message: 'Reminder sent' });

        }
        
    }
    catch (error) {        
        console.error('Reminder error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

//Apointments management by staff

async function getAppointmentsForFacility(req, res) {

    try{
        const { facility_id } = req.query;

        if (!facility_id) {
            return res.status(400).json({ error: 'facility_id not found check existence' });
        }

        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('facility_id', facility_id);

        if(error){
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json(appointments);
    } catch (error) {
        console.error('Get appointments error:', error.message);
        return res.status(500).json({ error: error.message });
    }

}

async function deleteAppointment(req, res) {
    try{
        const { appointment_id } = req.query;

        if (!appointment_id) {
            return res.status(400).json({ error: 'appointment_id is required' });
        }

        const { data, error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', appointment_id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        return res.status(200).json({ message: 'Appointment deleted', data });

    } catch (error) {
        console.error('Delete appointment error:', error.message);
        return res.status(400).json({ error: error.message });
    }
}

async function updateAppointment(req, res) {
    try {
        const { appointment_id } = req.query;
        const { status } = req.body;

        if (!appointment_id || !status) {
            return res.status(400).json({ error: 'appointment_id and status are required' });
        }

        const {data: appointment, error} = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', appointment_id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        if(status === 'cancelled') {
            const { data: slot, error: slotError } = await supabase.from('appointment_slots')
                .select('total_capacity')
                .eq('id', appointment.slot_id)
                .single();
            if (slotError) {
                return res.status(400).json({ error: slotError.message });
            }
            const newCapacity = slot.total_capacity + 1;
            const { error: updateSlotError } = await supabase.from('appointment_slots')
                .update({ total_capacity: newCapacity })
                .eq('id', appointment.slot_id);
            if (updateSlotError) {
                return res.status(400).json({ error: updateSlotError.message });
            }

        }

        return res.status(200).json({ message: 'Appointment updated', appointment: appointment });
    } catch (error) {
        console.error('Update appointment error:', error.message);
        return res.status(500).json({ error: error.message });

    }
}

async function deleteSlot(req, res) {
    try {
        const { slot_id } = req.query;
        if (!slot_id) {
            return res.status(400).json({ error: 'slot_id is required' });
        }
        const { data, error } = await supabase
            .from('appointment_slots')
            .delete()
            .eq('id', slot_id);
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(200).json({ message: 'Slot deleted', data });
    } catch (error) {
        console.error('Delete slot error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

async function updateSlot(req, res) {
    try {
        const { slot_id } = req.query;
        const { slot_time, slot_date, total_capacity, duration_minutes } = req.body;
        if (!slot_id) {
            return res.status(400).json({ error: 'slot_id is required' });
        }   
        const updateData = {};
        if (slot_time) updateData.slot_time = slot_time;
        if (slot_date) updateData.slot_date = slot_date;
        if (total_capacity) updateData.total_capacity = total_capacity;
        if (duration_minutes) updateData.duration_minutes = duration_minutes;

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
    } catch (error) {
        console.error('Update slot error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}


router.get('/appointments/:id', getAppointmentById);

router.post('/appointments/available-slots', getAvailableSlots);
router.post('/clinics/openslots', getAvailableSlots);
router.post('/slots/available', getAvailableSlots);
router.post('/appointment-slots/available', getAvailableSlots);
router.post('/clinic-availability', getAvailableSlots);
router.post('/appointments/book', bookAppointment);
router.post('/appointments/send-confirmation', sendConfirmationEmail);
router.post('/appointments/remind', remindPatientsOfUpcomingAppointments);

//all stuff below is for staff management of appointments and slots, not for patients

router.get('/staff/appointments-booked/facility', getAppointmentsForFacility);
router.post('/staff/slots', addSlot);
router.delete('/staff/appointments-booked/facility/remove', deleteAppointment);
router.put('/staff/appointments-booked/facility/update', updateAppointment);
router.delete('/staff/appointment-slots/remove', deleteSlot);
router.put('/staff/appointment-slots/update', updateSlot);

export default router;