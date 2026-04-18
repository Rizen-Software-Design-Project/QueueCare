
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);


async function get_patient_id(contact_details) {
  try {
    let data, error;
    if (contact_details.includes('@')) {
      ({ data, error } = await supabase.from('profiles').select('id').eq('email', contact_details));
    } else {
      ({ data, error } = await supabase.from('profiles').select('id').eq('phone_number', contact_details));
    }
    if (error) throw error;

    if (data.length == 0) {
      return { error: "Person does not have an account." };
    }

    return { patient_id: data[0].id };

  } catch (error) {
    return { error: error.message };
  }
}


//add to queue
// add to queue
router.post('/add_to_queue', async (req, res) => {
    const contact_details = req.query.contact_details;

    // FIX: was missing await
    const result = await get_patient_id(contact_details);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    const patient_id = result.patient_id;

    let appointment_id;
    try {
        let { data, error } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', patient_id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Don't have a booking." });
        appointment_id = data.id;

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

    try {
        // FIX: removed id (supabase generates it), added if error throw error and success response
        let { data, error } = await supabase.from('virtual_queue').insert([
            {
                status: "waiting",
                appointment_id: appointment_id,
                patient_id: patient_id
            }
        ]);
        if (error) throw error;
        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


// my queue
router.get('/my_queue', async (req, res) => {
    const contact_details = req.query.contact_details;

    const result = await get_patient_id(contact_details);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    const patient_id = result.patient_id;

    try {
        let { data, error } = await supabase
            .from('appointments')
            .select(`
                reason,
                appointment_slots (
                    slot_date,
                    slot_time,
                    duration_minutes
                ),
                virtual_queue (
                    status
                )
            `)
            .eq('patient_id', patient_id)
            .not('virtual_queue', 'is', null)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Not in queue." });

        // calculate end time
        const { slot_time, duration_minutes } = data.appointment_slots;
        const date = new Date(`1970-01-01T${slot_time}`);
        date.setMinutes(date.getMinutes() + duration_minutes);
        data.appointment_slots.end_time = date.toTimeString().slice(0, 8);

        // calculate estimated wait
        const { slot_date } = data.appointment_slots;
        const appointmentTime = new Date(`${slot_date}T${slot_time}`);
        const now = new Date();
        const diffMinutes = Math.round((appointmentTime - now) / 1000 / 60);

        let estimated_wait;
        if (diffMinutes < 0) {
            estimated_wait = "Appointment time has passed.";
        } else {
            const days = Math.floor(diffMinutes / 1440);
            const hours = Math.floor((diffMinutes % 1440) / 60);
            const mins = diffMinutes % 60;
            let wait = "";
            if (days > 0) wait += `${days}d `;
            if (hours > 0) wait += `${hours}h `;
            if (mins > 0) wait += `${mins}m`;
            estimated_wait = wait.trim();
        }

        return res.status(200).json({
            data: data,
            estimated_wait: estimated_wait,
            queue_status: data.virtual_queue?.status
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// update status
router.put('/queue_status', async (req, res) => {
    const contact_details = req.query.contact_details;
    const status = req.query.status;

    const result = await get_patient_id(contact_details);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    const patient_id = result.patient_id;

    try {
        let { data, error } = await supabase
            .from('virtual_queue')
            .update({ status: status })
            .eq('patient_id', patient_id);
        if (error) throw error;
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});



router.delete('/remove_queue', async (req, res) => {
    const contact_details = req.query.contact_details;

    const result = await get_patient_id(contact_details);
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    const patient_id = result.patient_id;

    try {
        let { data, error } = await supabase
            .from('virtual_queue')
            .delete()
            .eq('patient_id', patient_id);
        if (error) throw error;
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});







module.exports = router;