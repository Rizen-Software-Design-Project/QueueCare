import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const stylesByStatus = {
    pending: {
      background: "#fff8e1",
      color: "#e65100",
      border: "1px solid #ffe0b2",
    },
    approved: {
      background: "#e8f5e9",
      color: "#2e7d32",
      border: "1px solid #c8e6c9",
    },
    rejected: {
      background: "#fdecea",
      color: "#c62828",
      border: "1px solid #f5c6cb",
    },
  };

  const s = stylesByStatus[status] || {
    background: "#f5f5f5",
    color: "#555",
    border: "1px solid #ddd",
  };

  return (
    <span
      style={{
        ...s,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function Application({ profile, onRoleUpdated }) {
  const isAdmin = profile?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState("");

  const [applicationType, setApplicationType] = useState("");
  const [myApplications, setMyApplications] = useState([]);
  const [allApplications, setAllApplications] = useState([]);

  const [clinicQuery, setClinicQuery] = useState("");
  const [clinicResults, setClinicResults] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [searchingClinics, setSearchingClinics] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    professional_id: "",
    license_number: "",
    motivation: "",
  });

  const canApplyForStaff = useMemo(
    () => profile?.role === "patient" || profile?.role === "admin",
    [profile?.role]
  );

  const canApplyForAdmin = useMemo(
    () => profile?.role === "patient" || profile?.role === "staff",
    [profile?.role]
  );

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    setForm((prev) => ({
      ...prev,
      full_name:
        prev.full_name ||
        [profile?.name, profile?.surname].filter(Boolean).join(" "),
      email: prev.email || profile?.email || "",
      phone_number: prev.phone_number || profile?.phone_number || "",
    }));

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role]);

  async function loadData() {
    if (!profile?.id) return;

    setLoading(true);
    setError("");

    try {
      if (isAdmin) {
        const { data, error: appErr } = await supabase
          .from("role_applications")
          .select("*")
          .order("created_at", { ascending: false });

        if (appErr) throw appErr;
        setAllApplications(data || []);
      } else {
        const { data, error: appErr } = await supabase
          .from("role_applications")
          .select("*")
          .eq("profile_id", profile.id)
          .order("created_at", { ascending: false });

        if (appErr) throw appErr;
        setMyApplications(data || []);
      }
    } catch (err) {
      setError(err.message || "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }

  async function searchClinics(query) {
    setClinicQuery(query);

    if (!query.trim()) {
      setClinicResults([]);
      return;
    }

    setSearchingClinics(true);

    const { data, error } = await supabase
      .from("facilities")
      .select("id, name, district, province")
      .or(`name.ilike.%${query}%,district.ilike.%${query}%,province.ilike.%${query}%`)
      .limit(10);

    setSearchingClinics(false);

    if (error) {
      setClinicResults([]);
      return;
    }

    setClinicResults(data || []);
  }

  function resetForm() {
    setApplicationType("");
    setClinicQuery("");
    setClinicResults([]);
    setSelectedClinic(null);
    setForm({
      full_name: [profile?.name, profile?.surname].filter(Boolean).join(" "),
      email: profile?.email || "",
      phone_number: profile?.phone_number || "",
      professional_id: "",
      license_number: "",
      motivation: "",
    });
  }

  async function handleSubmitApplication(e) {
    e.preventDefault();
    setError("");

    if (!profile?.id) {
      setError("Missing profile.");
      return;
    }

    if (!applicationType) {
      setError("Choose the role you want to apply for.");
      return;
    }

    if (!form.full_name.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (!form.phone_number.trim()) {
      setError("Enter your phone number.");
      return;
    }

    if (!form.professional_id.trim()) {
      setError("Enter your professional or employee ID.");
      return;
    }

    if (!selectedClinic) {
      setError("Please choose the clinic you work at.");
      return;
    }

    setSubmitting(true);

    const payload = {
      profile_id: profile.id,
      requested_role: applicationType,
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone_number: form.phone_number.trim(),
      professional_id: form.professional_id.trim(),
      license_number: form.license_number.trim() || null,
      clinic_id: selectedClinic.id,
      clinic_name: selectedClinic.name,
      motivation: form.motivation.trim() || null,
      status: "pending",
    };

    const { error: insertErr } = await supabase
      .from("role_applications")
      .insert(payload);

    setSubmitting(false);

    if (insertErr) {
      setError(insertErr.message || "Could not submit application.");
      return;
    }

    resetForm();
    await loadData();
  }

 async function approveApplication(application) {
  setReviewingId(application.id);

  const now = new Date().toISOString();

  const { error: appError } = await supabase
    .from("role_applications")
    .update({
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: now,
    })
    .eq("id", application.id);

  if (appError) {
    alert(appError.message || "Could not approve application.");
    setReviewingId(null);
    return;
  }

  const profileRole =
    application.requested_role === "admin" ? "admin" : "staff";

  const { error: roleError } = await supabase
    .from("profiles")
    .update({
      role: profileRole,
    })
    .eq("id", application.profile_id);

  if (roleError) {
    alert(roleError.message || "Role update failed.");
    setReviewingId(null);
    return;
  }

  const staffRole =
    application.requested_role === "admin" ? "admin" : "nurse";

  const { data: existingAssignment, error: existingAssignmentError } = await supabase
    .from("staff_assignments")
    .select("id")
    .eq("profile_id", application.profile_id)
    .eq("facility_id", application.clinic_id)
    .maybeSingle();

  if (existingAssignmentError) {
    alert(existingAssignmentError.message || "Could not check staff assignment.");
    setReviewingId(null);
    return;
  }

  let assignmentError = null;

  if (existingAssignment) {
    const { error } = await supabase
      .from("staff_assignments")
      .update({
        role: staffRole,
      })
      .eq("id", existingAssignment.id);

    assignmentError = error;
  } else {
    const { error } = await supabase
      .from("staff_assignments")
      .insert({
        profile_id: application.profile_id,
        facility_id: application.clinic_id,
        role: staffRole,
      });

    assignmentError = error;
  }

  if (assignmentError) {
    alert(assignmentError.message || "Staff assignment failed.");
    setReviewingId(null);
    return;
  }

  setReviewingId(null);

  alert("Application approved.");

  if (onRoleUpdated) {
    onRoleUpdated(application.profile_id, profileRole);
  }

  await loadData();
}


  async function rejectApplication(applicationId) {
    if (!profile?.id) return;

    setReviewingId(applicationId);
    setError("");

    const { error: rejectErr } = await supabase
      .from("role_applications")
      .update({
        status: "rejected",
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    setReviewingId(null);

    if (rejectErr) {
      setError(rejectErr.message || "Could not reject application.");
      return;
    }

    await loadData();
  }

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
            <h2 style={ui.title}>
              {isAdmin ? "Role Applications" : "Applications"}
            </h2>
            <p style={ui.muted}>
              {isAdmin
                ? "Review staff and admin access requests."
                : "Apply for a higher access role."}
            </p>
          </div>

          <button style={ui.refreshBtn} onClick={loadData} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error ? <p style={ui.error}>{error}</p> : null}

        {!isAdmin && (
          <>
            <div style={ui.actionRow}>
              {canApplyForStaff && (
                <button
                  type="button"
                  style={{
                    ...ui.roleBtn,
                    ...(applicationType === "staff" ? ui.roleBtnActive : {}),
                  }}
                  onClick={() => {
                    setApplicationType("staff");
                    setError("");
                  }}
                >
                  Apply for Staff
                </button>
              )}

              {canApplyForAdmin && (
                <button
                  type="button"
                  style={{
                    ...ui.roleBtn,
                    ...(applicationType === "admin" ? ui.roleBtnActive : {}),
                  }}
                  onClick={() => {
                    setApplicationType("admin");
                    setError("");
                  }}
                >
                  Apply for Admin
                </button>
              )}
            </div>

            {applicationType && (
              <form onSubmit={handleSubmitApplication} style={ui.form}>
                <div style={ui.grid2}>
                  <div>
                    <label style={ui.label}>Full Name</label>
                    <input
                      style={ui.input}
                      value={form.full_name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      placeholder="Jane Dlamini"
                    />
                  </div>

                  <div>
                    <label style={ui.label}>Email</label>
                    <input
                      style={ui.input}
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div style={ui.grid2}>
                  <div>
                    <label style={ui.label}>Phone Number</label>
                    <input
                      style={ui.input}
                      value={form.phone_number}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          phone_number: e.target.value,
                        }))
                      }
                      placeholder="0821234567"
                    />
                  </div>

                  <div>
                    <label style={ui.label}>
                      {applicationType === "admin"
                        ? "Employee / Admin ID"
                        : "Professional / Employee ID"}
                    </label>
                    <input
                      style={ui.input}
                      value={form.professional_id}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          professional_id: e.target.value,
                        }))
                      }
                      placeholder="ID number"
                    />
                  </div>
                </div>

                <div>
                  <label style={ui.label}>License Number (optional)</label>
                  <input
                    style={ui.input}
                    value={form.license_number}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        license_number: e.target.value,
                      }))
                    }
                    placeholder="Nursing / professional license"
                  />
                </div>

                <div>
                  <label style={ui.label}>Clinic</label>
                  <input
                    style={ui.input}
                    value={selectedClinic ? selectedClinic.name : clinicQuery}
                    onChange={(e) => {
                      setSelectedClinic(null);
                      searchClinics(e.target.value);
                    }}
                    placeholder="Search clinic name"
                  />

                  {!selectedClinic && clinicResults.length > 0 && (
                    <div style={ui.searchResults}>
                      {clinicResults.map((clinic) => (
                        <button
                          key={clinic.id}
                          type="button"
                          style={ui.searchResultBtn}
                          onClick={() => {
                            setSelectedClinic(clinic);
                            setClinicQuery(clinic.name);
                            setClinicResults([]);
                          }}
                        >
                          <strong>{clinic.name}</strong>
                          <span style={ui.searchSub}>
                            {clinic.district || "—"}, {clinic.province || "—"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchingClinics && (
                    <p style={ui.smallMuted}>Searching clinics…</p>
                  )}

                  {selectedClinic && (
                    <p style={ui.selectedClinic}>
                      Selected clinic: <strong>{selectedClinic.name}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label style={ui.label}>Motivation</label>
                  <textarea
                    style={ui.textarea}
                    rows={4}
                    value={form.motivation}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        motivation: e.target.value,
                      }))
                    }
                    placeholder="Why are you applying for this role?"
                  />
                </div>

                <div style={ui.formActions}>
                  <button
                    type="button"
                    style={ui.secondaryBtn}
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    style={ui.primaryBtn}
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : "Send Application"}
                  </button>
                </div>
              </form>
            )}

            <div style={ui.sectionBlock}>
              <h3 style={ui.subTitle}>My Applications</h3>

              {loading ? (
                <p style={ui.muted}>Loading applications…</p>
              ) : myApplications.length === 0 ? (
                <p style={ui.muted}>No applications submitted yet.</p>
              ) : (
                <div style={ui.list}>
                  {myApplications.map((app) => (
                    <div key={app.id} style={ui.applicationCard}>
                      <div style={ui.applicationTop}>
                        <div>
                          <p style={ui.appTitle}>
                            {app.requested_role === "admin"
                              ? "Admin Application"
                              : "Staff Application"}
                          </p>
                          <p style={ui.appMeta}>
                            Submitted: {formatDateTime(app.created_at)}
                          </p>
                        </div>

                        <StatusBadge status={app.status} />
                      </div>

                      <div style={ui.appBody}>
                        <p>
                          <strong>Clinic:</strong> {app.clinic_name || "—"}
                        </p>
                        <p>
                          <strong>Professional ID:</strong>{" "}
                          {app.professional_id || "—"}
                        </p>
                        <p>
                          <strong>License:</strong> {app.license_number || "—"}
                        </p>
                        <p>
                          <strong>Motivation:</strong> {app.motivation || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {isAdmin && (
          <div style={ui.sectionBlock}>
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
                          {app.full_name || "Unnamed Applicant"}
                        </p>
                        <p style={ui.appMeta}>
                          Requested role: <strong>{app.requested_role}</strong>
                        </p>
                      </div>

                      <StatusBadge status={app.status} />
                    </div>

                    <div style={ui.appBody}>
                      <p>
                        <strong>Email:</strong> {app.email || "—"}
                      </p>
                      <p>
                        <strong>Phone:</strong> {app.phone_number || "—"}
                      </p>
                      <p>
                        <strong>Clinic:</strong> {app.clinic_name || "—"}
                      </p>
                      <p>
                        <strong>Professional ID:</strong>{" "}
                        {app.professional_id || "—"}
                      </p>
                      <p>
                        <strong>License:</strong> {app.license_number || "—"}
                      </p>
                      <p>
                        <strong>Motivation:</strong> {app.motivation || "—"}
                      </p>
                      <p>
                        <strong>Submitted:</strong> {formatDateTime(app.created_at)}
                      </p>
                      <p>
                        <strong>Reviewed:</strong> {formatDateTime(app.reviewed_at)}
                      </p>
                    </div>

                    {app.status === "pending" && (
                      <div style={ui.formActions}>
                        <button
                          type="button"
                          style={ui.rejectBtn}
                          disabled={reviewingId === app.id}
                          onClick={() => rejectApplication(app.id)}
                        >
                          {reviewingId === app.id ? "Processing…" : "Reject"}
                        </button>

                        <button
                          type="button"
                          style={ui.approveBtn}
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
        )}
      </div>
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────
const ui = {
  wrapper: {
    width: "100%",
  },
  card: {
    background: "#fff",
    border: "1px solid #e8e7e3",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,.05)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#111",
  },
  subTitle: {
    margin: "0 0 12px",
    fontSize: 18,
    fontWeight: 700,
    color: "#111",
  },
  muted: {
    margin: "6px 0 0",
    color: "#666",
    fontSize: 14,
  },
  smallMuted: {
    margin: "6px 0 0",
    color: "#777",
    fontSize: 12,
  },
  error: {
    background: "#fef2f2",
    color: "#c0392b",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "10px 12px",
    marginBottom: 16,
    fontSize: 13,
  },
  refreshBtn: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  actionRow: {
    display: "flex",
    gap: 10,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  roleBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  roleBtnActive: {
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  },
  form: {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    background: "#fafafa",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  label: {
    display: "block",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".5px",
    color: "#444",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    fontSize: 14,
    background: "#fff",
    outline: "none",
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1.5px solid #ddd",
    fontSize: 14,
    background: "#fff",
    outline: "none",
    resize: "vertical",
  },
  searchResults: {
    border: "1px solid #e5e5e5",
    borderRadius: 10,
    background: "#fff",
    marginTop: 8,
    overflow: "hidden",
  },
  searchResultBtn: {
    width: "100%",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "10px 12px",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
  },
  searchSub: {
    fontSize: 12,
    color: "#777",
  },
  selectedClinic: {
    margin: "8px 0 0",
    fontSize: 13,
    color: "#1d9e75",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  primaryBtn: {
    border: "none",
    background: "#111",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  approveBtn: {
    border: "none",
    background: "#1d9e75",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  rejectBtn: {
    border: "none",
    background: "#c0392b",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  sectionBlock: {
    marginTop: 8,
  },
  list: {
    display: "grid",
    gap: 14,
  },
  applicationCard: {
    border: "1px solid #e8e8e8",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
  },
  applicationTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  appTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: 16,
    color: "#111",
  },
  appMeta: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#666",
  },
  appBody: {
    display: "grid",
    gap: 6,
    fontSize: 14,
    color: "#333",
  },
};