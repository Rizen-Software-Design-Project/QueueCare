import { useMemo, useState } from "react";
import { supabase } from "#lib/supabase";
import { FiUser, FiMapPin, FiTrash2, FiUsers, FiChevronLeft } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";
import "./AdminClinics.css";

const API_BASE = import.meta.env.VITE_API_BASE 
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

const STAFF_ROLES = ["doctor", "nurse", "receptionist", "admin"];

const districtsByProvince = {
  "Eastern Cape": ["Alfred Nzo","Amathole","Buffalo City","Chris Hani","Joe Gqabi","Nelson Mandela Bay","OR Tambo","Sarah Baartman"],
  "Free State": ["Fezile Dabi","Lejweleputswa","Mangaung","Thabo Mofutsanyana","Xhariep"],
  Gauteng: ["Ekurhuleni","City of Johannesburg","City of Tshwane","Sedibeng","West Rand"],
  "KwaZulu-Natal": ["Amajuba","eThekwini","Harry Gwala","iLembe","King Cetshwayo","Ugu","Umgungundlovu","Umkhanyakude","Umzinyathi","Uthukela","Uthungulu","Zululand"],
  Limpopo: ["Capricorn","Sekhukhune","Mopani","Vhembe","Waterberg"],
  Mpumalanga: ["Ehlanzeni","Gert Sibande","Nkangala"],
  "North West": ["Bojanala","Dr Kenneth Kaunda","Dr Ruth Segomotsi Mompati","Ngaka Modiri Molema"],
  "Northern Cape": ["Frances Baard","John Taolo Gaetsewe","Namakwa","Pixley ka Seme","ZF Mgcawu"],
  "Western Cape": ["Cape Winelands","Central Karoo","City of Cape Town","Eden","Overberg","West Coast"],
};

const allDistricts = [...new Set(Object.values(districtsByProvince).flat())].sort();

