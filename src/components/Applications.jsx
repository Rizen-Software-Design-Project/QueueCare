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
import "./Applications.css";


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
  const statusClass = ["pending", "approved", "rejected"].includes(status)
    ? `status-badge--${status}`
    : "status-badge--unknown";

  return (
    <span className={`status-badge ${statusClass}`}>
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

  const [loading,          setLoading]         = useState(!isApplyMode);
  const [submitting,       setSubmitting]       = useState(false);
  const [reviewingId,      setReviewingId]      = useState(null);
  const [error,            setError]            = useState("");
  const [allApplications,  setAllApplications]  = useState([]);

  // Clinic search state (apply mode)
  const [clinicQuery,      setClinicQuery]      = useState("");
  const [clinicResults,    setClinicResults]    = useState([]);
  const [selectedClinic,   setSelectedClinic]   = useState(null);
  const [searchingClinics, setSearchingClinics] = useState(false);

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
        name:         prev.name         || identity.name   || "",
        surname:      prev.surname      || identity.surname || "",
        email:        prev.email        || identity.email   || "",
        phone_number: prev.phone_number || identity.phone  || "",
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
    if (!form.name.trim())         { setError("Enter your first name.");   return; }
    if (!form.surname.trim())      { setError("Enter your surname.");      return; }
    if (!form.email.trim())        { setError("Enter your email.");        return; }
    if (!form.phone_number.trim()) { setError("Enter your phone number."); return; }
    if (!form.sex)                 { setError("Please select a gender.");  return; }
    if (!form.id_number.trim())    { setError("Enter your SA ID number."); return; }

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
          auth_provider:    application.auth_provider,
          provider_user_id: application.provider_user_id,
          name:             application.name    || "",
          surname:          application.surname || "",
          email:            application.email        || null,
          phone_number:     application.phone_number || null,
          sex:              application.sex  || null,
          dob:              application.dob  || null,
          id_number:        application.id_number || null,
          role:             profileRole,
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
      <div className="app-wrapper">
        <div className="app-card">
          {onBack && (
            <button type="button" className="app-btn-secondary" onClick={onBack}>← Back</button>
          )}

          <h2 className="app-title">Staff Application</h2>
          <p className="app-muted">Complete your application for staff access.</p>

          {error && <p className="app-error">{error}</p>}

          <form onSubmit={handleApplySubmit} className="app-form">
            {/* Name */}
            <div className="app-grid-2">
              <div>
                <label className="app-label">First Name</label>
                <input className="app-input" value={form.name} onChange={set("name")} placeholder="Jane" />
              </div>
              <div>
                <label className="app-label">Surname</label>
                <input className="app-input" value={form.surname} onChange={set("surname")} placeholder="Dlamini" />
              </div>
            </div>

            {/* Contact */}
            <div className="app-grid-2">
              <div>
                <label className="app-label">Email</label>
                <input className="app-input" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
              </div>
              <div>
                <label className="app-label">Phone Number</label>
                <input className="app-input" value={form.phone_number} onChange={set("phone_number")} placeholder="0821234567" />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="app-label">Gender</label>
              <div className="app-gender-wrap">
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`app-gender-btn${form.sex === g ? " app-gender-btn--active" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, sex: g }))}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* ID + employee number */}
            <div className="app-grid-2">
              <div>
                <label className="app-label">SA ID Number</label>
                <input
                  className="app-input"
                  value={form.id_number}
                  onChange={(e) => setForm((p) => ({ ...p, id_number: e.target.value.replace(/\D/g, "") }))}
                  placeholder="13 digit ID number"
                  maxLength={13}
                />
              </div>
              <div>
                <label className="app-label">Employee Number</label>
                <input className="app-input" value={form.professional_id} onChange={set("professional_id")} placeholder="Employee number" />
              </div>
            </div>

            {/* License */}
            <div>
              <label className="app-label">License Number (optional)</label>
              <input className="app-input" value={form.license_number} onChange={set("license_number")} placeholder="Professional license" />
            </div>

            {/* Clinic search */}
            <div>
              <label className="app-label">Clinic</label>
              <input
                className="app-input"
                value={selectedClinic ? selectedClinic.name : clinicQuery}
                onChange={(e) => { setSelectedClinic(null); searchClinics(e.target.value); }}
                placeholder="Search clinic name"
              />

              {!selectedClinic && clinicResults.length > 0 && (
                <div className="app-search-results">
                  {clinicResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="app-search-result-btn"
                      onClick={() => { setSelectedClinic(c); setClinicQuery(c.name); setClinicResults([]); }}
                    >
                      <strong>{c.name}</strong>
                      <span className="app-search-sub">{c.district || "—"}, {c.province || "—"}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchingClinics && <p className="app-muted-small">Searching clinics…</p>}
              {selectedClinic && (
                <p className="app-selected-clinic">Selected: <strong>{selectedClinic.name}</strong></p>
              )}
            </div>

            {/* CV */}
            <div>
              <label className="app-label">CV Link</label>
              <input className="app-input" value={form.cv_url} onChange={set("cv_url")} placeholder="Paste your CV link" />
            </div>

            {/* Motivation */}
            <div>
              <label className="app-label">Motivation</label>
              <textarea
                className="app-textarea"
                rows={4}
                value={form.motivation}
                onChange={set("motivation")}
                placeholder="Why are you applying for this role?"
              />
            </div>

            <div className="app-form-actions">
              <button type="submit" className="app-btn-primary" disabled={submitting}>
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
      <div className="app-wrapper">
        <div className="app-card">
          <h2 className="app-title">Applications</h2>
          <p className="app-muted">No profile loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="app-card">
        <div className="app-header-row">
          <div>
            <h2 className="app-title">Role Applications</h2>
            <p className="app-muted">Review staff and admin access requests.</p>
          </div>
          <button className="app-btn-refresh" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && <p className="app-error">{error}</p>}

        {loading ? (
          <p className="app-muted">Loading applications…</p>
        ) : allApplications.length === 0 ? (
          <p className="app-muted">No applications found.</p>
        ) : (
          <div className="app-list">
            {allApplications.map((app) => (
              <div key={app.id} className="app-application-card">
                <div className="app-application-top">
                  <div>
                    <p className="app-app-title">
                      {`${app.name || ""} ${app.surname || ""}`.trim() || "Unnamed Applicant"}
                    </p>
                    <p className="app-app-meta">Requested role: <strong>{app.requested_role || "—"}</strong></p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="app-app-body">
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
                  <div className="app-form-actions">
                    <button
                      className="app-btn-reject"
                      disabled={reviewingId === app.id}
                      onClick={() => rejectApplication(app.id)}
                    >
                      {reviewingId === app.id ? "Processing…" : "Reject"}
                    </button>
                    <button
                      className="app-btn-approve"
                      disabled={reviewingId === app.id}
                      onClick={() => approveApplication(app)}
                    >
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