import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "#lib/supabase";
import { FiArrowLeft, FiSearch, FiUserCheck, FiClock, FiCalendar } from "react-icons/fi";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

export default function WalkIn() {
  const navigate = useNavigate();

  // Facility
  const [facilityId, setFacilityId] = useState(null);
  const [facilityName, setFacilityName] = useState("");
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [facilityError, setFacilityError] = useState("");

  // Slots
  const [slots, setSlots] = useState([]);

  // Tab: "queue" = add to today's queue | "book" = book future appointment
  const [activeTab, setActiveTab] = useState("queue");

  // Step 1 — Profile search
  const [contact, setContact] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState({ type: "", text: "" });
  const [profile, setProfile] = useState(null);

  // Step 2 — Slot + reason
  const [slotId, setSlotId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState({ type: "", text: "" });


  //
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

  // ── Step 1: search for existing profile ───────────────────────────────────
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

  // ── Step 2: queue today or book future ────────────────────────────────────
  async function handleSubmit(e) {
  e.preventDefault();
  if (!profile || !slotId) return;

  setSubmitting(true);
  setSubmitMsg({ type: "", text: "" });

  // Book appointment via backend (uses service role — no RLS issues)
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
      slot_id: slotId|| null,
      facility_id: facilityId,
    }),
  });

  const bookData = await bookRes.json();

  if (!bookRes.ok || bookData.error) {
    setSubmitMsg({ type: "error", text: bookData.error || "Failed to create appointment." });
    setSubmitting(false);
    return;
  }

  // For "queue now" — also add to the live queue immediately
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

  // Reset for next patient
  setProfile(null);
  setContact("");
  setSlotId("");
  setReason("");
  setSearchMsg({ type: "", text: "" });
  if (facilityId) fetchSlots(facilityId);
  setSubmitting(false);
}
async function handleCheckIn(e) {
  e.preventDefault();
  if (!profile) return;

  setSubmitting(true);
  setSubmitMsg({ type: "", text: "" });

  // Verify they have a booked appointment today at this facility
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

  // Add to queue
  const qRes = await fetch(`${API_BASE}/queue/add_to_queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_details: profile.email || profile.phone_number,
      facility_id: facilityId,
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


  // ── Derived slot lists ─────────────────────────────────────────────────────
  const today = getTodayString();
  const now = new Date();

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

  // ── Render ─────────────────────────────────────────────────────────────────
  if (facilityLoading) {
  return (
    <div className="staff-dash">
      <div style={{ padding: 40, color: "#888" }}>Loading facility…</div>
    </div>
  );
}

if (facilityError) {
  return (
    <div className="staff-dash">
      <div style={{ padding: 40, color: "#ef4444" }}>{facilityError}</div>
    </div>
  );
}

return (
  <div className="staff-dash">
    <header className="staff-dash-header">
      <div>
        <h1>🚶 Walk-In Patients</h1>

        {facilityName && (
          <p style={{ margin: 0, fontSize: 14, color: "#ccc" }}>
            📍 {facilityName}
          </p>
        )}
      </div>

      <button className="staff-back-btn" onClick={() => navigate(-1)}>
        <FiArrowLeft style={{ marginRight: 6 }} />
        Back
      </button>
    </header>

    <div className="staff-dash-grid">
      <section
        className="staff-card"
        style={{ gridColumn: "1 / -1", maxWidth: 640 }}
      >
        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("queue");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              background: activeTab === "queue" ? "#1d4ed8" : "#1f2937",
              color: "white",
              boxShadow:
                activeTab === "queue" ? "0 0 0 2px #60a5fa" : "none",
            }}
          >
            <FiClock />
            Queue Today
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("book");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              background: activeTab === "book" ? "#15803d" : "#1f2937",
              color: "white",
              boxShadow:
                activeTab === "book" ? "0 0 0 2px #4ade80" : "none",
            }}
          >
            <FiCalendar />
            Book Future Appointment
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("checkin");
              setSlotId("");
              setSubmitMsg({ type: "", text: "" });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              background: activeTab === "checkin" ? "#b45309" : "#1f2937",
              color: "white",
              boxShadow:
                activeTab === "checkin" ? "0 0 0 2px #fbbf24" : "none",
            }}
          >
            <FiUserCheck />
            Check In Patient
          </button>
        </div>

        <p style={{ margin: "0 0 20px", fontSize: 14, color: "#9ca3af" }}>
          {activeTab === "queue"
            ? "Find a registered patient and add them to today's live queue."
            : activeTab === "book"
            ? "Find a registered patient and schedule a future appointment for them."
            : "Find a patient with an existing booking and check them into today's queue."}
        </p>

        {/* Step 1: Profile Search */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#e5e7eb" }}>
            Step 1 — Find Patient
          </h3>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone number"
              required
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #374151",
                background: "#111827",
                color: "#f9fafb",
                fontSize: 14,
              }}
            />

            <button
              type="submit"
              disabled={searching}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: "#374151",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                opacity: searching ? 0.6 : 1,
              }}
            >
              <FiSearch />
              {searching ? "Searching…" : "Find"}
            </button>
          </form>

          {searchMsg.text && (
            <p
              className={
                searchMsg.type === "error" ? "staff-error" : "staff-success"
              }
              style={{ marginTop: 10 }}
            >
              {searchMsg.text}
            </p>
          )}
        </div>

        {/* Profile Card + Step 2 */}
        {profile && (
          <>
            <div
              style={{
                marginBottom: 28,
                padding: 16,
                background: "#052e16",
                border: "1px solid #166534",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <FiUserCheck style={{ color: "#4ade80", fontSize: 20 }} />
                <span style={{ fontWeight: 700, fontSize: 16, color: "#f0fdf4" }}>
                  {profile.name} {profile.surname}
                </span>
              </div>

              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#86efac" }}>
                  📧 {profile.email || "—"}
                </span>

                <span style={{ fontSize: 13, color: "#86efac" }}>
                  📱 {profile.phone_number || "—"}
                </span>

                {profile.sex && (
                  <span style={{ fontSize: 13, color: "#86efac" }}>
                    ⚧ {profile.sex}
                  </span>
                )}
              </div>
            </div>

            {activeTab === "checkin" ? (
              <div>
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 15,
                    color: "#e5e7eb",
                  }}
                >
                  Step 2 — Check In
                </h3>

                <form onSubmit={handleCheckIn}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: "11px 24px",
                      background: "#b45309",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting ? "Processing…" : "Confirm Check In"}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 15,
                    color: "#e5e7eb",
                  }}
                >
                  Step 2 —{" "}
                  {activeTab === "queue"
                    ? "Select Today's Slot"
                    : "Select Future Slot"}
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
                    {activeTab === "queue"
                      ? "Available slot today"
                      : "Available future slot"}

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
                          ({(slot.total_capacity ?? 0) -
                            (slot.booked_count ?? 0)}{" "}
                          available)
                        </option>
                      ))}
                    </select>
                  </label>

                  {availableSlots.length === 0 && (
                    <p
                      style={{
                        color: "#f59e0b",
                        fontSize: 13,
                        margin: "0 0 8px",
                      }}
                    >
                      ⚠️{" "}
                      {activeTab === "queue"
                        ? "No slots available for today. Create a new slot in the Staff Dashboard, or switch to Book Future Appointment."
                        : "No future slots available. Create new slots in the Staff Dashboard."}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !slotId || availableSlots.length === 0}
                    style={{
                      padding: "11px 24px",
                      background:
                        activeTab === "queue" ? "#1d4ed8" : "#15803d",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      opacity:
                        submitting || !slotId || availableSlots.length === 0
                          ? 0.6
                          : 1,
                    }}
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
          <p
            className={
              submitMsg.type === "error" ? "staff-error" : "staff-success"
            }
            style={{ marginTop: 16, fontSize: 15 }}
          >
            {submitMsg.text}
          </p>
        )}
      </section>
    </div>
  </div>
);}