export default function AdminStaff() {
  const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

  // ── Clinic search ──────────────────────────────────────────
  const [nameSearch, setNameSearch]           = useState("");
  const [province, setProvince]               = useState("");
  const [district, setDistrict]               = useState("");
  const [clinics, setClinics]                 = useState([]);
  const [clinicsStatus, setClinicsStatus]     = useState({ type: "info", message: "Search for a clinic to get started." });

  // ── Selected clinic + its staff ────────────────────────────
  const [selectedClinic, setSelectedClinic]   = useState(null);
  const [clinicStaff, setClinicStaff]         = useState([]);
  const [staffLoading, setStaffLoading]       = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  // ── Assign modal ───────────────────────────────────────────
  const [allFacilities, setAllFacilities]     = useState([]);
  const [assigningTo, setAssigningTo]         = useState(null);
  const [form, setForm]                       = useState({ facility_id: "", role: "" });
  const [saving, setSaving]                   = useState(false);
  const [actionStatus, setActionStatus]       = useState({ type: "", message: "" });

  const availableDistricts = useMemo(() =>
    province && districtsByProvince[province] ? districtsByProvince[province] : allDistricts,
  [province]);

  // ── Search clinics ─────────────────────────────────────────
  async function searchClinics() {
    setClinicsStatus({ type: "loading", message: "Searching..." });
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/search_clinics_admin`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
        search_name:     nameSearch  || null,
        search_staff:    staffSearch || null,   // ← add this
        search_province: province    || null,
        search_district: district    || null,
      }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setClinics(data);
      setClinicsStatus({
        type: data.length ? "success" : "error",
        message: data.length ? `${data.length} clinic${data.length !== 1 ? "s" : ""} found` : "No clinics found",
      });
    } catch (err) {
      setClinicsStatus({ type: "error", message: err.message });
    }
  }

  function clearSearch() {
    setNameSearch("");
    setStaffSearch("");                     // ← add this
    setProvince("");
    setDistrict("");
    setClinics([]);
    setClinicsStatus({ type: "info", message: "Search for a clinic to get started." });
  }

  // ── Select clinic → load its staff ────────────────────────
  async function selectClinic(clinic) {
    setSelectedClinic(clinic);
    setClinicStaff([]);
    setStaffSearch("");          // ← clear so clinic search term doesn't carry over
    setStaffLoading(true);
    setActionStatus({ type: "", message: "" });
    try {
      // Load staff for this clinic
      const { data, error } = await supabase
        .rpc("get_staff_with_assignments")
      if (error) throw error;
      // Filter to this clinic
      setClinicStaff((data || []).filter(s => s.facility_id === clinic.id));

      // Also load all facilities for the reassign dropdown
      const { data: fData, error: fErr } = await supabase
        .from("facilities").select("id, name").order("name");
      if (fErr) throw fErr;
      setAllFacilities(fData || []);
    } catch (err) {
      setActionStatus({ type: "error", message: err.message });
    } finally {
      setStaffLoading(false);
    }
  }

  function backToClinics() {
    setSelectedClinic(null);
    setClinicStaff([]);
    setStaffSearch("");
    setActionStatus({ type: "", message: "" });
  }

  // ── Assign / reassign ──────────────────────────────────────
  function openAssign(member) {
    setAssigningTo(member);
    setForm({
      facility_id: member.facility_id?.toString() || selectedClinic.id.toString(),
      role: member.staff_role || "",
    });
    setActionStatus({ type: "", message: "" });
  }

  async function saveAssignment() {
  if (!form.facility_id || !form.role) {
    setActionStatus({ type: "error", message: "Select a facility and role." });
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
    setActionStatus({ type: "error", message: error?.message || data?.error });
    return;
  }

  const movedElsewhere = parseInt(form.facility_id) !== selectedClinic.id;

  if (movedElsewhere) {
    // Remove from this clinic's list entirely
    setClinicStaff(prev => prev.filter(s => s.profile_id !== assigningTo.profile_id));
    setActionStatus({ type: "success", message: `${assigningTo.name} moved to ${allFacilities.find(f => f.id === parseInt(form.facility_id))?.name || "new clinic"}.` });
  } else {
    // Same clinic, just role changed — update in place
    setClinicStaff(prev => prev.map(s =>
      s.profile_id === assigningTo.profile_id
        ? { ...s, staff_role: form.role }
        : s
    ));
    setActionStatus({ type: "success", message: `${assigningTo.name}'s role updated to ${form.role}.` });
  }
  if (assigningTo.email) {
  fetch(`${API_BASE}/notify/application/send-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: assigningTo.email?.trim().toLowerCase(),
    name: assigningTo.name,
    role: form.role,
    status: 'reassigned',
  }),
}).catch(err => console.warn('Email failed:', err.message));}

  setAssigningTo(null);
}

  // ── Remove assignment ──────────────────────────────────────
  async function removeAssignment(member) {
    if (!window.confirm(`Remove ${member.name} from ${member.facility_name}?`)) return;
    const { data, error } = await supabase.rpc("remove_staff_from_facility", {
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id: member.profile_id,
      p_facility_id: member.facility_id,
    });
    if (error || data?.error) {
      setActionStatus({ type: "error", message: error?.message || data?.error });
      return;
    }
    setClinicStaff(prev => prev.filter(s => s.profile_id !== member.profile_id));
    setActionStatus({ type: "success", message: `${member.name} removed.` });
  if (member.email) {
  fetch(`${API_BASE}/notify/application/send-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: member.email?.trim().toLowerCase(),
    name: member.name,
    role: member.staff_role,
    status: 'removed',
  }),
}).catch(err => console.warn('Email failed:', err.message));
  }}
  const visibleStaff = clinicStaff.filter(s =>
  staffSearch.trim() === "" ||
  `${s.name} ${s.surname}`.toLowerCase().includes(staffSearch.toLowerCase())
  );

  // ── UI ─────────────────────────────────────────────────────
  // ── UI ─────────────────────────────────────────────────────
  return (
    <div className="admin-module">
      <div className="container">

        {/* ── CLINIC SEARCH VIEW ── */}
        {!selectedClinic && (
          <>
            <h2 className="title"><FiUsers /> Staff Management</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
              Find a clinic first, then view and edit its staff.
            </p>

            <div className="filters">
              <input
                className="input"
                placeholder="🔍 Search clinic name..."
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchClinics()}
              />
              <input
                className="input"
                placeholder="👤 Search staff name..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchClinics()}
              />
              <select className="input" value={province} onChange={e => { setProvince(e.target.value); setDistrict(""); }}>
                <option value="">All provinces</option>
                {Object.keys(districtsByProvince).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={district} onChange={e => setDistrict(e.target.value)}>
                <option value="">All districts</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button className="btn primary" onClick={searchClinics}>Search</button>
              <button className="btn secondary" onClick={clearSearch}>Clear</button>
            </div>

            <div className={`status ${clinicsStatus.type}`}>{clinicsStatus.message}</div>

            <div className="grid">
              {clinics.map(clinic => (
                <div key={clinic.id} className="card" style={{ cursor: "pointer" }} onClick={() => selectClinic(clinic)}>
                  <div>
                    <h3><FaHospital style={{ marginRight: "0.4rem" }} />{clinic.name}</h3>
                    <p>{clinic.district}, {clinic.province}</p>
                    <span className={clinic.is_active ? "active" : "inactive"}>
                      {clinic.is_active ? "● Active" : "○ Inactive"}
                    </span>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}>
                      👥 <strong>{clinic.staff_count ?? 0}</strong> staff assigned
                    </p>
                  </div>
                  <button className="btn edit" onClick={e => { e.stopPropagation(); selectClinic(clinic); }}>
                    <FiUsers /> View staff
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STAFF VIEW FOR SELECTED CLINIC ── */}
        {selectedClinic && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <button className="btn secondary" onClick={backToClinics}>
                <FiChevronLeft /> Back
              </button>
              <h2 className="title" style={{ margin: 0 }}>
                <FaHospital /> {selectedClinic.name}
              </h2>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {selectedClinic.district}, {selectedClinic.province}
            </p>

            {actionStatus.message && (
              <div className={`status ${actionStatus.type}`}>{actionStatus.message}</div>
            )}

            {/* Local staff filter — only shown here, inside the clinic view */}
            <input
              className="input"
              placeholder="👤 Filter staff by name..."
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              style={{ maxWidth: "300px", marginBottom: "1rem" }}
            />

            {staffLoading ? (
              <div className="status loading">Loading staff...</div>
            ) : visibleStaff.length === 0 ? (
              <div className="status error">
                {clinicStaff.length === 0 ? "No staff assigned to this clinic." : "No staff match that name."}
              </div>
            ) : (
              <div className="grid">
                {visibleStaff.map(member => (
                  <div key={member.profile_id} className="card">
                    <div>
                      <h3>{member.name} {member.surname}</h3>
                      <p>{member.email || member.phone_number || "No contact info"}</p>
                      <p><strong>Role:</strong> {member.staff_role}</p>
                    </div>
                    <div className="card-actions">
                      <button className="btn edit" onClick={() => openAssign(member)}>
                        🔄 Reassign
                      </button>
                      <button className="btn secondary" onClick={() => removeAssignment(member)}>
                        <FiTrash2 /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reassign modal */}
            {assigningTo && (
              <div className="modal-overlay" onClick={() => setAssigningTo(null)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <h3>Reassign {assigningTo.name} {assigningTo.surname}</h3>

                  <div className="form-group">
                    <label><FaHospital /> Facility</label>
                    <select
                      className="input"
                      value={form.facility_id}
                      onChange={e => setForm(p => ({ ...p, facility_id: e.target.value }))}
                    >
                      <option value="">Select a facility...</option>
                      {allFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label><FiUser /> Role</label>
                    <select
                      className="input"
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    >
                      <option value="">Select a role...</option>
                      {STAFF_ROLES.map(r => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                  {actionStatus.message && (
                    <div className={`status ${actionStatus.type}`}>{actionStatus.message}</div>
                  )}

                  <div className="modal-actions">
                    <button className="btn secondary" onClick={() => setAssigningTo(null)}>Cancel</button>
                    <button className="btn primary" onClick={saveAssignment} disabled={saving}>
                      {saving ? "Saving..." : "Save assignment"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}