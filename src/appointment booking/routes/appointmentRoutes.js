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

const getAppointments = async (req, res) => {
    try {
        const { data, error } = await supabase.from('appointments').select('*');

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

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

const getAvailableClinics = async (req, res) => {
    try {
        const body = req.body;
        const name = body.name;
        const province = body.province;

        if (!name || !province) {
            return res.status(400).json({ error: 'name and province are required' });
        }

        const { data: facilities, error: errorFacility } = await supabase
            .from('facilities')
            .select('*')
            .eq('name', name)
            .eq('province', province);

        if (errorFacility) {
            return res.status(400).json({ error: errorFacility.message });
        }

        return res.status(200).json({ facilities });
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
            return res.status(401).json({ error: 'patient_id is required' });
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

        const patientName = profileRes.data?.name || 'Patient';
        const slotDate = slotRes.data?.slot_date || 'TBD';
        const slotTime = slotRes.data?.slot_time ? slotRes.data.slot_time.slice(0, 5) : 'TBD';
        const duration = slotRes.data?.duration_minutes || '';
        const facilityName = facilityRes.data?.name || 'the clinic';

        if (patientEmail) {
            try {
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
                                <tr><td style="padding: 8px; font-weight: bold;">Reason</td><td style="padding: 8px;">${reason.trim()}</td></tr>
                            </table>
                            <p>Please arrive a few minutes early. You can view or cancel your appointment from your dashboard.</p>
                            <p style="color: #888; font-size: 12px;">— QueueCare Team</p>
                        </div>
                    `,
                });
                console.log('Confirmation email sent to', patientEmail, '– messageId:', info.messageId);
            } catch (emailErr) {
                console.error('Failed to send confirmation email:', emailErr.message);
            }
        } else {
            console.warn('No email found for patient_id:', patient_id);
        }

        return res.status(200).json({
            message: 'Appointment booked successfully',
            appointment
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const signUp = async (req, res) => {
    try {
        const { email, password, full_name, phone_number, id_number, role = 'patient' } = req.body;

        const { error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                email,
                password,
                full_name,
                phone_number,
                id_number,
                role
            });

        if (profileError) {
            return res.status(400).json({ error: profileError.message });
        }

        const { data: profile, error: profileReadError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (profileReadError) {
            return res.status(400).json({ error: profileReadError.message });
        }

        return res.status(200).json({
            message: 'User created successfully',
            user: profile
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const makeSlot = async (req, res) => {
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

router.get('/appointments', getAppointments);
router.get('/appointments/:id', getAppointmentById);
router.post('/clinics/available', getAvailableClinics);
router.post('/clinics/openslots', getAvailableSlots);
router.post('/slots/available', getAvailableSlots);
router.post('/appointment-slots/available', getAvailableSlots);
router.post('/clinic-availability', getAvailableSlots);
router.post('/appointments/book', bookAppointment);
router.post('/appointments/send-confirmation', async (req, res) => {
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
});
router.post('/staff/slots', makeSlot);
router.post('/signup', signUp);

export default router;
