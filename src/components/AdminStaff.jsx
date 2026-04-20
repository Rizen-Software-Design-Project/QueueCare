import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { FiGrid,FiUsers,FiRefreshCw,FiTrash2, FiCreditCard, FiMap, FiSearch, FiClock, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText, FiLogOut, FiMapPin} from "react-icons/fi";
import { FaHospital } from "react-icons/fa";


const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STAFF_ROLES = ["doctor", "nurse", "receptionist", "admin"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [assigningTo, setAssigningTo] = useState(null); // staff member being assigned
  const [form, setForm] = useState({ facility_id: "", role: "" });
  const [saving, setSaving] = useState(false);

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
      role: member.staff_role || "",
    });
  }

  async function saveAssignment() {
    if (!form.facility_id || !form.role) {
      setStatus({ type: "error", message: "Select a facility and role." });
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.rpc("assign_staff_to_facility", {
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id: assigningTo.profile_id,
      p_facility_id: parseInt(form.facility_id),
      p_role: form.role,
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
              facility_id: parseInt(form.facility_id),
              facility_name: facilities.find((f) => f.id === parseInt(form.facility_id))?.name || "",
              staff_role: form.role,
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
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id: member.profile_id,
      p_facility_id: member.facility_id,
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
    <>
      <style>{`
        /* ----- GLOBAL RESET & VARIABLES (scoped to this component) ----- */
        .staff-module * {
          box-sizing: border-box;
          margin: 0;
        }
        .staff-module {
          --primary: #1B5E20;
          --primary-light: #2e7d32;
          --primary-dark: #0a3b0f;
          --gray-100: #f8f9fa;
          --gray-200: #e9ecef;
          --gray-300: #dee2e6;
          --gray-600: #6c757d;
          --gray-800: #212529;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
          --shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1);
          --radius: 12px;
          --radius-sm: 8px;
          font-family: system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: var(--gray-800);
        }

        /* Container */
        .staff-module .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Title */
        .staff-module .title {
          font-size: 1.85rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--primary-dark);
          border-left: 5px solid var(--primary);
          padding-left: 1rem;
        }

        /* Status message */
        .staff-module .status {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .staff-module .status.success { background: #e8f5e9; color: #1e4620; border-left: 4px solid var(--primary); }
        .staff-module .status.error { background: #ffebee; color: #b71c1c; border-left: 4px solid #d32f2f; }
        .staff-module .status.loading { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #1976d2; }

        /* Grid */
        .staff-module .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        /* Card */
        .staff-module .card {
          background: white;
          border-radius: var(--radius);
          box-shadow: var(--shadow-md);
          padding: 1.25rem;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid var(--gray-200);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .staff-module .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        }
        .staff-module .card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--primary-dark);
        }
        .staff-module .card p {
          font-size: 0.85rem;
          color: var(--gray-600);
          margin-bottom: 0.5rem;
        }
        .staff-module .card .active {
          color: var(--primary);
          font-weight: 600;
          background: #e8f5e9;
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }
        .staff-module .card .inactive {
          color: #b91c1c;
          background: #ffebee;
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }

        /* Buttons */
        .staff-module .btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.85rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          background: var(--gray-200);
          color: var(--gray-800);
        }
        .staff-module .btn.primary {
          background: var(--primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }
        .staff-module .btn.primary:hover {
          background: var(--primary-light);
          transform: translateY(-1px);
        }
        .staff-module .btn.secondary {
          background: var(--gray-200);
          border: 1px solid var(--gray-300);
        }
        .staff-module .btn.secondary:hover {
          background: var(--gray-300);
        }
        .staff-module .btn.edit {
          background: white;
          border: 1px solid var(--primary);
          color: var(--primary);
        }
        .staff-module .btn.edit:hover {
          background: var(--primary);
          color: white;
        }
        .staff-module .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        /* Modal overlay */
        .staff-module .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .staff-module .modal {
          background: white;
          border-radius: var(--radius);
          max-width: 500px;
          width: 100%;
          padding: 1.5rem;
          box-shadow: 0 20px 35px rgba(0,0,0,0.2);
        }
        .staff-module .modal h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--primary-dark);
        }

        /* Form elements */
        .staff-module .form-group {
          margin-bottom: 1.25rem;
        }
        .staff-module .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .staff-module .input, .staff-module select.input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          transition: 0.2s;
          background: white;
        }
        .staff-module .input:focus, .staff-module select.input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(27,94,32,0.2);
        }

        .staff-module .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        @media (max-width: 640px) {
          .staff-module .grid {
            grid-template-columns: 1fr;
          }
          .staff-module .modal {
            margin: 1rem;
            padding: 1rem;
          }
        }
      `}</style>

      <div className="staff-module">
        <div className="container">
          <h2 className="title"><FiUsers /> Staff Management</h2>

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
                    <h3>
                      {member.name} {member.surname}
                    </h3>
                    <p>{member.email || member.phone_number || "No contact info"}</p>

                    {member.facility_name ? (
                      <>
                        <p className="active"><FiMapPin /> {member.facility_name}</p>
                        <p>
                          <strong>Role:</strong> {member.staff_role}
                        </p>
                      </>
                    ) : (
                      <p className="inactive">Unassigned</p>
                    )}
                  </div>

                  <div className="card-actions">
                    <button className="btn edit" onClick={() => openAssign(member)}>
                      {member.facility_id ? "🔄 Reassign" : "➕ Assign"}
                    </button>

                    {member.facility_id && (
                      <button className="btn secondary" onClick={() => removeAssignment(member)}>
                        <FiTrash2 /> Remove
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
                <h3>
                  Assign {assigningTo.name} {assigningTo.surname}
                </h3>

                <div className="form-group">
                  <label><FaHospital /> Facility</label>
                  <select
                    className="input"
                    value={form.facility_id}
                    onChange={(e) => setForm((p) => ({ ...p, facility_id: e.target.value }))}
                  >
                    <option value="">Select a facility...</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label><FiUser /> Role</label>
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
                    {saving ? "Saving..." : "Save assignment"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}