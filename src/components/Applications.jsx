/**
 * Applications.jsx
 *
 * Responsibility: Staff/admin role applications.
 * Used in TWO modes:
 *
 *   mode="apply"   (called from ProfileSetupPage for staff)
 *     Props: identity, selectedRole, onSubmitted, onBack
 *     Shows the staff application form. On submit → writes role_applications row.
 *
 *   mode="review"  (called from Dashboard for admins)
 *     Props: profile, onRoleUpdated
 *     Shows the admin review table with approve / reject actions.
 *     Approving a staff application also creates/updates a staff_assignments row.
 */

import { useEffect, useState } from "react";
import { supabase } from "#lib/supabase";  


// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function dobFromSAId(id) {
  if (!/^\d{13}$/.test(id)) return null;
  const yy = parseInt(id.slice(0, 2), 10);
  const mm = parseInt(id.slice(2, 4), 10);
  const dd = parseInt(id.slice(4, 6), 10);
  const yyyy = yy <= 25 ? 2000 + yy : 1900 + yy;
  const date = new Date(yyyy, mm - 1, dd);
  if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:  { background: "#fff8e1", color: "#e65100", border: "1px solid #ffe0b2" },
    approved: { background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" },
    rejected: { background: "#fdecea", color: "#c62828", border: "1px solid #f5c6cb" },
  };
  const style = map[status] || { background: "#f5f5f5", color: "#555", border: "1px solid #ddd" };
  return (
    <span style={{ ...style, padding: "4px 10px", borderRadius: 999,
                   fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
      {status || "unknown"}
    </span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Applications({
  profile      = null,      // review mode
  onRoleUpdated,            // review mode callback
  mode         = "review",
  identity     = null,      // apply mode
  selectedRole = "staff",   // apply mode
  onSubmitted,              // apply mode callback
  onBack,                   // apply mode callback
}) {
  const isApplyMode = mode === "apply";
  const isAdmin     = !isApplyMode && profile?.role === "admin";

  const [loading,         setLoading]         = useState(!isApplyMode);
  const [submitting,      setSubmitting]       = useState(false);
  const [reviewingId,     setReviewingId]      = useState(null);
  const [error,           setError]            = useState("");
  const [allApplications, setAllApplications]  = useState([]);

  // Clinic search state (apply mode)
  const [clinicQuery,     setClinicQuery]     = useState("");
  const [clinicResults,   setClinicResults]   = useState([]);
  const [selectedClinic,  setSelectedClinic]  = useState(null);
  const [searchingClinics,setSearchingClinics]= useState(false);

  const [form, setForm] = useState({
    name: "", surname: "", email: "", phone_number: "",
    sex: "", id_number: "", professional_id: "",
    license_number: "", cv_url: "", motivation: "",
  });

  // Pre-fill form from identity (apply mode)
  useEffect(() => {
    if (isApplyMode && identity) {
      setForm((prev) => ({
        ...prev,
        name:         prev.name         || identity.name    || "",
        surname:      prev.surname      || identity.surname  || "",
        email:        prev.email        || identity.email    || "",
        phone_number: prev.phone_number || identity.phone   || "",
      }));
    }
  }, [isApplyMode, identity]);

  // Load applications (review mode)
  useEffect(() => {
    if (!isApplyMode) loadData();
  }, [isApplyMode, profile?.id]);

  // ── Data fetching (review mode) ──────────────────────────────────────────
  async function loadData() {
    if (!profile?.id || !isAdmin) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("role_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (err) throw err;
      setAllApplications(data || []);
    } catch (err) {
      setError(err.message || "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  // ── Clinic search (apply mode) ────────────────────────────────────────────
  async function searchClinics(query) {
    setClinicQuery(query);
    if (!query.trim()) { setClinicResults([]); return; }
    setSearchingClinics(true);
    const { data } = await supabase
      .from("facilities")
      .select("id, name, district, province")
      .or(`name.ilike.%${query}%,district.ilike.%${query}%,province.ilike.%${query}%`)
      .limit(10);
    setSearchingClinics(false);
    setClinicResults(data || []);
  }

  // ── Apply submit ──────────────────────────────────────────────────────────
  async function handleApplySubmit(e) {
    e.preventDefault();
    setError("");

    if (!identity?.auth_provider || !identity?.provider_user_id) { setError("Missing authenticated identity."); return; }
    if (!form.name.trim())          { setError("Enter your first name.");   return; }
    if (!form.surname.trim())       { setError("Enter your surname.");      return; }
    if (!form.email.trim())         { setError("Enter your email.");        return; }
    if (!form.phone_number.trim())  { setError("Enter your phone number."); return; }
    if (!form.sex)                  { setError("Please select a gender.");  return; }
    if (!form.id_number.trim())     { setError("Enter your SA ID number."); return; }

    const dob = dobFromSAId(form.id_number.trim());
    if (!dob) { setError("The SA ID number does not contain a valid date of birth."); return; }
    if (!form.professional_id.trim()) { setError("Enter your employee number."); return; }
    if (!form.cv_url.trim())          { setError("Please provide your CV link.");  return; }
    if (!selectedClinic)              { setError("Please choose the clinic you work at."); return; }

    setSubmitting(true);

    const { error: err } = await supabase.from("role_applications").upsert(
      {
        auth_provider:    identity.auth_provider,
        provider_user_id: identity.provider_user_id,
        requested_role:   selectedRole || "staff",
        status:           "pending",
        name:             form.name.trim(),
        surname:          form.surname.trim(),
        email:            form.email.trim().toLowerCase(),
        phone_number:     form.phone_number.trim(),
        sex:              form.sex,
        id_number:        form.id_number.trim(),
        dob,
        professional_id:  form.professional_id.trim(),
        license_number:   form.license_number.trim() || null,
        clinic_id:        selectedClinic.id,
        clinic_name:      selectedClinic.name,
        cv_url:           form.cv_url.trim(),
        motivation:       form.motivation.trim() || null,
        submitted_at:     new Date().toISOString(),
      },
      { onConflict: "auth_provider,provider_user_id,requested_role" }
    );

    setSubmitting(false);
    if (err) { setError(err.message || "Could not submit application."); return; }
    if (onSubmitted) onSubmitted();
  }

  // ── Approve (review mode) ─────────────────────────────────────────────────
  async function approveApplication(application) {
    if (!profile?.id) return;
    setReviewingId(application.id);
    setError("");
    const now = new Date().toISOString();

    try {
      if (!application.auth_provider || !application.provider_user_id)
        throw new Error("Application is missing auth identity fields.");

      const profileRole = application.requested_role === "admin" ? "admin" : "staff";

      // Upsert applicant profile
      const { data: existing } = await supabase.from("profiles")
        .select("id").eq("auth_provider", application.auth_provider)
        .eq("provider_user_id", application.provider_user_id).maybeSingle();

      let profileId = existing?.id || null;

      if (profileId) {
        const { error: err } = await supabase.from("profiles").update({
          name: application.name || "", surname: application.surname || "",
          email: application.email || null, phone_number: application.phone_number || null,
          sex: application.sex || null, dob: application.dob || null,
          id_number: application.id_number || null, role: profileRole,
        }).eq("id", profileId);
        if (err) throw new Error(err.message);
      } else {
        const { data: inserted, error: err } = await supabase.from("profiles").insert({
          auth_provider: application.auth_provider,
          provider_user_id: application.provider_user_id,
          name: application.name || "", surname: application.surname || "",
          email: application.email || null, phone_number: application.phone_number || null,
          sex: application.sex || null, dob: application.dob || null,
          id_number: application.id_number || null, role: profileRole,
        }).select("id").single();
        if (err) throw new Error(err.message);
        profileId = inserted.id;
      }

      // Assign staff to clinic
      if (profileRole === "staff") {
        if (!application.clinic_id) throw new Error("Staff application is missing clinic.");

        const { data: existingAssignment } = await supabase
          .from("staff_assignments").select("id")
          .eq("profile_id", profileId).eq("facility_id", application.clinic_id).maybeSingle();

        if (existingAssignment) {
          const { error: err } = await supabase.from("staff_assignments")
            .update({ role: "nurse" }).eq("id", existingAssignment.id);
          if (err) throw new Error(err.message);
        } else {
          const { error: err } = await supabase.from("staff_assignments")
            .insert({ profile_id: profileId, facility_id: application.clinic_id, role: "nurse" });
          if (err) throw new Error(err.message);
        }
      }

      // Mark application approved
      const { error: err } = await supabase.from("role_applications")
        .update({ status: "approved", reviewed_by: profile.id, reviewed_at: now })
        .eq("id", application.id);
      if (err) throw new Error(err.message);

      if (onRoleUpdated) onRoleUpdated(profileId, profileRole);
      alert("Application approved.");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not approve application.");
    } finally {
      setReviewingId(null);
    }
  }

  // ── Reject (review mode) ──────────────────────────────────────────────────
  async function rejectApplication(applicationId) {
    if (!profile?.id) return;
    setReviewingId(applicationId);
    setError("");
    try {
      const { error: err } = await supabase.from("role_applications")
        .update({ status: "rejected", reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq("id", applicationId);
      if (err) throw new Error(err.message);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not reject application.");
    } finally {
      setReviewingId(null);
    }
  }

  // ── Apply mode render ─────────────────────────────────────────────────────
  if (isApplyMode) {
    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    return (
      <div style={ui.wrapper}>
        <div style={ui.card}>
          {onBack && (
            <button type="button" style={ui.secondaryBtn} onClick={onBack}>← Back</button>
          )}

          <h2 style={ui.title}>Staff Application</h2>
          <p style={ui.muted}>Complete your application for staff access.</p>

          {error && <p style={ui.error}>{error}</p>}

          <form onSubmit={handleApplySubmit} style={ui.form}>
            {/* Name */}
            <div style={ui.grid2}>
              <div>
                <label style={ui.label}>First Name</label>
                <input style={ui.input} value={form.name} onChange={set("name")} placeholder="Jane" />
              </div>
              <div>
                <label style={ui.label}>Surname</label>
                <input style={ui.input} value={form.surname} onChange={set("surname")} placeholder="Dlamini" />
              </div>
            </div>

            {/* Contact */}
            <div style={ui.grid2}>
              <div>
                <label style={ui.label}>Email</label>
                <input style={ui.input} type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
              </div>
              <div>
                <label style={ui.label}>Phone Number</label>
                <input style={ui.input} value={form.phone_number} onChange={set("phone_number")} placeholder="0821234567" />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label style={ui.label}>Gender</label>
              <div style={ui.genderWrap}>
                {["male", "female", "other"].map((g) => (
                  <button key={g} type="button"
                    style={{ ...ui.genderBtn, ...(form.sex === g ? ui.genderBtnActive : {}) }}
                    onClick={() => setForm((prev) => ({ ...prev, sex: g }))}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* ID + employee number */}
            <div style={ui.grid2}>
              <div>
                <label style={ui.label}>SA ID Number</label>
                <input style={ui.input} value={form.id_number}
                  onChange={(e) => setForm((p) => ({ ...p, id_number: e.target.value.replace(/\D/g, "") }))}
                  placeholder="13 digit ID number" maxLength={13} />
              </div>
              <div>
                <label style={ui.label}>Employee Number</label>
                <input style={ui.input} value={form.professional_id} onChange={set("professional_id")} placeholder="Employee number" />
              </div>
            </div>

            {/* License */}
            <div>
              <label style={ui.label}>License Number (optional)</label>
              <input style={ui.input} value={form.license_number} onChange={set("license_number")} placeholder="Professional license" />
            </div>

            {/* Clinic search */}
            <div>
              <label style={ui.label}>Clinic</label>
              <input style={ui.input}
                value={selectedClinic ? selectedClinic.name : clinicQuery}
                onChange={(e) => { setSelectedClinic(null); searchClinics(e.target.value); }}
                placeholder="Search clinic name" />

              {!selectedClinic && clinicResults.length > 0 && (
                <div style={ui.searchResults}>
                  {clinicResults.map((c) => (
                    <button key={c.id} type="button" style={ui.searchResultBtn}
                      onClick={() => { setSelectedClinic(c); setClinicQuery(c.name); setClinicResults([]); }}>
                      <strong>{c.name}</strong>
                      <span style={ui.searchSub}>{c.district || "—"}, {c.province || "—"}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchingClinics && <p style={ui.smallMuted}>Searching clinics…</p>}
              {selectedClinic && (
                <p style={ui.selectedClinic}>Selected: <strong>{selectedClinic.name}</strong></p>
              )}
            </div>

            {/* CV */}
            <div>
              <label style={ui.label}>CV Link</label>
              <input style={ui.input} value={form.cv_url} onChange={set("cv_url")} placeholder="Paste your CV link" />
            </div>

            {/* Motivation */}
            <div>
              <label style={ui.label}>Motivation</label>
              <textarea style={ui.textarea} rows={4} value={form.motivation} onChange={set("motivation")}
                placeholder="Why are you applying for this role?" />
            </div>

            <div style={ui.formActions}>
              <button type="submit" style={ui.primaryBtn} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Review mode render ────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div style={ui.wrapper}>
        <div style={ui.card}>
          <h2 style={ui.title}>Applications</h2>
          <p style={ui.muted}>No profile loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={ui.wrapper}>
      <div style={ui.card}>
        <div style={ui.headerRow}>
          <div>
            <h2 style={ui.title}>Role Applications</h2>
            <p style={ui.muted}>Review staff and admin access requests.</p>
          </div>
          <button style={ui.refreshBtn} onClick={loadData} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && <p style={ui.error}>{error}</p>}

        {loading ? (
          <p style={ui.muted}>Loading applications…</p>
        ) : allApplications.length === 0 ? (
          <p style={ui.muted}>No applications found.</p>
        ) : (
          <div style={ui.list}>
            {allApplications.map((app) => (
              <div key={app.id} style={ui.applicationCard}>
                <div style={ui.applicationTop}>
                  <div>
                    <p style={ui.appTitle}>
                      {`${app.name || ""} ${app.surname || ""}`.trim() || "Unnamed Applicant"}
                    </p>
                    <p style={ui.appMeta}>Requested role: <strong>{app.requested_role || "—"}</strong></p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div style={ui.appBody}>
                  {[
                    ["Name",            app.name],
                    ["Surname",         app.surname],
                    ["Gender",          app.sex],
                    ["Date of Birth",   app.dob],
                    ["SA ID Number",    app.id_number],
                    ["Employee Number", app.professional_id],
                    ["Email",           app.email],
                    ["Phone",           app.phone_number],
                    ["Clinic",          app.clinic_name],
                    ["License",         app.license_number],
                    ["Motivation",      app.motivation],
                    ["Submitted",       formatDateTime(app.submitted_at)],
                    ["Reviewed",        formatDateTime(app.reviewed_at)],
                  ].map(([label, val]) => (
                    <p key={label}><strong>{label}:</strong> {val || "—"}</p>
                  ))}
                  {app.cv_url && (
                    <p><strong>CV:</strong> <a href={app.cv_url} target="_blank" rel="noreferrer">View CV</a></p>
                  )}
                </div>

                {app.status === "pending" && (
                  <div style={ui.formActions}>
                    <button style={ui.rejectBtn} disabled={reviewingId === app.id}
                      onClick={() => rejectApplication(app.id)}>
                      {reviewingId === app.id ? "Processing…" : "Reject"}
                    </button>
                    <button style={ui.approveBtn} disabled={reviewingId === app.id}
                      onClick={() => approveApplication(app)}>
                      {reviewingId === app.id ? "Processing…" : "Approve"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ui = {
  wrapper:        { width: "100%" },
  card:           { background: "#fff", border: "1px solid #e8e7e3", borderRadius: 16,
                    padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,.05)" },
  headerRow:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    gap: 12, marginBottom: 18 },
  title:          { margin: 0, fontSize: 22, fontWeight: 700, color: "#111" },
  muted:          { margin: "6px 0 0", color: "#666", fontSize: 14, lineHeight: 1.5 },
  smallMuted:     { margin: "6px 0 0", color: "#777", fontSize: 12 },
  error:          { background: "#fef2f2", color: "#c0392b", border: "1px solid #fecaca",
                    borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13 },
  refreshBtn:     { background: "#fff", border: "1px solid #ddd", borderRadius: 10,
                    padding: "10px 14px", cursor: "pointer", fontWeight: 600 },
  form:           { border: "1px solid #eee", borderRadius: 14, padding: 16,
                    marginBottom: 22, background: "#fafafa" },
  grid2:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label:          { display: "block", marginBottom: 6, marginTop: 10, fontSize: 12, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".5px", color: "#444" },
  input:          { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
                    border: "1.5px solid #ddd", fontSize: 14, background: "#fff", outline: "none" },
  textarea:       { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
                    border: "1.5px solid #ddd", fontSize: 14, background: "#fff", outline: "none",
                    resize: "vertical" },
  genderWrap:     { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  genderBtn:      { padding: "8px 14px", borderRadius: 20, border: "1.5px solid #ddd",
                    background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#444" },
  genderBtnActive:{ background: "#111", color: "#fff", borderColor: "#111" },
  searchResults:  { border: "1px solid #e5e5e5", borderRadius: 10, background: "#fff",
                    marginTop: 8, overflow: "hidden" },
  searchResultBtn:{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column",
                    gap: 3, padding: "10px 12px", border: "none", background: "#fff",
                    cursor: "pointer", borderBottom: "1px solid #f0f0f0" },
  searchSub:      { fontSize: 12, color: "#777" },
  selectedClinic: { margin: "8px 0 0", fontSize: 13, color: "#1d9e75" },
  formActions:    { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14, flexWrap: "wrap" },
  primaryBtn:     { border: "none", background: "#111", color: "#fff", borderRadius: 10,
                    padding: "10px 16px", fontWeight: 700, cursor: "pointer" },
  secondaryBtn:   { border: "1px solid #ddd", background: "#fff", color: "#111", borderRadius: 10,
                    padding: "10px 16px", fontWeight: 700, cursor: "pointer", marginBottom: 16 },
  approveBtn:     { border: "none", background: "#1d9e75", color: "#fff", borderRadius: 10,
                    padding: "10px 16px", fontWeight: 700, cursor: "pointer" },
  rejectBtn:      { border: "none", background: "#c0392b", color: "#fff", borderRadius: 10,
                    padding: "10px 16px", fontWeight: 700, cursor: "pointer" },
  list:           { display: "grid", gap: 14 },
  applicationCard:{ border: "1px solid #e8e8e8", borderRadius: 14, padding: 16, background: "#fff" },
  applicationTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    gap: 12, marginBottom: 10 },
  appTitle:       { margin: 0, fontWeight: 700, fontSize: 16, color: "#111" },
  appMeta:        { margin: "4px 0 0", fontSize: 13, color: "#666" },
  appBody:        { display: "grid", gap: 6, fontSize: 14, color: "#333" },
};