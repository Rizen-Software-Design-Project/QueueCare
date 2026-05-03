import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";
import { FiArrowLeft, FiSearch, FiUserCheck, FiClock, FiCalendar } from "react-icons/fi";
import "./Walkin.css";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(val) {
  return val ? String(val).slice(0, 5) : "—";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function WalkIn() {
  const navigate = useNavigate();

  // Facility
  const [facilityId,      setFacilityId]      = useState(null);
  const [facilityName,    setFacilityName]    = useState("");
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [facilityError,   setFacilityError]   = useState("");

  // Slots
  const [slots, setSlots] = useState([]);

  // Tab: "queue" = add to today's queue | "book" = book future appointment
  const [activeTab, setActiveTab] = useState("queue");

  // Step 1 — Profile search
  const [contact,    setContact]    = useState("");
  const [searching,  setSearching]  = useState(false);
  const [searchMsg,  setSearchMsg]  = useState({ type: "", text: "" });
  const [profile,    setProfile]    = useState(null);

  // Step 2 — Slot + reason
  const [slotId,     setSlotId]     = useState("");
  const [reason,     setReason]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState({ type: "", text: "" });

  // ── Fetch slots ───────────────────────────────────────────────────────────
  async function fetchSlots(fId) {
    const { data } = await supabase
      .from("appointment_slots")
      .select("id, slot_date, slot_time, duration_minutes, total_capacity, booked_count")
      .eq("facility_id", fId)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });

    const now = new Date();
    const active = (data || []).filter(
      (s) => new Date(`${s.slot_date}T${s.slot_time}`) > now
    );
    setSlots(active);
  }

  // ── Step 1: search for existing profile ──────────────────────────────────
  async function handleSearch(e) {
    e.preventDefault();
    setProfile(null);
    setSlotId("");
    setReason("");
    setSearchMsg({ type: "", text: "" });
    setSubmitMsg({ type: "", text: "" });
    setSearching(true);

    const { data: found, error } = await supabase
      .from("profiles")
      .select("id, name, surname, email, phone_number, sex, dob")
      .or(`email.eq.${contact},phone_number.eq.${contact}`)
      .maybeSingle();

    setSearching(false);

    if (error || !found) {
      setSearchMsg({
        type: "error",
        text: "No profile found. The patient must be registered before walking in.",
      });
      return;
    }

    setProfile(found);
    setSearchMsg({ type: "success", text: "Profile found — confirm below." });
  }

  // ── Step 2: queue today or book future ───────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile || !slotId) return;

    setSubmitting(true);
    setSubmitMsg({ type: "", text: "" });

    const bookRes = await fetch(`${API_BASE}/appointments/book-walkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: {
          id:           profile.id,
          name:         profile.name,
          surname:      profile.surname,
          email:        profile.email,
          phone_number: profile.phone_number,
        },
        reason:      reason,
        slot_id:     slotId || null,
        facility_id: facilityId,
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
        body: JSON.stringify({
          contact_details: profile.email || profile.phone_number,
          facility_id:     facilityId,
        }),
      });
      const qData = await qRes.json();

      if (!qRes.ok || qData.error) {
        setSubmitMsg({ type: "error", text: qData.error || "Appointment created but failed to add to queue." });
        setSubmitting(false);
        return;
      }

      setSubmitMsg({
        type: "success",
        text: `✅ ${profile.name} ${profile.surname} booked and added to today's queue.`,
      });
    } else {
      setSubmitMsg({
        type: "success",
        text: `✅ Appointment booked for ${profile.name} ${profile.surname} on ${formatDate(slots.find((s) => String(s.id) === String(slotId))?.slot_date)}.`,
      });
    }

    setProfile(null);
    setContact("");
    setSlotId("");
    setReason("");
    setSearchMsg({ type: "", text: "" });
    if (facilityId) fetchSlots(facilityId);
    setSubmitting(false);
  }

  // ── Check in ──────────────────────────────────────────────────────────────
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
      setSubmitMsg({
        type: "error",
        text: `${profile.name} ${profile.surname} has no booked appointment at this clinic today.`,
      });
      setSubmitting(false);
      return;
    }

    const qRes = await fetch(`${API_BASE}/queue/add_to_queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_details: profile.email || profile.phone_number,
        facility_id:     facilityId,
      }),
    });
    const qData = await qRes.json();

    if (!qRes.ok || qData.error) {
      setSubmitMsg({ type: "error", text: qData.error || "Failed to add to queue." });
      setSubmitting(false);
      return;
    }

    setSubmitMsg({
      type: "success",
      text: `✅ ${profile.name} ${profile.surname} has been checked in and added to the queue.`,
    });

    setProfile(null);
    setContact("");
    setSearchMsg({ type: "", text: "" });
    setSubmitting(false);
  }

  // ── Load facility & slots on mount ────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

      if (!identity.auth_provider || !identity.provider_user_id) {
        setFacilityError("Not logged in. Please sign in again.");
        setFacilityLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_provider", identity.auth_provider)
        .eq("provider_user_id", identity.provider_user_id)
        .maybeSingle();

      if (!prof) {
        setFacilityError("Could not load your profile.");
        setFacilityLoading(false);
        return;
      }

      const { data: assignment } = await supabase
        .from("staff_assignments")
        .select("facility_id, facilities(id, name)")
        .eq("profile_id", prof.id)
        .maybeSingle();

      if (!assignment?.facility_id) {
        setFacilityError("You are not assigned to a facility yet.");
        setFacilityLoading(false);
        return;
      }

      setFacilityId(assignment.facility_id);
      setFacilityName(assignment.facilities?.name || "");
      await fetchSlots(assignment.facility_id);
      setFacilityLoading(false);
    }

    load();
  }, []);

  // ── Derived slot lists ────────────────────────────────────────────────────
  const today = getTodayString();
  const now   = new Date();

  const todaySlots = slots.filter(
    (s) =>
      s.slot_date === today &&
      (s.total_capacity ?? 0) > (s.booked_count ?? 0) &&
      new Date(`${s.slot_date}T${s.slot_time}`) > now
  );

  const futureSlots = slots.filter(
    (s) =>
      s.slot_date > today &&
      (s.total_capacity ?? 0) > (s.booked_count ?? 0)
  );

  const availableSlots = activeTab === "queue" ? todaySlots : futureSlots;

  // ── Render ────────────────────────────────────────────────────────────────
  if (facilityLoading) {
    return (
      <div className="staff-dash">
        <div className="wi-loading">Loading facility…</div>
      </div>
    );
  }

  if (facilityError) {
    return (
      <div className="staff-dash">
        <div className="wi-facility-error">{facilityError}</div>
      </div>
    );
  }

  return (
    <div className="staff-dash">
      <header className="staff-dash-header">
        <div>
          <h1>🚶 Walk-In Patients</h1>
          {facilityName && (
            <p className="wi-facility-name">📍 {facilityName}</p>
          )}
        </div>

        <button className="staff-back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft style={{ marginRight: 6 }} />
          Back
        </button>
      </header>

      <div className="staff-dash-grid">
        <section className="staff-card wi-card-full">

          {/* Tab switcher */}
          <div className="wi-tabs">
            <button
              type="button"
              className={`wi-tab${activeTab === "queue" ? " wi-tab--queue" : ""}`}
              onClick={() => { setActiveTab("queue"); setSlotId(""); setSubmitMsg({ type: "", text: "" }); }}
            >
              <FiClock />
              Queue Today
            </button>

            <button
              type="button"
              className={`wi-tab${activeTab === "book" ? " wi-tab--book" : ""}`}
              onClick={() => { setActiveTab("book"); setSlotId(""); setSubmitMsg({ type: "", text: "" }); }}
            >
              <FiCalendar />
              Book Future Appointment
            </button>

            <button
              type="button"
              className={`wi-tab${activeTab === "checkin" ? " wi-tab--checkin" : ""}`}
              onClick={() => { setActiveTab("checkin"); setSlotId(""); setSubmitMsg({ type: "", text: "" }); }}
            >
              <FiUserCheck />
              Check In Patient
            </button>
          </div>

          <p className="wi-tab-desc">
            {activeTab === "queue"
              ? "Find a registered patient and add them to today's live queue."
              : activeTab === "book"
              ? "Find a registered patient and schedule a future appointment for them."
              : "Find a patient with an existing booking and check them into today's queue."}
          </p>

          {/* Step 1: Profile Search */}
          <div className="wi-search-section">
            <h3 className="wi-step-heading">Step 1 — Find Patient</h3>

            <form onSubmit={handleSearch} className="wi-search-row">
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email or phone number"
                required
                className="wi-search-input"
              />
              <button type="submit" disabled={searching} className="wi-search-btn">
                <FiSearch />
                {searching ? "Searching…" : "Find"}
              </button>
            </form>

            {searchMsg.text && (
              <p className={`wi-search-msg ${searchMsg.type === "error" ? "staff-error" : "staff-success"}`}>
                {searchMsg.text}
              </p>
            )}
          </div>

          {/* Profile card + Step 2 */}
          {profile && (
            <>
              <div className="wi-profile-card">
                <div className="wi-profile-card-top">
                  <FiUserCheck className="wi-profile-check-icon" />
                  <span className="wi-profile-name">
                    {profile.name} {profile.surname}
                  </span>
                </div>

                <div className="wi-profile-details">
                  <span className="wi-profile-detail">📧 {profile.email || "—"}</span>
                  <span className="wi-profile-detail">📱 {profile.phone_number || "—"}</span>
                  {profile.sex && (
                    <span className="wi-profile-detail">⚧ {profile.sex}</span>
                  )}
                </div>
              </div>

              {activeTab === "checkin" ? (
                <div>
                  <h3 className="wi-step-heading">Step 2 — Check In</h3>
                  <form onSubmit={handleCheckIn}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="wi-checkin-btn"
                    >
                      {submitting ? "Processing…" : "Confirm Check In"}
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <h3 className="wi-step-heading">
                    Step 2 —{" "}
                    {activeTab === "queue" ? "Select Today's Slot" : "Select Future Slot"}
                  </h3>

                  <form onSubmit={handleSubmit} className="staff-form">
                    <label>
                      Reason for visit
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Fever, check-up, follow-up"
                      />
                    </label>

                    <label>
                      {activeTab === "queue" ? "Available slot today" : "Available future slot"}
                      <select
                        value={slotId}
                        onChange={(e) => setSlotId(e.target.value)}
                        required
                      >
                        <option value="">Choose a slot…</option>
                        {availableSlots.length === 0 && (
                          <option disabled>
                            {activeTab === "queue"
                              ? "No slots available today"
                              : "No future slots available"}
                          </option>
                        )}
                        {availableSlots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {formatDate(slot.slot_date)} —{" "}
                            {formatTime(slot.slot_time)}{" "}
                            ({(slot.total_capacity ?? 0) - (slot.booked_count ?? 0)} available)
                          </option>
                        ))}
                      </select>
                    </label>

                    {availableSlots.length === 0 && (
                      <p className="wi-no-slots-msg">
                        ⚠️{" "}
                        {activeTab === "queue"
                          ? "No slots available for today. Create a new slot in the Staff Dashboard, or switch to Book Future Appointment."
                          : "No future slots available. Create new slots in the Staff Dashboard."}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !slotId || availableSlots.length === 0}
                      className={`wi-submit-btn${activeTab === "queue" ? " wi-submit-btn--queue" : " wi-submit-btn--book"}`}
                    >
                      {submitting
                        ? "Processing…"
                        : activeTab === "queue"
                        ? "Add to Today's Queue"
                        : "Book Appointment"}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {submitMsg.text && (
            <p className={`wi-submit-msg ${submitMsg.type === "error" ? "staff-error" : "staff-success"}`}>
              {submitMsg.text}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}