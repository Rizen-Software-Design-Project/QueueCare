import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import { FiSearch, FiUserCheck, FiClock, FiCalendar } from "react-icons/fi";
import "./Walkin.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(val) {
  return val ? String(val).slice(0, 5) : "—";
}

export default function WalkIn({ facilityId, facilityName, onBack }) {
  const [slots,           setSlots]           = useState([]);
  const [activeTab,       setActiveTab]       = useState("queue");
  const [contact,         setContact]         = useState("");
  const [searching,       setSearching]       = useState(false);
  const [searchMsg,       setSearchMsg]       = useState({ type: "", text: "" });
  const [profile,         setProfile]         = useState(null);
  const [slotId,          setSlotId]          = useState("");
  const [reason,          setReason]          = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [submitMsg,       setSubmitMsg]       = useState({ type: "", text: "" });

  async function fetchSlots(fId) {
    const { data } = await supabase
      .from("appointment_slots")
      .select("id, slot_date, slot_time, duration_minutes, total_capacity, booked_count")
      .eq("facility_id", fId)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });
    const now = new Date();
    setSlots((data || []).filter((s) => new Date(`${s.slot_date}T${s.slot_time}`) > now));
  }

  useEffect(() => {
    if (facilityId) fetchSlots(facilityId);
  }, [facilityId]);

  async function handleSearch(e) {
    e.preventDefault();
    setProfile(null); setSlotId(""); setReason("");
    setSearchMsg({ type: "", text: "" }); setSubmitMsg({ type: "", text: "" });
    setSearching(true);
    const { data: found, error } = await supabase
      .from("profiles")
      .select("id, name, surname, email, phone_number, sex, dob")
      .or(`email.eq.${contact},phone_number.eq.${contact}`)
      .maybeSingle();
    setSearching(false);
    if (error || !found) {
      setSearchMsg({ type: "error", text: "No profile found. The patient must be registered before walking in." });
      return;
    }
    setProfile(found);
    setSearchMsg({ type: "success", text: "Profile found — confirm below." });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile || !slotId) return;
    setSubmitting(true);
    setSubmitMsg({ type: "", text: "" });
    const bookRes = await fetch(`${API_BASE}/appointments/book-walkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: { id: profile.id, name: profile.name, surname: profile.surname, email: profile.email, phone_number: profile.phone_number },
        reason, slot_id: slotId || null, facility_id: facilityId,
      }),
    });
    const bookData = await bookRes.json();
    if (!bookRes.ok || bookData.error) {
      setSubmitMsg({ type: "error", text: bookData.error || "Failed to create appointment." });
      setSubmitting(false);
      return;
    }
    if (activeTab === "queue") {
      const qRes = await fetch(`${API_BASE}/queue/add_to_queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_details: profile.email || profile.phone_number, facility_id: facilityId }),
      });
      const qData = await qRes.json();
      if (!qRes.ok || qData.error) {
        setSubmitMsg({ type: "error", text: qData.error || "Appointment created but failed to add to queue." });
        setSubmitting(false);
        return;
      }
      setSubmitMsg({ type: "success", text: `✅ ${profile.name} ${profile.surname} booked and added to today's queue.` });
    } else {
      setSubmitMsg({ type: "success", text: `✅ Appointment booked for ${profile.name} ${profile.surname} on ${formatDate(slots.find((s) => String(s.id) === String(slotId))?.slot_date)}.` });
    }
    setProfile(null); setContact(""); setSlotId(""); setReason("");
    setSearchMsg({ type: "", text: "" });
    if (facilityId) fetchSlots(facilityId);
    setSubmitting(false);
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    setSubmitMsg({ type: "", text: "" });
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, appointment_slots!inner(slot_date, facility_id)")
      .eq("patient_id", profile.id)
      .eq("appointment_slots.facility_id", facilityId)
      .eq("appointment_slots.slot_date", getTodayString())
      .in("status", ["booked", "confirmed"]);
    if (!appts || appts.length === 0) {
      setSubmitMsg({ type: "error", text: `${profile.name} ${profile.surname} has no booked appointment at this clinic today.` });
      setSubmitting(false);
      return;
    }
    const qRes = await fetch(`${API_BASE}/queue/add_to_queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_details: profile.email || profile.phone_number, facility_id: facilityId }),
    });
    const qData = await qRes.json();
    if (!qRes.ok || qData.error) {
      setSubmitMsg({ type: "error", text: qData.error || "Failed to add to queue." });
      setSubmitting(false);
      return;
    }
    setSubmitMsg({ type: "success", text: `✅ ${profile.name} ${profile.surname} has been checked in and added to the queue.` });
    setProfile(null); setContact(""); setSearchMsg({ type: "", text: "" });
    setSubmitting(false);
  }

  const today        = getTodayString();
  const now          = new Date();
  const todaySlots   = slots.filter((s) => s.slot_date === today && (s.total_capacity ?? 0) > (s.booked_count ?? 0) && new Date(`${s.slot_date}T${s.slot_time}`) > now);
  const futureSlots  = slots.filter((s) => s.slot_date > today && (s.total_capacity ?? 0) > (s.booked_count ?? 0));
  const availableSlots = activeTab === "queue" ? todaySlots : futureSlots;

  return (
  <main className="staff-dash">


    <section className="staff-dash-grid">

      <article className="staff-card wi-card-full">

        {/* ── TABS ───────────────────────────── */}

        <nav
          className="wi-tabs"
          aria-label="Walk-in actions"
        >

          <button
            type="button"
            className={`wi-tab${activeTab === "queue" ? " wi-tab--queue" : ""}`}
            onClick={() => {
              setActiveTab("queue");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            aria-pressed={activeTab === "queue"}
          >
            <FiClock />
            <span>Queue Today</span>
          </button>

          <button
            type="button"
            className={`wi-tab${activeTab === "book" ? " wi-tab--book" : ""}`}
            onClick={() => {
              setActiveTab("book");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            aria-pressed={activeTab === "book"}
          >
            <FiCalendar />
            <span>Book Future Appointment</span>
          </button>

          <button
            type="button"
            className={`wi-tab${activeTab === "checkin" ? " wi-tab--checkin" : ""}`}
            onClick={() => {
              setActiveTab("checkin");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            aria-pressed={activeTab === "checkin"}
          >
            <FiUserCheck />
            <span>Check In Patient</span>
          </button>

        </nav>

        {/* ── DESCRIPTION ───────────────────── */}

        <p className="wi-tab-desc">
          {activeTab === "queue"
            ? "Find a registered patient and add them to today's live queue."
            : activeTab === "book"
            ? "Find a registered patient and schedule a future appointment for them."
            : "Find a patient with an existing booking and check them into today's queue."}
        </p>

        {/* ── SEARCH ────────────────────────── */}

        <section className="wi-search-section">

          <header>
            <h2 className="wi-step-heading">
              Step 1 — Find Patient
            </h2>
          </header>

          <form
            onSubmit={handleSearch}
            className="wi-search-row"
          >

            <label
              htmlFor="patient-contact"
              className="sr-only"
            >
              Email or phone number
            </label>

            <input
              id="patient-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone number"
              required
              className="wi-search-input"
            />

            <button
              type="submit"
              disabled={searching}
              className="wi-search-btn"
            >
              <FiSearch />
              <span>
                {searching ? "Searching…" : "Find"}
              </span>
            </button>

          </form>

          {searchMsg.text && (
            <p
              className={`wi-search-msg ${
                searchMsg.type === "error"
                  ? "staff-error"
                  : "staff-success"
              }`}
              role="status"
            >
              {searchMsg.text}
            </p>
          )}

        </section>

        {/* ── PROFILE ───────────────────────── */}

        {profile && (
          <>
            <article className="wi-profile-card">

              <header className="wi-profile-card-top">

                <FiUserCheck className="wi-profile-check-icon" />

                <h2 className="wi-profile-name">
                  {profile.name} {profile.surname}
                </h2>

              </header>

              <section className="wi-profile-details">

                <p className="wi-profile-detail">
                  📧 {profile.email || "—"}
                </p>

                <p className="wi-profile-detail">
                  📱 {profile.phone_number || "—"}
                </p>

                {profile.sex && (
                  <p className="wi-profile-detail">
                    ⚧ {profile.sex}
                  </p>
                )}

              </section>

            </article>

            {/* ── CHECK IN ───────────────────── */}

            {activeTab === "checkin" ? (
              <section>

                <header>
                  <h2 className="wi-step-heading">
                    Step 2 — Check In
                  </h2>
                </header>

                <form onSubmit={handleCheckIn}>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="wi-checkin-btn"
                  >
                    {submitting
                      ? "Processing…"
                      : "Confirm Check In"}
                  </button>

                </form>

              </section>
            ) : (

              /* ── BOOK / QUEUE ───────────────── */

              <section>

                <header>
                  <h2 className="wi-step-heading">
                    Step 2 —{" "}
                    {activeTab === "queue"
                      ? "Select Today's Slot"
                      : "Select Future Slot"}
                  </h2>
                </header>

                <form
                  onSubmit={handleSubmit}
                  className="staff-form"
                >

                  <fieldset>

                    <legend className="sr-only">
                      Appointment Details
                    </legend>

                    <label>

                      <span>Reason for visit</span>

                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Fever, check-up, follow-up"
                      />

                    </label>

                    <label>

                      <span>
                        {activeTab === "queue"
                          ? "Available slot today"
                          : "Available future slot"}
                      </span>

                      <select
                        value={slotId}
                        onChange={(e) => setSlotId(e.target.value)}
                        required
                      >

                        <option value="">
                          Choose a slot…
                        </option>

                        {availableSlots.length === 0 && (
                          <option disabled>
                            {activeTab === "queue"
                              ? "No slots available today"
                              : "No future slots available"}
                          </option>
                        )}

                        {availableSlots.map((slot) => (
                          <option
                            key={slot.id}
                            value={slot.id}
                          >
                            {formatDate(slot.slot_date)} —{" "}
                            {formatTime(slot.slot_time)} (
                            {(slot.total_capacity ?? 0) -
                              (slot.booked_count ?? 0)}{" "}
                            available)
                          </option>
                        ))}

                      </select>

                    </label>

                  </fieldset>

                  {availableSlots.length === 0 && (
                    <aside className="wi-no-slots-msg">

                      <p>
                        ⚠️{" "}
                        {activeTab === "queue"
                          ? "No slots available for today. Create a new slot in the Staff Dashboard, or switch to Book Future Appointment."
                          : "No future slots available. Create new slots in the Staff Dashboard."}
                      </p>

                    </aside>
                  )}

                  <footer>

                    <button
                      type="submit"
                      disabled={
                        submitting ||
                        !slotId ||
                        availableSlots.length === 0
                      }
                      className={`wi-submit-btn${
                        activeTab === "queue"
                          ? " wi-submit-btn--queue"
                          : " wi-submit-btn--book"
                      }`}
                    >
                      {submitting
                        ? "Processing…"
                        : activeTab === "queue"
                        ? "Add to Today's Queue"
                        : "Book Appointment"}
                    </button>

                  </footer>

                </form>

              </section>
            )}
          </>
        )}

        {/* ── SUBMIT MESSAGE ────────────────── */}

        {submitMsg.text && (
          <p
            className={`wi-submit-msg ${
              submitMsg.type === "error"
                ? "staff-error"
                : "staff-success"
            }`}
            role="status"
          >
            {submitMsg.text}
          </p>
        )}

      </article>

    </section>

  </main>
);
}