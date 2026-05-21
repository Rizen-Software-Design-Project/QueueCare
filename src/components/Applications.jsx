// This page handles two things: staff can apply for a job at a clinic, and admins can review those applications.

import { useEffect, useState } from "react";
import { supabase } from "#lib/supabase";
import "./Applications.css";

const API_BASE = import.meta.env.VITE_API_BASE || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";


// Small helper functions used across this file
function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSAPhone(phone) {
  return /^0[6-8][0-9]{8}$/.test(phone) || /^\+27[6-8][0-9]{8}$/.test(phone);
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

// A little coloured badge showing whether an application is pending, approved, or rejected
function StatusBadge({ status }) {
  const statusClass = ["pending", "approved", "rejected"].includes(status)
    ? `status-badge--${status}`
    : "status-badge--unknown";

  return (
    <mark className={`status-badge ${statusClass}`}>
      {status || "unknown"}
    </mark>
  );
}

// The main Applications page component
export default function Applications({
  profile      = null,
  onRoleUpdated,
  mode         = "review",
  identity     = null,
  selectedRole = "staff",
  onSubmitted,
  onBack,
}) {
  const isApplyMode = mode === "apply";
  const isAdmin     = !isApplyMode && profile?.role === "admin";

  const [loading,          setLoading]         = useState(!isApplyMode);
  const [submitting,       setSubmitting]       = useState(false);
  const [reviewingId,      setReviewingId]      = useState(null);
  const [error,            setError]            = useState("");
  const [allApplications,  setAllApplications]  = useState([]);
  const [cvFile,           setCvFile]           = useState(null);
  const [clinicQuery,      setClinicQuery]      = useState("");
  const [clinicResults,    setClinicResults]    = useState([]);
  const [selectedClinic,   setSelectedClinic]   = useState(null);
  const [searchingClinics, setSearchingClinics] = useState(false);

  const [form, setForm] = useState({
    name: "", surname: "", email: "", phone_number: "",
    sex: "", id_number: "", professional_id: "",
    license_number: "", motivation: "",
  });

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

  useEffect(() => {
    if (!isApplyMode) loadData();
  }, [isApplyMode, profile?.id]);

  // Load all submitted applications from the database so the admin can review them
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

  // Let the applicant search for a clinic they want to work at
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

  // Send the application to the database when the form is submitted
  async function handleApplySubmit(e) {
    e.preventDefault();
    setError("");

    const email    = form.email.trim().toLowerCase();
    const phone    = form.phone_number.trim();
    const idNumber = form.id_number.trim();

    if (!identity?.auth_provider || !identity?.provider_user_id) { setError("Missing authenticated identity."); return; }
    if (!form.name.trim() || form.name.trim().length < 2)         { setError("First name must be at least 2 characters."); return; }
    if (!/^[a-zA-Z\s'-]+$/.test(form.name.trim()))                { setError("First name contains invalid characters."); return; }
    if (!form.surname.trim() || form.surname.trim().length < 2)   { setError("Surname must be at least 2 characters."); return; }
    if (!/^[a-zA-Z\s'-]+$/.test(form.surname.trim()))             { setError("Surname contains invalid characters."); return; }
    if (!isValidEmail(email))                                      { setError("Enter a valid email address."); return; }
    if (!isValidSAPhone(phone))                                    { setError("Enter a valid South African phone number, e.g. 0821234567."); return; }
    if (!form.sex)                                                 { setError("Please select a gender."); return; }
    if (!/^\d{13}$/.test(idNumber))                               { setError("SA ID number must be exactly 13 digits."); return; }

    const dob = dobFromSAId(idNumber);
    if (!dob) { setError("The SA ID number does not contain a valid date of birth."); return; }

    const today     = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
    if (!hasBirthdayPassed) age--;
    if (age < 18) { setError("Applicants must be at least 18 years old."); return; }

    if (!form.professional_id.trim() || form.professional_id.trim().length < 5) { setError("Employee number must be at least 5 characters."); return; }
    if (!/^[A-Za-z0-9-]+$/.test(form.professional_id.trim()))                   { setError("Employee number contains invalid characters."); return; }

    if (form.license_number.trim()) {
      if (form.license_number.trim().length < 5)                       { setError("License number must be at least 5 characters if provided."); return; }
      if (!/^[A-Za-z0-9-]+$/.test(form.license_number.trim()))         { setError("License number contains invalid characters."); return; }
    }

    if (!cvFile)                                                         { setError("Please upload your CV document."); return; }
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(cvFile.type))                             { setError("CV must be a PDF, DOC, or DOCX file."); return; }
    if (cvFile.size > 2 * 1024 * 1024)                                  { setError("CV file must be smaller than 2MB."); return; }
    if (!selectedClinic)                                                 { setError("Please choose the clinic you work at."); return; }

    setSubmitting(true);
    const fileExt  = cvFile.name.split(".").pop();
    const safeExt  = fileExt.toLowerCase().replace(/[^a-z0-9]/g, "");
    const filePath = `staff-applications/${identity.provider_user_id}-${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage.from("application-documents").upload(filePath, cvFile);
    if (uploadError) { setError(uploadError.message || "Could not upload CV."); setSubmitting(false); return; }

    const { data: publicUrlData } = supabase.storage.from("application-documents").getPublicUrl(filePath);
    const uploadedCvUrl = publicUrlData.publicUrl;

    const { error: err } = await supabase.from("role_applications").upsert(
      {
        auth_provider:    identity.auth_provider,
        provider_user_id: identity.provider_user_id,
        requested_role:   selectedRole || "staff",
        status:           "pending",
        name:             form.name.trim(),
        surname:          form.surname.trim(),
        email,
        phone_number:     phone,
        sex:              form.sex,
        id_number:        idNumber,
        dob,
        professional_id:  form.professional_id.trim(),
        license_number:   form.license_number.trim() || null,
        clinic_id:        selectedClinic.id,
        clinic_name:      selectedClinic.name,
        cv_url:           uploadedCvUrl,
        motivation:       form.motivation.trim() || null,
        submitted_at:     new Date().toISOString(),
      },
      { onConflict: "auth_provider,provider_user_id,requested_role" }
    );

    setSubmitting(false);
    if (err) { setError(err.message || "Could not submit application."); return; }

    fetch(`${API_BASE}/notify/application/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email.trim().toLowerCase(), name: form.name.trim(), role: "staff", status: "submitted" }),
    }).catch(err => console.warn("Application email failed:", err.message));

    if (onSubmitted) onSubmitted();
  }

  // The admin clicks Approve - this saves the decision and sets up the staff account
  async function approveApplication(application) {
    if (!profile?.id) return;
    setReviewingId(application.id);
    setError("");
    const now = new Date().toISOString();

    try {
      if (!application.auth_provider || !application.provider_user_id)
        throw new Error("Application is missing auth identity fields.");

      const profileRole = application.requested_role === "admin" ? "admin" : "staff";

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

      const { error: err } = await supabase
        .from("role_applications")
        .update({ status: "approved", reviewed_by: profile.id, reviewed_at: now })
        .eq("id", application.id);
      if (err) throw new Error(err.message);

      setAllApplications((prev) =>
        prev.map((app) =>
          app.id === application.id
            ? { ...app, status: "approved", reviewed_by: profile.id, reviewed_at: now }
            : app
        )
      );

      fetch(`${API_BASE}/notify/application/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: application.email, name: application.name, role: application.requested_role, status: "approved" }),
      }).catch(err => console.warn("Approval email failed:", err.message));

      if (onRoleUpdated) onRoleUpdated(profileId, profileRole);
      alert("Application approved.");
    } catch (err) {
      setError(err.message || "Could not approve application.");
    } finally {
      setReviewingId(null);
    }
  }

  // The admin clicks Reject - this marks the application as declined
  async function rejectApplication(application) {
    if (!profile?.id) return;
    setReviewingId(application.id);
    setError("");

    try {
      const { error: err } = await supabase
        .from("role_applications")
        .update({ status: "rejected", reviewed_by: profile.id, reviewed_at: new Date().toISOString() })
        .eq("id", application.id);
      if (err) throw new Error(err.message);

      fetch(`${API_BASE}/notify/application/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: application.email, name: application.name, role: application.requested_role, status: "rejected" }),
      }).catch((err) => console.warn("Rejection email failed:", err.message));

      setAllApplications((prev) =>
        prev.map((app) =>
          app.id === application.id
            ? { ...app, status: "rejected", reviewed_by: profile.id, reviewed_at: new Date().toISOString() }
            : app
        )
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Could not reject application.");
    } finally {
      setReviewingId(null);
    }
  }

  // Draw the form that staff fill in to apply for a job
  if (isApplyMode) {
    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    return (
      <main className="app-wrapper">
        <article className="app-card">
          {onBack && (
            <button type="button" className="app-btn-secondary" onClick={onBack}>← Back</button>
          )}

          <h2 className="app-title">Staff Application</h2>
          <p className="app-muted">Complete your application for staff access.</p>

          {error && <p role="alert" className="app-error">{error}</p>}

          <form onSubmit={handleApplySubmit} className="app-form">
            {/* The applicant's name fields */}
            <fieldset className="app-grid-2">
              <legend className="sr-only">Full name</legend>
              <section>
                <label className="app-label" htmlFor="field-name">First Name</label>
                <input id="field-name" className="app-input" value={form.name} onChange={set("name")} placeholder="Jane" />
              </section>
              <section>
                <label className="app-label" htmlFor="field-surname">Surname</label>
                <input id="field-surname" className="app-input" value={form.surname} onChange={set("surname")} placeholder="Dlamini" />
              </section>
            </fieldset>

            {/* The applicant's email and phone number */}
            <fieldset className="app-grid-2">
              <legend className="sr-only">Contact details</legend>
              <section>
                <label className="app-label" htmlFor="field-email">Email</label>
                <input id="field-email" className="app-input" type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
              </section>
              <section>
                <label className="app-label" htmlFor="field-phone">Phone Number</label>
                <input id="field-phone" className="app-input" value={form.phone_number} onChange={set("phone_number")} placeholder="0821234567" />
              </section>
            </fieldset>

            {/* Gender dropdown */}
            <fieldset>
              <legend className="app-label">Gender</legend>
              <section className="app-gender-wrap">
                {["male", "female", "other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`app-gender-btn${form.sex === g ? " app-gender-btn--active" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, sex: g }))}
                    aria-pressed={form.sex === g}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </section>
            </fieldset>

            {/* ID number and employee number fields */}
            <fieldset className="app-grid-2">
              <legend className="sr-only">Identity and employment</legend>
              <section>
                <label className="app-label" htmlFor="field-id">SA ID Number</label>
                <input
                  id="field-id"
                  className="app-input"
                  value={form.id_number}
                  onChange={(e) => setForm((p) => ({ ...p, id_number: e.target.value.replace(/\D/g, "") }))}
                  placeholder="13 digit ID number"
                  maxLength={13}
                />
              </section>
              <section>
                <label className="app-label" htmlFor="field-emp">Employee Number</label>
                <input id="field-emp" className="app-input" value={form.professional_id} onChange={set("professional_id")} placeholder="Employee number" />
              </section>
            </fieldset>

            {/* The applicant's medical license number */}
            <section>
              <label className="app-label" htmlFor="field-license">License Number <section className="app-muted">(optional)</section></label>
              <input id="field-license" className="app-input" value={form.license_number} onChange={set("license_number")} placeholder="Professional license" />
            </section>

            {/* Search box for finding the clinic to apply to */}
            <section>
              <label className="app-label" htmlFor="field-clinic">Clinic</label>
              <input
                id="field-clinic"
                className="app-input"
                value={selectedClinic ? selectedClinic.name : clinicQuery}
                onChange={(e) => { setSelectedClinic(null); searchClinics(e.target.value); }}
                placeholder="Search clinic name"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={!selectedClinic && clinicResults.length > 0}
              />

              {!selectedClinic && clinicResults.length > 0 && (
                <ul className="app-search-results" role="listbox">
                  {clinicResults.map((c) => (
                    <li key={c.id} role="option">
                      <button
                        type="button"
                        className="app-search-result-btn"
                        onClick={() => { setSelectedClinic(c); setClinicQuery(c.name); setClinicResults([]); }}
                      >
                        <strong>{c.name}</strong>
                        <section className="app-search-sub">{c.district || "—"}, {c.province || "—"}</section>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchingClinics && <p className="app-muted-small">Searching clinics…</p>}
              {selectedClinic && (
                <p className="app-selected-clinic">Selected: <strong>{selectedClinic.name}</strong></p>
              )}
            </section>

            {/* Upload a CV document */}
            <section>
              <label className="app-label" htmlFor="field-cv">Upload CV</label>
              <input
                id="field-cv"
                className="app-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              />
              {cvFile && (
                <p className="app-muted-small">Selected file: {cvFile.name}</p>
              )}
            </section>

            {/* Why the applicant wants to work here */}
            <section>
              <label className="app-label" htmlFor="field-motivation">Motivation</label>
              <textarea
                id="field-motivation"
                className="app-textarea"
                rows={4}
                value={form.motivation}
                onChange={set("motivation")}
                placeholder="Why are you applying for this role?"
              />
            </section>

            <section className="app-form-actions">
              <button
                type="submit"
                className="app-btn-primary"
                disabled={submitting || !selectedClinic || !cvFile}
              >
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </section>
          </form>
        </article>
      </main>
    );
  }

  // Draw the list of applications the admin needs to approve or reject
  if (!profile) {
    return (
      <main className="app-wrapper">
        <article className="app-card">
          <h2 className="app-title">Applications</h2>
          <p className="app-muted">No profile loaded.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="app-wrapper">
      <section className="app-card">
        <header className="app-header-row">
          <section>
            <h2 className="app-title">Role Applications</h2>
            <p className="app-muted">Review staff and admin access requests.</p>
          </section>
          <button className="app-btn-refresh" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </header>

        {error && <p role="alert" className="app-error">{error}</p>}

        {loading ? (
          <p className="app-muted">Loading applications…</p>
        ) : allApplications.length === 0 ? (
          <p className="app-muted">No applications found.</p>
        ) : (
          <ul className="app-list">
            {allApplications.map((app) => (
              <li key={app.id}>
                <article className="app-application-card">
                  <header className="app-application-top">
                    <div className="app-applicant-info">
                      <div className="app-applicant-avatar" aria-hidden="true">
                        {(app.name?.[0] || "?")}{(app.surname?.[0] || "")}
                      </div>
                      <div>
                        <p className="app-app-title">
                          {`${app.name || ""} ${app.surname || ""}`.trim() || "Unnamed Applicant"}
                        </p>
                        <p className="app-app-meta">
                          Role: <strong>{app.requested_role || "—"}</strong>
                          {" · "}Submitted {formatDateTime(app.submitted_at)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </header>

                  <dl className="app-app-body">
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
                      ["Submitted",       formatDateTime(app.submitted_at)],
                      ["Reviewed",        formatDateTime(app.reviewed_at)],
                    ].map(([label, val]) => (
                      <section key={label}>
                        <dt>{label}</dt>
                        <dd>{val || "—"}</dd>
                      </section>
                    ))}
                    {app.motivation && (
                      <section className="app-field-full">
                        <dt>Motivation</dt>
                        <dd>{app.motivation}</dd>
                      </section>
                    )}
                    {app.cv_url && (
                      <section className="app-field-full">
                        <dt>CV</dt>
                        <dd>
                          <a className="app-cv-link" href={app.cv_url} target="_blank" rel="noreferrer">
                            View submitted CV
                          </a>
                        </dd>
                      </section>
                    )}
                  </dl>

                  {app.status === "pending" && (
                    <footer className="app-review-footer">
                      <button
                        className="app-btn-reject"
                        disabled={reviewingId === app.id}
                        onClick={() => rejectApplication(app)}
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
                    </footer>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}