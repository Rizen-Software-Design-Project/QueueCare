import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY);

async function get_patient_id(contact_details) {
  if (!contact_details) return { error: "Missing contact details" };
  try {
    let data, error;
    if (contact_details.includes("@")) {
      ({ data, error } = await supabase.from("profiles").select("id").eq("email", contact_details));
    } else {
      ({ data, error } = await supabase.from("profiles").select("id").eq("phone_number", contact_details));
    }
    if (error) throw error;
    if (data.length === 0) return { error: "Person does not have an account." };
    return { patient_id: data[0].id };
  } catch (error) {
    return { error: error.message };
  }
}

router.get("/is_booked", async (req, res) => {
  const contact_details = req.query.contact_details;
  try {
    let data, error;
    if (contact_details.includes("@")) {
      ({ data, error } = await supabase.from("profiles").select("id").eq("email", contact_details));
    } else {
      ({ data, error } = await supabase.from("profiles").select("id").eq("phone_number", contact_details));
    }
    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: "Person does not have an account." });
    }

    const patient_id = data[0].id;
    let data2, error2;
    ({ data: data2, error: error2 } = await supabase.from("appointments").select("id").eq("patient_id", patient_id));
    if (error2) throw error2;

    return res.status(200).json({ is_booked: data2.length > 0 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/view_queue", async (req, res) => {
  const facility_id = req.query.facility_id;
  if (!facility_id) {
    return res.status(400).json({ error: "facility_id is required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        patient_id,
        reason,
        appointment_slots!inner (
          slot_date,
          slot_time,
          duration_minutes,
          facility_id
        ),
        profiles (name, surname, sex, email, phone_number, dob),
        virtual_queue (status)
      `)
      .eq("appointment_slots.slot_date", today)
      .eq("appointment_slots.facility_id", facility_id)
      .not("virtual_queue", "is", null);

    if (error) throw error;

    const sorted = (data || []).sort((a, b) => {
      const aTime = `${a.appointment_slots.slot_date}T${a.appointment_slots.slot_time}`;
      const bTime = `${b.appointment_slots.slot_date}T${b.appointment_slots.slot_time}`;
      return new Date(aTime) - new Date(bTime);
    });

    let waitingPosition = 0;

    for (const entry of sorted) {
      const status = entry.virtual_queue?.status || "";

      if (entry.appointment_slots) {
        const { slot_time, duration_minutes } = entry.appointment_slots;
        const endDate = new Date(`1970-01-01T${slot_time}`);
        endDate.setMinutes(endDate.getMinutes() + duration_minutes);
        entry.appointment_slots.end_time = endDate.toTimeString().slice(0, 8);
      }

      if (status === "Waiting") {
        waitingPosition += 1;
        entry.position = waitingPosition;
      } else {
        entry.position = null;
      }
    }

    return res.status(200).json({ data: sorted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/estimated_time", async (req, res) => {
  const contact_details = req.query.contact_details;
  const facility_id = req.query.facility_id;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const result = await get_patient_id(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });

  const patient_id = result.patient_id;

  try {
    let { data, error } = await supabase
      .from("appointments")
      .select(`appointment_slots (slot_date, slot_time)`)
      .eq("patient_id", patient_id)
      .eq("facility_id", facility_id);

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: "No appointment found." });
    }

    const { slot_date, slot_time } = data[0].appointment_slots;
    const appointmentTime = new Date(`${slot_date}T${slot_time}`);
    const now = new Date();
    const diffMinutes = Math.round((appointmentTime - now) / 1000 / 60);

    if (diffMinutes < 0) {
      return res.status(200).json({ estimated_wait: "Appointment time has passed." });
    }

    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const mins = diffMinutes % 60;

    let estimated_wait = "";
    if (days > 0) estimated_wait += `${days}d `;
    if (hours > 0) estimated_wait += `${hours}h `;
    if (mins > 0) estimated_wait += `${mins}m`;

    return res.status(200).json({ estimated_wait: estimated_wait.trim(), minutes: diffMinutes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/queue_position", async (req, res) => {
  const contact_details = req.query.contact_details;
  const facility_id = req.query.facility_id;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const result = await get_patient_id(contact_details);
  if (result.error) return res.status(400).json({ error: result.error });

  const patient_id = result.patient_id;

  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        patient_id,
        appointment_slots (slot_date, slot_time, duration_minutes),
        virtual_queue (status)
      `)
      .eq("facility_id", facility_id);

    if (error) throw error;

    const filtered = (data || [])
      .filter((e) => e.virtual_queue?.status === "Waiting")
      .sort((a, b) => {
        const aTime = `${a.appointment_slots.slot_date}T${a.appointment_slots.slot_time}`;
        const bTime = `${b.appointment_slots.slot_date}T${b.appointment_slots.slot_time}`;
        return new Date(aTime) - new Date(bTime);
      });

    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].patient_id === patient_id) {
        return res.status(200).json({ position: i + 1 });
      }
    }

    return res.status(404).json({ error: "Patient not found in queue." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;