import { useEffect, useRef, useState } from "react";
import { createSchedule, updateDaySchedule, deleteSchedule, getSchedule } from "../queueApi";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "./Schedule.css";


const DAYS = ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"];

const DAY_LABELS = {
  Mon: "Monday",
  Tues: "Tuesday",
  Wed: "Wednesday",  
  Thurs: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};
const STATUS_OPTIONS = ["open", "closed", "on_leave"];
const DEFAULT_DAY = { start_time: "", end_time: "", appointment_status: "" };
const DEFAULT_SCHEDULE = Object.fromEntries(DAYS.map((d) => [d, { ...DEFAULT_DAY }]));

// ── Reusable form row ─────────────────────────────────────────────────────────
function DayFormRow({ day, formSchedule, onChange, showSubmit = false, onSubmit, loading }) {
  const fields = (
    <div className="form-day-section">
      <div className="form-day-title">{DAY_LABELS[day]}</div>
      <div className="form-row">
        <div className="form-field">
          <label>Start time</label>
          <input
            type="time"
            value={formSchedule[day].start_time}
            onChange={(e) => onChange(day, "start_time", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>End time</label>
          <input
            type="time"
            value={formSchedule[day].end_time}
            onChange={(e) => onChange(day, "end_time", e.target.value)}
          />
        </div>
        <div className="form-field">
          <label>Status</label>
          <select
            required={!showSubmit}
            value={formSchedule[day].appointment_status}
            onChange={(e) => onChange(day, "appointment_status", e.target.value)}
          >
            <option value="">— select —</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>
      {showSubmit && (
        <button
          type="submit"
          className={`btn btn-primary update-save-btn ${loading ? "btn-loading" : ""}`}
          disabled={loading}
        >
          Save {DAY_LABELS[day]}
        </button>
      )}
    </div>
  );

  if (showSubmit) {
    return (
      <form className="update-day-form" onSubmit={(e) => { e.preventDefault(); onSubmit(day); }}>
        {fields}
      </form>
    );
  }
  return fields;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function formatStatus(status) {
  if (!status) return "—";
  return status === "on_leave" ? "on-leave" : status;
}

function StatusBadge({ status }) {
  if (!status) return <span className="status-badge empty">—</span>;

  return (
    <span className={`status-badge ${status}`}>
      {formatStatus(status)}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Schedule() {
  const addRef = useRef();
  const clearRef = useRef();
  const updateRef = useRef();
  const navigate = useNavigate();

  const [formSchedule, setFormSchedule] = useState(DEFAULT_SCHEDULE);
  const [savedTimes, setSavedTimes] = useState({});
  const [loading, setLoading] = useState(false);

  const location = useLocation();
const navState = location.state;

const staff_id =
  navState?.staff?.id || localStorage.getItem("staff_id");
const facility_id =
  navState?.facilityId || localStorage.getItem("facility_id");

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleChange = (day, field, value) => {
    setFormSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const resetForm = () => setFormSchedule(DEFAULT_SCHEDULE);

  async function read() {
    const result = await getSchedule(staff_id);
    if (result?.data) setSavedTimes(result.data);
  }

  useEffect(() => {
    read();
  }, []);

  // ── actions ───────────────────────────────────────────────────────────────
  async function add_time(e) {
  e.preventDefault();

  const payload = DAYS
    .filter((day) =>
      formSchedule[day].start_time &&
      formSchedule[day].end_time &&
      formSchedule[day].appointment_status
    )
    .map((day) => ({
    staff_id,
    facility_id,
    day_of_week: day,
    start_time: formSchedule[day].start_time,
    end_time: formSchedule[day].end_time,
    appointment_status: formSchedule[day].appointment_status,
    }));
    if (!facility_id) {
        alert("Missing facility ID. Please go back to the staff dashboard and try again.");
        return;
        }
  if (!staff_id) {
    alert("Missing staff ID. Please go back to the staff dashboard and try again.");
    return;
  }

  if (payload.length === 0) {
    alert("Please fill in at least one complete day.");
    return;
  }



  setLoading(true);
  const result = await createSchedule(payload);
  setLoading(false);

  if (!result?.success) {
    console.error("Create schedule failed:", result);
    alert(result?.error || result?.message || "Failed to save schedule.");
    return;
  }

  resetForm();
  await read();
  addRef.current.close();
}

  async function clear_times() {
    setLoading(true);
    const result = await deleteSchedule(staff_id);
    setLoading(false);
    if (!result?.success) {
      alert("Failed to clear schedule. Please try again.");
      return;
    }
    await read();
    clearRef.current.close();
  }


  const applyToDays = (targetDays, values) => {
  setFormSchedule((prev) => {
    const next = { ...prev };

    targetDays.forEach((day) => {
      next[day] = {
        ...next[day],
        ...values,
      };
    });

    return next;
  });
};
function loadSavedIntoForm() {
  const next = Object.fromEntries(
    DAYS.map((day) => [
      day,
      {
        start_time: savedTimes?.[day]?.start_time || "",
        end_time: savedTimes?.[day]?.end_time || "",
        appointment_status: savedTimes?.[day]?.appointment_status || "",
      },
    ])
  );

  setFormSchedule(next);
}

const markClosed = (day) => {
  setFormSchedule((prev) => ({
    ...prev,
    [day]: {
      start_time: "",
      end_time: "",
      appointment_status: "closed",
    },
  }));
};

const markOnLeave = (day) => {
  setFormSchedule((prev) => ({
    ...prev,
    [day]: {
      start_time: "",
      end_time: "",
      appointment_status: "on_leave",
    },
  }));
};

const copyMondayToWeek = () => {
  const monday = formSchedule.Mon;
  applyToDays(["Tues", "Wed", "Thurs", "Fri"], monday);
};
async function saveWeeklySchedule(e) {
  e.preventDefault();

  const payload = DAYS
    .filter((day) => formSchedule[day].appointment_status)
    .map((day) => ({
      staff_id,
      facility_id,
      day_of_week: day,
      start_time:
        formSchedule[day].appointment_status === "open"
          ? formSchedule[day].start_time
          : null,
      end_time:
        formSchedule[day].appointment_status === "open"
          ? formSchedule[day].end_time
          : null,
      appointment_status: formSchedule[day].appointment_status,
    }));

  if (!staff_id) {
    alert("Missing staff ID.");
    return;
  }

  if (!facility_id) {
    alert("Missing facility ID.");
    return;
  }

  setLoading(true);
  const result = await createSchedule(payload);
  setLoading(false);

  if (!result?.success) {
    alert(result?.error || "Failed to save schedule.");
    return;
  }

  await read();
  resetForm();
  addRef.current?.close();
  updateRef.current?.close();
}

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="avail-page">

      {/* Header */}
      <header className="avail-header">
        <div className="avail-header-left">
          <button className="avail-back-btn" onClick={() => navigate("/dashboard")}>
            ← Back
          </button>
          <h1 className="avail-title">Staff Availability</h1>
        </div>
        <div className="avail-header-actions">
          <button className="btn btn-secondary" onClick={() => { resetForm(); addRef.current.showModal(); }}>
            + Add Schedule
          </button>
          <button className="btn btn-ghost" onClick={() => { loadSavedIntoForm();
            updateRef.current.showModal(); }}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => clearRef.current.showModal()}>
            Clear All
          </button>
        </div>
      </header>

      {/* Schedule cards */}
      <div className="avail-grid">
        {DAYS.map((day) => (
          <div className="day-card" key={day}>
            <span className="day-card-label">{DAY_LABELS[day]}</span>
            <div className="day-card-times">
              <div className="day-card-time-block">
                <span className="time-label">Start</span>
                <span className={`time-value ${!savedTimes?.[day]?.start_time ? "empty" : ""}`}>
                  {savedTimes?.[day]?.start_time ?? "Not set"}
                </span>
              </div>
              <div className="day-card-time-block">
                <span className="time-label">End</span>
                <span className={`time-value ${!savedTimes?.[day]?.end_time ? "empty" : ""}`}>
                  {savedTimes?.[day]?.end_time ?? "Not set"}
                </span>
              </div>
            </div>
            <StatusBadge status={savedTimes?.[day]?.appointment_status} />
          </div>
        ))}
      </div>

      {/* ── Add dialog ── */}
      <dialog ref={addRef}>
        <div className="dialog-header">
          <span className="dialog-title">Add Schedule</span>
          <button className="dialog-close" onClick={() => addRef.current.close()}>✕</button>
        </div>
        <form onSubmit={add_time}>
  <div className="dialog-body">

    <section className="quick-fill-card">
      <h3>Quick fill</h3>
      <p>Set common working hours, then adjust individual days if needed.</p>

      <div className="quick-fill-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            applyToDays(["Mon", "Tues", "Wed", "Thurs", "Fri"], {
              start_time: "09:00",
              end_time: "17:00",
              appointment_status: "open",
            })
          }
        >
          Weekdays 09:00–17:00
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            applyToDays(DAYS, {
              start_time: "08:00",
              end_time: "16:00",
              appointment_status: "open",
            })
          }
        >
          All days 08:00–16:00
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={copyMondayToWeek}
        >
          Copy Monday to weekdays
        </button>
      </div>
    </section>

    <div className="weekly-editor">
      {DAYS.map((day) => (
        <section className="weekly-row" key={day}>
          <div className="weekly-day">
            <strong>{DAY_LABELS[day]}</strong>
            <StatusBadge status={formSchedule[day].appointment_status} />
          </div>

          <div className="weekly-inputs">
            <input
              type="time"
              value={formSchedule[day].start_time}
              disabled={formSchedule[day].appointment_status !== "open"}
              onChange={(e) => handleChange(day, "start_time", e.target.value)}
            />

            <input
              type="time"
              value={formSchedule[day].end_time}
              disabled={formSchedule[day].appointment_status !== "open"}
              onChange={(e) => handleChange(day, "end_time", e.target.value)}
            />

            <select
              value={formSchedule[day].appointment_status}
              onChange={(e) => {
                const status = e.target.value;

                if (status === "closed" || status === "on_leave") {
                  setFormSchedule((prev) => ({
                    ...prev,
                    [day]: {
                      start_time: "",
                      end_time: "",
                      appointment_status: status,
                    },
                  }));
                } else {
                  handleChange(day, "appointment_status", status);
                }
              }}
            >
              <option value="">— select —</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="on_leave">On leave</option>
            </select>
          </div>

          <div className="weekly-actions">
            <button type="button" className="mini-btn" onClick={() => markClosed(day)}>
              Closed
            </button>
            <button type="button" className="mini-btn" onClick={() => markOnLeave(day)}>
              On leave
            </button>
          </div>
        </section>
      ))}
    </div>
  </div>

  <div className="dialog-footer">
    <button type="button" className="btn btn-ghost" onClick={() => addRef.current.close()}>
      Cancel
    </button>

    <button type="submit" className={`btn btn-primary ${loading ? "btn-loading" : ""}`} disabled={loading}>
      Save Weekly Schedule
    </button>
  </div>
</form>
      </dialog>

      {/* ── Clear dialog ── */}
      <dialog ref={clearRef}>
        <div className="dialog-header">
          <span className="dialog-title">Clear Schedule</span>
          <button className="dialog-close" onClick={() => clearRef.current.close()}>✕</button>
        </div>
        <div className="clear-body">
          <div className="clear-icon">🗑️</div>
          <p className="clear-message">
            Are you sure you want to <strong>remove all schedule entries</strong>?<br />
            This cannot be undone.
          </p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="btn btn-ghost" onClick={() => clearRef.current.close()}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-danger ${loading ? "btn-loading" : ""}`}
            onClick={clear_times}
            disabled={loading}
          >
            Yes, Clear All
          </button>
        </div>
      </dialog>

      {/* ── Update dialog ── */}
      <dialog ref={updateRef}>
  <div className="dialog-header">
    <span className="dialog-title">Edit Schedule</span>
    <button className="dialog-close" onClick={() => updateRef.current.close()}>✕</button>
  </div>

  <form onSubmit={saveWeeklySchedule}>
    <div className="dialog-body">
      <section className="quick-fill-card">
        <h3>Quick fill</h3>
        <p>Update common working hours, then adjust individual days if needed.</p>

        <div className="quick-fill-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              applyToDays(["Mon", "Tues", "Wed", "Thurs", "Fri"], {
                start_time: "09:00",
                end_time: "17:00",
                appointment_status: "open",
              })
            }
          >
            Weekdays 09:00–17:00
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              applyToDays(DAYS, {
                start_time: "08:00",
                end_time: "16:00",
                appointment_status: "open",
              })
            }
          >
            All days 08:00–16:00
          </button>

          <button type="button" className="btn btn-ghost" onClick={copyMondayToWeek}>
            Copy Monday to weekdays
          </button>
        </div>
      </section>

      <div className="weekly-editor">
        {DAYS.map((day) => (
          <section className="weekly-row" key={day}>
            <div className="weekly-day">
              <strong>{DAY_LABELS[day]}</strong>
              <StatusBadge status={formSchedule[day].appointment_status} />
            </div>

            <div className="weekly-inputs">
              <input
                type="time"
                value={formSchedule[day].start_time}
                disabled={formSchedule[day].appointment_status !== "open"}
                onChange={(e) => handleChange(day, "start_time", e.target.value)}
              />

              <input
                type="time"
                value={formSchedule[day].end_time}
                disabled={formSchedule[day].appointment_status !== "open"}
                onChange={(e) => handleChange(day, "end_time", e.target.value)}
              />

              <select
                value={formSchedule[day].appointment_status}
                onChange={(e) => {
                  const status = e.target.value;

                  if (status === "closed" || status === "on_leave") {
                    setFormSchedule((prev) => ({
                      ...prev,
                      [day]: {
                        start_time: "",
                        end_time: "",
                        appointment_status: status,
                      },
                    }));
                  } else {
                    handleChange(day, "appointment_status", status);
                  }
                }}
              >
                <option value="">— select —</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="on_leave">on-leave</option>
              </select>
            </div>

            <div className="weekly-actions">
              <button type="button" className="mini-btn" onClick={() => markClosed(day)}>
                Closed
              </button>
              <button type="button" className="mini-btn" onClick={() => markOnLeave(day)}>
                on-leave
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>

    <div className="dialog-footer">
      <button type="button" className="btn btn-ghost" onClick={() => updateRef.current.close()}>
        Cancel
      </button>

      <button type="submit" className={`btn btn-primary ${loading ? "btn-loading" : ""}`} disabled={loading}>
        Save Changes
      </button>
    </div>
  </form>
</dialog>

    </div>
  );
}
