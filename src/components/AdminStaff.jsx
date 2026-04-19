import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAFF_ROLES = ["doctor", "nurse", "receptionist", "admin"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminStaff() {
  const [staff, setStaff]             = useState([]);
  const [facilities, setFacilities]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [status, setStatus]           = useState({ type: "", message: "" });
  const [assigningTo, setAssigningTo] = useState(null); // staff member being assigned
  const [form, setForm]               = useState({ facility_id: "", role: "" });
  const [saving, setSaving]           = useState(false);

  const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [staffRes, facilitiesRes] = await Promise.all([
        supabase.rpc("get_staff_with_assignments"),
        supabase.from("facilities").select("id, name").order("name"),
      ]);

      if (staffRes.error) throw staffRes.error;
      if (facilitiesRes.error) throw facilitiesRes.error;

      setStaff(staffRes.data || []);
      setFacilities(facilitiesRes.data || []);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  function openAssign(member) {
    setAssigningTo(member);
    setForm({
      facility_id: member.facility_id?.toString() || "",
      role:        member.staff_role || "",
    });
  }

  async function saveAssignment() {
    if (!form.facility_id || !form.role) {
      setStatus({ type: "error", message: "Select a facility and role." });
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.rpc("assign_staff_to_facility", {
      p_auth_provider:    identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id:       assigningTo.profile_id,
      p_facility_id:      parseInt(form.facility_id),
      p_role:             form.role,
    });

    setSaving(false);

    if (error || data?.error) {
      setStatus({ type: "error", message: error?.message || data?.error });
      return;
    }

    // Update local state
    setStaff((prev) =>
      prev.map((s) =>
        s.profile_id === assigningTo.profile_id
          ? {
              ...s,
              facility_id:   parseInt(form.facility_id),
              facility_name: facilities.find((f) => f.id === parseInt(form.facility_id))?.name || "",
              staff_role:    form.role,
            }
          : s
      )
    );

    setStatus({ type: "success", message: `${assigningTo.name} assigned successfully.` });
    setAssigningTo(null);
  }

  async function removeAssignment(member) {
    if (!member.facility_id) return;
    if (!window.confirm(`Remove ${member.name} from ${member.facility_name}?`)) return;

    const { data, error } = await supabase.rpc("remove_staff_from_facility", {
      p_auth_provider:    identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id:       member.profile_id,
      p_facility_id:      member.facility_id,
    });

    if (error || data?.error) {
      setStatus({ type: "error", message: error?.message || data?.error });
      return;
    }

    setStaff((prev) =>
      prev.map((s) =>
        s.profile_id === member.profile_id
          ? { ...s, facility_id: null, facility_name: null, staff_role: null, assignment_id: null }
          : s
      )
    );

    setStatus({ type: "success", message: `${member.name} unassigned.` });
  }

  return (
    <div className="admin-container">
      <h2 className="title">Staff Management</h2>

      {status.message && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {loading ? (
        <div className="status loading">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="status error">No staff members found.</div>
      ) : (
        <div className="grid">
          {staff.map((member) => (
            <div key={member.profile_id} className="card">
              <div>
                <h3>{member.name} {member.surname}</h3>
                <p>{member.email || member.phone_number || "No contact info"}</p>

                {member.facility_name ? (
                  <>
                    <p className="active">
                      📍 {member.facility_name}
                    </p>
                    <p>
                      <strong>Role:</strong> {member.staff_role}
                    </p>
                  </>
                ) : (
                  <p className="inactive">Unassigned</p>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn edit" onClick={() => openAssign(member)}>
                  {member.facility_id ? "Reassign" : "Assign"}
                </button>

                {member.facility_id && (
                  <button className="btn secondary" onClick={() => removeAssignment(member)}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assigningTo && (
        <div className="modal-overlay" onClick={() => setAssigningTo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign {assigningTo.name} {assigningTo.surname}</h3>

            <div className="form-group">
              <label>Facility</label>
              <select
                className="input"
                value={form.facility_id}
                onChange={(e) => setForm((p) => ({ ...p, facility_id: e.target.value }))}
              >
                <option value="">Select a facility...</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="">Select a role...</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setAssigningTo(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={saveAssignment} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}