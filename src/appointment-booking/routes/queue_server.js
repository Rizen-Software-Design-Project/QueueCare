import express from "express";
import { supabase } from "../../lib/supabaseAdmin.js";
 

const router = express.Router();


// ─────────────────────────────────────────────
// GET MY QUEUE
// ─────────────────────────────────────────────

router.get("/my_queue", async (req, res) => {
  const { contact_details, facility_id } = req.query;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${contact_details},phone_number.eq.${contact_details}`)
    .maybeSingle();

  if (!profile) return res.status(400).json({ error: "User not found" });

  const patient_id = profile.id;

  // FIX: appointments is an array from Supabase join — select with limit,
  // and don't use maybeSingle() on virtual_queues in case there are multiple
  // (e.g. patient has been in queue before). Order by joined_at to get latest.
  const { data: queueEntries, error: queueErr } = await supabase
    .from("virtual_queues")
    .select("*, appointments(id, reason, appointment_slots(slot_date, slot_time))")
    .eq("facility_id", facility_id)
    .eq("patient_id", patient_id)
    .order("joined_at", { ascending: false });

  if (queueErr) return res.status(500).json({ error: queueErr.message });

  // No queue entry at all
  if (!queueEntries || queueEntries.length === 0) {
    return res.status(404).json({ error: "Not in queue." });
  }

  // Use the most recent active entry; fall back to most recent overall
  const data =
    queueEntries.find((e) => e.status === "waiting" || e.status === "called") ||
    queueEntries[0];

  // Appointment is done
  if (data.status === "completed" || data.status === "complete") {
    return res.json({
      status: "completed",
      message: "Your appointment is complete. Thank you!",
    });
  }

  // In consultation
  if (data.status === "called") {
    return res.json({
      status: "called",
      message: "You are currently being seen.",
      data,
      position: null,
      patients_before_you: 0,
      eta_minutes: 0,
      time_until_appointment: "Now",
      estimated_service_at: new Date().toISOString(),
    });
  }

  // Fetch full waiting queue sorted by slot time for position calculation
  const { data: waitingQueue, error: queueError } = await supabase
    .from("virtual_queues")
    .select("id, patient_id, appointments(appointment_slots(slot_time))")
    .eq("facility_id", facility_id)
    .eq("status", "waiting");

  if (queueError) return res.status(500).json({ error: queueError.message });

  // FIX: handle appointments as array from Supabase join
  const sorted = (waitingQueue || []).sort((a, b) => {
    const aAppt = Array.isArray(a.appointments) ? a.appointments[0] : a.appointments;
    const bAppt = Array.isArray(b.appointments) ? b.appointments[0] : b.appointments;
    const aTime = aAppt?.appointment_slots?.slot_time || "";
    const bTime = bAppt?.appointment_slots?.slot_time || "";
    return aTime.localeCompare(bTime);
  });

  const myIndex = sorted.findIndex((q) => q.patient_id === patient_id);

  if (myIndex === -1) return res.status(404).json({ error: "Not in queue." });

  const AVG_SERVICE_MINUTES = 20;
  const patientsBeforeYou = myIndex;
  const etaMinutes = patientsBeforeYou * AVG_SERVICE_MINUTES;
  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  const timeUntilAppointment =
    hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
  const estimatedServiceTime = new Date(Date.now() + etaMinutes * 60000);

  return res.json({
    data,
    position: myIndex + 1,
    status: data.status,
    patients_before_you: patientsBeforeYou,
    eta_minutes: etaMinutes,
    time_until_appointment: timeUntilAppointment,
    estimated_service_at: estimatedServiceTime.toISOString(),
  });
});

// ─────────────────────────────────────────────
// ADD TO QUEUE
// ─────────────────────────────────────────────

router.post("/add_to_queue", async (req, res) => {
  const { contact_details, facility_id } = req.body;

  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  // 1. Resolve profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${contact_details},phone_number.eq.${contact_details}`)
    .maybeSingle();

  if (!profile) {
    return res.status(400).json({ error: "User not found" });
  }

  const patient_id = profile.id;

  // 2. FIX: Use .limit(1) + array result instead of .maybeSingle()
  // maybeSingle() throws a 500 if patient has multiple booked appointments
  const { data: appts, error: apptErr } = await supabase
    .from("appointments")
    .select("id, appointment_slots!inner(facility_id, slot_date, slot_time)")
    .eq("patient_id", patient_id)
    .eq("appointment_slots.facility_id", facility_id)
    .in("status", ["booked", "confirmed"]) // FIX: also accept "confirmed"
    .order("booked_at", { ascending: false })
    .limit(1);

  if (apptErr) return res.status(500).json({ error: apptErr.message });

  const appt = appts?.[0];

  if (!appt) {
    return res.status(400).json({ error: "No active appointment found" });
  }

  // 3. Check if already in queue for this specific appointment
  const { data: existing } = await supabase
    .from("virtual_queues")
    .select("id, status")
    .eq("appointment_id", appt.id)
    .maybeSingle();

  // If already in queue and not completed, don't add again
  if (existing && existing.status !== "completed" && existing.status !== "complete") {
    return res.json({ success: true, message: "Already in queue" });
  }

  // 4. Insert new queue entry
  const { error: insertErr } = await supabase.from("virtual_queues").insert({
    appointment_id: appt.id,
    patient_id,
    facility_id,
    status: "waiting",
    joined_at: new Date().toISOString(),
  });

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  return res.json({ success: true });
});

// ─────────────────────────────────────────────
// REMOVE FROM QUEUE
// ─────────────────────────────────────────────

router.delete("/remove_queue", async (req, res) => {
  const { contact_details, facility_id } = req.query;
 
  if (!contact_details || !facility_id) {
    return res.status(400).json({ error: "Missing parameters" });
  }
 
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${contact_details},phone_number.eq.${contact_details}`)
    .maybeSingle();
 
  if (!profile) {
    return res.status(400).json({ error: "User not found" });
  }
 
  await supabase
    .from("virtual_queues")
    .delete()
    .eq("patient_id", profile.id)
    .eq("facility_id", facility_id);
 
  return res.json({ success: true });
});

// ─────────────────────────────────────────────
// UPDATE QUEUE STATUS
// ─────────────────────────────────────────────

router.patch("/update_status", async (req, res) => {
  const { contact_details, facility_id, status } = req.body;

  if (!contact_details || !facility_id || !status) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.eq.${contact_details},phone_number.eq.${contact_details}`)
    .maybeSingle();

  if (!profile) return res.status(400).json({ error: "User not found" });

  const { error } = await supabase
    .from("virtual_queues")
    .update({ status })
    .eq("patient_id", profile.id)
    .eq("facility_id", facility_id);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
});

// ─────────────────────────────────────────────
// VIEW FULL QUEUE (for staff dashboard)
// ─────────────────────────────────────────────

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