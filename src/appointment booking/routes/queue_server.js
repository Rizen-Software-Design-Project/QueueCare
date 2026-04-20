import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY);

async function get_patient_id(contact_details) {
  if (!contact_details) return { error: "Missing contact details" };
  try {
    let data, error;
    if (contact_details.includes('@')) {
      ({ data, error } = await supabase.from('profiles').select('id').eq('email', contact_details));
    } else {
      ({ data, error } = await supabase.from('profiles').select('id').eq('phone_number', contact_details));
    }
    if (error) throw error;
    if (data.length == 0) return { error: "Person does not have an account." };
    return { patient_id: data[0].id };
  } catch (error) {
    return { error: error.message };
  }
}

router.post('/add_to_queue', async (req, res) => {
  const contact_details = req.query.contact_details;
  const facility_id = req.query.facility_id;
  if (!contact_details || !facility_id)
    return res.status(400).json({ error: "Missing required parameters" });

  const result = await get_patient_id(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });
  const patient_id = result.patient_id;

  let appointment_id;
  try {
    let { data, error } = await supabase
      .from('appointments').select('id')
      .eq('patient_id', patient_id).eq('facility_id', facility_id);
    if (error) throw error;
    if (data.length == 0) return res.status(404).json({ error: "Don't have a booking." });
    appointment_id = data[0].id;
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  try {
    let { data, error } = await supabase.from('virtual_queue').insert([{
      status: "Waiting",
      appointment_id: appointment_id,
      patient_id: patient_id,
      facility_id: facility_id
    }]);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/my_queue', async (req, res) => {
  const contact_details = req.query.contact_details;
  const facility_id = req.query.facility_id;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const result = await get_patient_id(contact_details);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  const patient_id = result.patient_id;

  try {
    const { data: all, error: allError } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        reason,
        appointment_slots (slot_date, slot_time, duration_minutes),
        virtual_queue (status)
      `)
      .eq('facility_id', facility_id)
      .not('virtual_queue', 'is', null);

    if (allError) throw allError;

    const myEntry = all.find((e) => e.patient_id === patient_id);

    if (!myEntry) {
      return res.status(404).json({ error: "Not in queue." });
    }

    const waiting = all
      .filter((e) => e.virtual_queue?.status === "Waiting")
      .sort((a, b) => {
        const aTime = `${a.appointment_slots.slot_date}T${a.appointment_slots.slot_time}`;
        const bTime = `${b.appointment_slots.slot_date}T${b.appointment_slots.slot_time}`;
        return new Date(aTime) - new Date(bTime);
      });

    let position = null;

    waiting.forEach((entry, i) => {
      if (entry.patient_id === patient_id) {
        position = i + 1;
      }
    });

    const { slot_date, slot_time, duration_minutes } = myEntry.appointment_slots;

    // add end_time
    const endDate = new Date(`1970-01-01T${slot_time}`);
    endDate.setMinutes(endDate.getMinutes() + duration_minutes);
    myEntry.appointment_slots.end_time = endDate.toTimeString().slice(0, 8);

    // helper to format minutes nicely
    function formatMinutes(totalMinutes) {
      if (totalMinutes < 0) return "0m";

      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const mins = totalMinutes % 60;

      let out = "";
      if (days > 0) out += `${days}d `;
      if (hours > 0) out += `${hours}h `;
      if (mins > 0) out += `${mins}m`;

      return out.trim() || "0m";
    }

    // 1) live countdown from NOW until appointment
    const appointmentDateTime = new Date(`${slot_date}T${slot_time}`);
    const now = new Date();
    const minutesUntilAppointment = Math.round(
      (appointmentDateTime - now) / 1000 / 60
    );

    const time_until_appointment =
      minutesUntilAppointment < 0
        ? "Appointment time has passed."
        : formatMinutes(minutesUntilAppointment);

    // 2) fixed wait from clinic opening time until appointment
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .select('operating_hours')
      .eq('id', facility_id)
      .single();

    if (facilityError) throw facilityError;

    const weekday = new Date(slot_date)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();

    const dayHours = facility?.operating_hours?.[weekday];

    // supports either { open, close } or { start, end }
    const openTime = dayHours?.open || dayHours?.start || null;

    let estimated_wait_from_opening = "Opening time not available.";

    if (openTime) {
      const clinicOpenDateTime = new Date(`${slot_date}T${openTime}`);
      const minutesFromOpening = Math.round(
        (appointmentDateTime - clinicOpenDateTime) / 1000 / 60
      );

      if (minutesFromOpening < 0) {
        estimated_wait_from_opening = "Invalid slot before opening time.";
      } else {
        estimated_wait_from_opening = formatMinutes(minutesFromOpening);
      }
    }

    return res.status(200).json({
      data: [myEntry],
      queue_status: myEntry.virtual_queue?.status,
      position,
      estimated_wait_from_opening,
      time_until_appointment
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/queue_status', async (req, res) => {
  const contact_details = req.query.contact_details;
  const status = req.query.status;
  const facility_id = req.query.facility_id;

  const result = await get_patient_id(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });
  const patient_id = result.patient_id;

  let appointment_id;
  try {
    let { data, error } = await supabase.from('appointments').select('id')
      .eq('patient_id', patient_id).eq('facility_id', facility_id);
    if (error) throw error;
    if (data.length == 0) return res.status(500).json({ error: "Patient not in queue." });
    appointment_id = data[0].id;
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  try {
    let { data, error } = await supabase.from('virtual_queue')
      .update({ status })
      .eq('patient_id', patient_id).eq('appointment_id', appointment_id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/remove_queue', async (req, res) => {
  const contact_details = req.query.contact_details;
  const facility_id = req.query.facility_id;

  const result = await get_patient_id(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });
  const patient_id = result.patient_id;

  try {
    let { data, error } = await supabase.from('virtual_queue')
      .delete()
      .eq('patient_id', patient_id).eq('facility_id', facility_id).eq('status', 'completed').select();
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;