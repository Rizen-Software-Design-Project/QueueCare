import { useEffect, useRef, useState } from "react";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
} from "../queueApi";
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

const DEFAULT_DAY = {
  start_time: "",
  end_time: "",
  appointment_status: "",
};

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map((d) => [d, { ...DEFAULT_DAY }])
);

function StatusBadge({ status }) {
  if (!status) {
    return (
      <output className="status-badge empty">
        —
      </output>
    );
  }

  const label =
    status === "on_leave" ? "on-leave" : status;

  return (
    <output className={`status-badge ${status}`}>
      {label}
    </output>
  );
}

export default function Schedule({
  staffId,
  facilityId,
  onBack,
}) {
  const addRef = useRef();
  const clearRef = useRef();
  const updateRef = useRef();

  const staff_id =
    staffId || localStorage.getItem("staff_id");

  const facility_id =
    facilityId ||
    localStorage.getItem("facility_id");

  const [formSchedule, setFormSchedule] =
    useState(DEFAULT_SCHEDULE);

  const [savedTimes, setSavedTimes] =
    useState({});

  const [loading, setLoading] =
    useState(false);

  const handleChange = (
    day,
    field,
    value
  ) => {
    setFormSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const resetForm = () =>
    setFormSchedule(DEFAULT_SCHEDULE);

  async function read() {
    const result = await getSchedule(staff_id);

    if (result?.data) {
      setSavedTimes(result.data);
    }
  }

  useEffect(() => {
    read();
  }, []);

  async function add_time(e) {
    e.preventDefault();

    const payload = DAYS.filter(
      (day) =>
        formSchedule[day].start_time &&
        formSchedule[day].end_time &&
        formSchedule[day]
          .appointment_status
    ).map((day) => ({
      staff_id,
      facility_id,
      day_of_week: day,
      start_time:
        formSchedule[day].start_time,
      end_time:
        formSchedule[day].end_time,
      appointment_status:
        formSchedule[day]
          .appointment_status,
    }));

    if (!facility_id) {
      alert("Missing facility ID.");
      return;
    }

    if (!staff_id) {
      alert("Missing staff ID.");
      return;
    }

    if (payload.length === 0) {
      alert(
        "Please fill in at least one complete day."
      );
      return;
    }

    setLoading(true);

    const result =
      await createSchedule(payload);

    setLoading(false);

    if (!result?.success) {
      alert(
        result?.error ||
          result?.message ||
          "Failed to save schedule."
      );
      return;
    }

    resetForm();
    await read();
    addRef.current.close();
  }

  async function clear_times() {
    setLoading(true);

    const result = await deleteSchedule(
      staff_id
    );

    setLoading(false);

    if (!result?.success) {
      alert(
        "Failed to clear schedule. Please try again."
      );
      return;
    }

    await read();
    clearRef.current.close();
  }

  const applyToDays = (
    targetDays,
    values
  ) => {
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
    setFormSchedule(
      Object.fromEntries(
        DAYS.map((day) => [
          day,
          {
            start_time:
              savedTimes?.[day]
                ?.start_time || "",

            end_time:
              savedTimes?.[day]
                ?.end_time || "",

            appointment_status:
              savedTimes?.[day]
                ?.appointment_status ||
              "",
          },
        ])
      )
    );
  }

  const markClosed = (day) =>
    setFormSchedule((prev) => ({
      ...prev,
      [day]: {
        start_time: "",
        end_time: "",
        appointment_status: "closed",
      },
    }));

  const markOnLeave = (day) =>
    setFormSchedule((prev) => ({
      ...prev,
      [day]: {
        start_time: "",
        end_time: "",
        appointment_status:
          "on_leave",
      },
    }));

  const copyMondayToWeek = () =>
    applyToDays(
      ["Tues", "Wed", "Thurs", "Fri"],
      formSchedule.Mon
    );

  async function saveWeeklySchedule(e) {
    e.preventDefault();

    const payload = DAYS.filter(
      (day) =>
        formSchedule[day]
          .appointment_status
    ).map((day) => ({
      staff_id,
      facility_id,
      day_of_week: day,

      start_time:
        formSchedule[day]
          .appointment_status ===
        "open"
          ? formSchedule[day]
              .start_time
          : null,

      end_time:
        formSchedule[day]
          .appointment_status ===
        "open"
          ? formSchedule[day].end_time
          : null,

      appointment_status:
        formSchedule[day]
          .appointment_status,
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

    const result =
      await createSchedule(payload);

    setLoading(false);

    if (!result?.success) {
      alert(
        result?.error ||
          "Failed to save schedule."
      );
      return;
    }

    await read();

    resetForm();

    addRef.current?.close();
    updateRef.current?.close();
  }

  const WeeklyEditor = () => (
    <section className="weekly-editor">
      {DAYS.map((day) => (
        <section
          className="weekly-row"
          key={day}
        >
          <header className="weekly-day">
            <strong>
              {DAY_LABELS[day]}
            </strong>

            <StatusBadge
              status={
                formSchedule[day]
                  .appointment_status
              }
            />
          </header>

          <fieldset className="weekly-inputs">
            <label>
              <section className="sr-only">
                {DAY_LABELS[day]} start
                time
              </section>

              <input
                type="time"
                value={
                  formSchedule[day]
                    .start_time
                }
                disabled={
                  formSchedule[day]
                    .appointment_status !==
                  "open"
                }
                onChange={(e) =>
                  handleChange(
                    day,
                    "start_time",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <section className="sr-only">
                {DAY_LABELS[day]} end time
              </section>

              <input
                type="time"
                value={
                  formSchedule[day]
                    .end_time
                }
                disabled={
                  formSchedule[day]
                    .appointment_status !==
                  "open"
                }
                onChange={(e) =>
                  handleChange(
                    day,
                    "end_time",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <section className="sr-only">
                {DAY_LABELS[day]} status
              </section>

              <select
                value={
                  formSchedule[day]
                    .appointment_status
                }
                onChange={(e) => {
                  const status =
                    e.target.value;

                  if (
                    status ===
                      "closed" ||
                    status ===
                      "on_leave"
                  ) {
                    setFormSchedule(
                      (prev) => ({
                        ...prev,
                        [day]: {
                          start_time: "",
                          end_time: "",
                          appointment_status:
                            status,
                        },
                      })
                    );
                  } else {
                    handleChange(
                      day,
                      "appointment_status",
                      status
                    );
                  }
                }}
              >
                <option value="">
                  — select —
                </option>

                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status ===
                      "on_leave"
                        ? "On leave"
                        : status
                            .charAt(0)
                            .toUpperCase() +
                          status.slice(1)}
                    </option>
                  )
                )}
              </select>
            </label>
          </fieldset>

          <menu className="weekly-actions">
            <li>
              <button
                type="button"
                className="mini-btn"
                onClick={() =>
                  markClosed(day)
                }
              >
                Closed
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mini-btn"
                onClick={() =>
                  markOnLeave(day)
                }
              >
                On leave
              </button>
            </li>
          </menu>
        </section>
      ))}
    </section>
  );

  const QuickFill = () => (
    <section className="quick-fill-card">
      <header>
        <h3>Quick fill</h3>

        <p>
          Set common working hours, then
          adjust individual days if
          needed.
        </p>
      </header>

      <menu className="quick-fill-actions">
        <li>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              applyToDays(
                [
                  "Mon",
                  "Tues",
                  "Wed",
                  "Thurs",
                  "Fri",
                ],
                {
                  start_time: "09:00",
                  end_time: "17:00",
                  appointment_status:
                    "open",
                }
              )
            }
          >
            Weekdays 09:00–17:00
          </button>
        </li>

        <li>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              applyToDays(DAYS, {
                start_time: "08:00",
                end_time: "16:00",
                appointment_status:
                  "open",
              })
            }
          >
            All days 08:00–16:00
          </button>
        </li>

        <li>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={copyMondayToWeek}
          >
            Copy Monday to weekdays
          </button>
        </li>
      </menu>
    </section>
  );

  return (
    <main className="avail-page">
      <header className="avail-header">
        <section className="avail-header-left">
          {onBack && (
            <button
              className="avail-back-btn"
              onClick={onBack}
            >
              ← Back
            </button>
          )}

          <h1 className="avail-title">
            Staff Availability
          </h1>
        </section>

        <menu className="avail-header-actions">
          <li>
            <button
              className="btn btn-secondary"
              onClick={() => {
                resetForm();
                addRef.current.showModal();
              }}
            >
              + Add Schedule
            </button>
          </li>

          <li>
            <button
              className="btn btn-ghost"
              onClick={() => {
                loadSavedIntoForm();
                updateRef.current.showModal();
              }}
            >
              Edit
            </button>
          </li>

          <li>
            <button
              className="btn btn-danger"
              onClick={() =>
                clearRef.current.showModal()
              }
            >
              Clear All
            </button>
          </li>
        </menu>
      </header>

      <section className="avail-grid">
        {DAYS.map((day) => (
          <article
            className="day-card"
            key={day}
          >
            <header>
              <strong className="day-card-label">
                {DAY_LABELS[day]}
              </strong>
            </header>

            <dl className="day-card-times">
              <section className="day-card-time-block">
                <dt className="time-label">
                  Start
                </dt>

                <dd
                  className={`time-value ${
                    !savedTimes?.[day]
                      ?.start_time
                      ? "empty"
                      : ""
                  }`}
                >
                  {savedTimes?.[day]
                    ?.start_time ??
                    "Not set"}
                </dd>
              </section>

              <section className="day-card-time-block">
                <dt className="time-label">
                  End
                </dt>

                <dd
                  className={`time-value ${
                    !savedTimes?.[day]
                      ?.end_time
                      ? "empty"
                      : ""
                  }`}
                >
                  {savedTimes?.[day]
                    ?.end_time ?? "Not set"}
                </dd>
              </section>
            </dl>

            <footer>
              <StatusBadge
                status={
                  savedTimes?.[day]
                    ?.appointment_status
                }
              />
            </footer>
          </article>
        ))}
      </section>

      {/* Add dialog */}
      <dialog ref={addRef}>
        <header className="dialog-header">
          <h2 className="dialog-title">
            Add Schedule
          </h2>

          <button
            className="dialog-close"
            onClick={() =>
              addRef.current.close()
            }
          >
            ✕
          </button>
        </header>

        <form onSubmit={add_time}>
          <section className="dialog-body">
            <QuickFill />
            <WeeklyEditor />
          </section>

          <footer className="dialog-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                addRef.current.close()
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${
                loading
                  ? "btn-loading"
                  : ""
              }`}
              disabled={loading}
            >
              Save Weekly Schedule
            </button>
          </footer>
        </form>
      </dialog>

      {/* Clear dialog */}
      <dialog ref={clearRef}>
        <header className="dialog-header">
          <h2 className="dialog-title">
            Clear Schedule
          </h2>

          <button
            className="dialog-close"
            onClick={() =>
              clearRef.current.close()
            }
          >
            ✕
          </button>
        </header>

        <section className="clear-body">
          <p className="clear-icon">
            🗑️
          </p>

          <p className="clear-message">
            Are you sure you want to{" "}
            <strong>
              remove all schedule entries
            </strong>
            ?
            <br />
            This cannot be undone.
          </p>
        </section>

        <footer className="dialog-footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              clearRef.current.close()
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className={`btn btn-danger ${
              loading
                ? "btn-loading"
                : ""
            }`}
            onClick={clear_times}
            disabled={loading}
          >
            Yes, Clear All
          </button>
        </footer>
      </dialog>

      {/* Update dialog */}
      <dialog ref={updateRef}>
        <header className="dialog-header">
          <h2 className="dialog-title">
            Edit Schedule
          </h2>

          <button
            className="dialog-close"
            onClick={() =>
              updateRef.current.close()
            }
          >
            ✕
          </button>
        </header>

        <form onSubmit={saveWeeklySchedule}>
          <section className="dialog-body">
            <QuickFill />
            <WeeklyEditor />
          </section>

          <footer className="dialog-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                updateRef.current.close()
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`btn btn-primary ${
                loading
                  ? "btn-loading"
                  : ""
              }`}
              disabled={loading}
            >
              Save Changes
            </button>
          </footer>
        </form>
      </dialog>
    </main>
  );
}