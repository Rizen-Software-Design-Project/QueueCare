import express from "express";
import { supabase } from "../../lib/supabaseAdmin.js";

const router = express.Router();

const DAYS = ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"];

// database functions where we interact with the schedule table in supabase, we have functions to read, upsert, update and delete schedule data for staff members. The schedule data is structured in a way that each staff member has a row for each day of the week with their working hours and whether they are off that day or not. The API endpoints then call these functions to perform the necessary operations based on the incoming requests from the frontend.

async function read(staff_id) {
  if (!staff_id) return { success: false, error: "staff_id is required." };
  try {
    const { data, error } = await supabase
      .from("schedule")
      .select("*")
      .eq("staff_id", staff_id);
    if (error) throw error;
    const object = {};
    for (const row of data) {   
      object[row.day_of_week] = row;
    }
    return { success: true, data: object };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function upsert(staff_id, rows) {
  if (!staff_id || !Array.isArray(rows) || rows.length === 0) {
    return { success: false, error: "staff_id and rows array are required." };
  }

  const valid = rows.every(r => r.day_of_week && DAYS.includes(r.day_of_week));
  if (!valid) {
    return { success: false, error: `Each row must have a valid day_of_week: ${DAYS.join(", ")}` };
  }

  const payload = rows.map(r => ({ ...r, staff_id }));

  try {
    const { data, error } = await supabase
      .from("schedule")
      .upsert(payload, { onConflict: "staff_id,day_of_week" })
      .select();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function updateDay(staff_id, day_of_week, updates) {
  if (!staff_id || !day_of_week || !updates) {
    return { success: false, error: "staff_id, day_of_week, and update body are required." };
  }
  try {
    const { data, error } = await supabase
      .from("schedule")
      .update(updates)
      .eq("staff_id", staff_id)
      .eq("day_of_week", day_of_week)
      .select();
    if (error) throw error;
    if (data.length === 0) return { success: false, error: "No matching schedule row found." };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function eliminate(staff_id) {
  if (!staff_id) return { success: false, error: "staff_id is required." };
  try {
    const { error } = await supabase
      .from("schedule")
      .delete()
      .eq("staff_id", staff_id);
    if (error) throw error;
    return { success: true };   // no error = success, even if nothing was deleted
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// API endpoints

// GET /schedule?staff_id=xxx
router.get("/schedule", async (req, res) => {
  const result = await read(req.query.staff_id);
  return res.status(result.success ? 200 : 400).json(result);
});

// GET /get_staff?staff_id=xxx — check if schedule exists
router.get("/get_staff", async (req, res) => {
  const result = await read(req.query.staff_id);
  if (!result.success) return res.status(500).json(result);
  return res.json({ success: true, hasSchedule: Object.keys(result.data).length > 0 });
});

// POST /schedule — upsert full or partial week
// body: { staff_id, rows: [{ day_of_week, start_time, end_time, is_off }, ...] }
router.post("/schedule", async (req, res) => {
  const { staff_id, rows } = req.body;
  const result = await upsert(staff_id, rows);
  return res.status(result.success ? 200 : 400).json(result);
});

// PUT /schedule — update a single day
// body: { staff_id, day_of_week, body: { start_time, end_time, is_off } }
router.put("/schedule", async (req, res) => {
  const { staff_id, day_of_week, body } = req.body;
  const result = await updateDay(staff_id, day_of_week, body);
  return res.status(result.success ? 200 : 400).json(result);
});

// DELETE /schedule?staff_id=xxx
router.delete("/schedule", async (req, res) => {
  const result = await eliminate(req.query.staff_id);
  return res.status(result.success ? 200 : 400).json(result);
});

export default router;
