import { useEffect, useMemo, useState } from "react";
import { supabase } from "#lib/supabase";
import { FiUser, FiMapPin, FiTrash2, FiUsers, FiChevronLeft } from "react-icons/fi";
import { FaHospital } from "react-icons/fa";
import "./AdminClinics.css";

// The backend server address - uses the local one in development or the live Azure one in production
const API_BASE = import.meta.env.VITE_API_BASE
  || "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

const STAFF_ROLES = ["doctor", "nurse", "receptionist", "admin"];

// A map of provinces to their districts so the district dropdown updates when you pick a province
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

// All districts in a flat list, used when no province filter is selected
const allDistricts = [...new Set(Object.values(districtsByProvince).flat())].sort();

export default function AdminStaff() {
  // Get the admin's ID from the browser - we need it to make certain database calls
  const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");

  // What the admin has typed in the search box and the matching clinics found so far
  const [nameSearch, setNameSearch]       = useState("");
  const [province, setProvince]           = useState("");
  const [district, setDistrict]           = useState("");
  const [clinics, setClinics]             = useState([]);
  const [clinicsStatus, setClinicsStatus] = useState({ type: "info", message: "Search for a clinic to get started." });

  // Which clinic the admin clicked on to view in detail, plus all the staff at that clinic
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [clinicStaff, setClinicStaff]       = useState([]);
  const [staffLoading, setStaffLoading]     = useState(true);
  const [loadError, setLoadError]           = useState(null);
  const [staffSearch, setStaffSearch]       = useState("");

  // Controls the popup window for assigning or moving a staff member to a clinic
  const [allFacilities, setAllFacilities] = useState([]);
  const [assigningTo, setAssigningTo]     = useState(null);
  const [form, setForm]                   = useState({ facility_id: "", role: "" });
  const [saving, setSaving]               = useState(false);
  const [actionStatus, setActionStatus]   = useState({ type: "", message: "" });

  // Update the district dropdown to only show districts in the chosen province
  const availableDistricts = useMemo(() =>
    province && districtsByProvince[province] ? districtsByProvince[province] : allDistricts,
  [province]);

  // Load all staff and all clinics at the same time when the page opens so nothing needs to wait
  useEffect(() => {
    (async () => {
      try {
        const [staffResult, facilityResult] = await Promise.all([
          supabase.rpc("get_staff_with_assignments"),
          supabase.from("facilities").select("id, name").order("name"),
        ]);
        if (staffResult.error) throw staffResult.error;
        if (facilityResult.error) throw facilityResult.error;
        setClinicStaff(staffResult.data || []);
        setAllFacilities(facilityResult.data || []);
      } catch (err) {
        setLoadError(err.message);
      } finally {
        setStaffLoading(false);
      }
    })();
  }, []);

  // Search for clinics using the database - we call the API directly here because the filter is complex
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
          search_staff:    staffSearch || null,
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
    setStaffSearch("");
    setProvince("");
    setDistrict("");
    setClinics([]);
    setClinicsStatus({ type: "info", message: "Search for a clinic to get started." });
  }

  // Filter the list of staff using the search text - no need to hit the database again
  async function selectClinic(clinic) {
    setSelectedClinic(clinic);
    setClinicStaff([]);
    setStaffSearch("");
    setStaffLoading(true);
    setActionStatus({ type: "", message: "" });
    try {
      const { data, error } = await supabase.rpc("get_staff_with_assignments");
      if (error) throw error;
      setClinicStaff((data || []).filter(s => s.facility_id === clinic.id));

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

  // Fill in the popup form with the staff member's current clinic and role so the admin only changes what needs changing
  function openAssign(member) {
    setAssigningTo(member);
    setForm({
      facility_id: member.facility_id?.toString() || selectedClinic?.id?.toString() || "",
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

    if (!selectedClinic) {
      // Staff is in the global view - update their row in the list without removing them
      setClinicStaff(prev => prev.map(s =>
        s.profile_id === assigningTo.profile_id
          ? { ...s, staff_role: form.role, facility_id: parseInt(form.facility_id) }
          : s
      ));
      setAssigningTo(null);
      return;
    }

    const movedElsewhere = parseInt(form.facility_id) !== selectedClinic.id;

    if (movedElsewhere) {
      // Staff was moved to a different clinic, so remove them from the current list
      setClinicStaff(prev => prev.filter(s => s.profile_id !== assigningTo.profile_id));
      setActionStatus({ type: "success", message: `${assigningTo.name} moved to ${allFacilities.find(f => f.id === parseInt(form.facility_id))?.name || "new clinic"}.` });
    } else {
      // Staff stayed at the same clinic but their role changed - update their card
      setClinicStaff(prev => prev.map(s =>
        s.profile_id === assigningTo.profile_id
          ? { ...s, staff_role: form.role }
          : s
      ));
      setActionStatus({ type: "success", message: `${assigningTo.name}'s role updated to ${form.role}.` });
    }

    // Try to send an email notification but do not stop if it fails - the assignment is saved either way
    if (assigningTo.email) {
      fetch(`${API_BASE}/notify/application/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: assigningTo.email?.trim().toLowerCase(),
          name: assigningTo.name,
          role: form.role,
          status: "reassigned",
        }),
      }).catch(err => console.warn("Email failed:", err.message));
    }

    setAssigningTo(null);
  }

  async function removeAssignment(member) {
    if (!window.confirm(`Remove ${member.name} from ${member.facility_name}?`)) return;
    const { data, error } = await supabase.rpc("remove_staff_from_facility", {
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_profile_id: member.profile_id,
      p_facility_id: member.facility_id,
    });
    if (error || data?.error) {
      setActionStatus({
        type: "error",
        message: String(error?.message || data?.error || "Unknown error"),
      });
      return;
    }
    setClinicStaff(prev => prev.filter(s => s.profile_id !== member.profile_id));
    setActionStatus({ type: "success", message: `${member.name} removed.` });

    // Try to send a removal notification email - if it fails, that is okay, the removal already worked
    if (member.email) {
      fetch(`${API_BASE}/notify/application/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: member.email?.trim().toLowerCase(),
          name: member.name,
          role: member.staff_role,
          status: "removed",
        }),
      }).catch(err => console.warn("Email failed:", err.message));
    }
  }

  // Filter the staff list as the admin types - no database call needed, just filter what we already have
  const visibleStaff = clinicStaff.filter(s =>
    staffSearch.trim() === "" ||
    `${s.name} ${s.surname}`.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <main className="admin-module">
      <section className="container">

        {/* Left panel: search for clinics and see the full staff list */}
        {!selectedClinic && (
          <>
            <h2 className="title"><FiUsers /> Staff Management</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1rem", fontSize: "0.9rem" }}>
              Find a clinic first, then view and edit its staff.
            </p>

            {/* Wrapping in a form means pressing Enter in the search box will trigger the search */}
            <form
              className="filters"
              onSubmit={e => { e.preventDefault(); searchClinics(); }}
            >
              <input
                className="input"
                placeholder="🔍 Search clinic name..."
                value={nameSearch}
                onChange={e => setNameSearch(e.target.value)}
              />
              <input
                className="input"
                placeholder="👤 Search staff name..."
                value={staffSearch}
                onChange={e => setStaffSearch(e.target.value)}
              />
              <select className="input" value={province} onChange={e => { setProvince(e.target.value); setDistrict(""); }}>
                <option value="">All provinces</option>
                {Object.keys(districtsByProvince).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="input" value={district} onChange={e => setDistrict(e.target.value)}>
                <option value="">All districts</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="submit" className="btn primary">Search</button>
              <button type="button" className="btn secondary" onClick={clearSearch}>Clear</button>
            </form>

            <p className={`status ${clinicsStatus.type}`}>{clinicsStatus.message}</p>

            {/* The list of clinics that match what the admin typed */}
            <ul className="grid">
              {clinics.map(clinic => (
                <li key={clinic.id} className="card" style={{ cursor: "pointer" }} onClick={() => selectClinic(clinic)}>
                  <header>
                    <h3><FaHospital style={{ marginRight: "0.4rem" }} />{clinic.name}</h3>
                    <p>{clinic.district}, {clinic.province}</p>
                    <mark className={clinic.is_active ? "active" : "inactive"}>
                      {clinic.is_active ? "● Active" : "○ Inactive"}
                    </mark>
                    <p style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}>
                      👥 <strong>{clinic.staff_count ?? 0}</strong> staff assigned
                    </p>
                  </header>
                  <button className="btn edit" onClick={e => { e.stopPropagation(); selectClinic(clinic); }}>
                    <FiUsers /> View staff
                  </button>
                </li>
              ))}
            </ul>

            {/* All staff members - loaded when the page opens, shown below the clinic results */}
            {staffLoading ? (
              <p className="status loading">Loading staff...</p>
            ) : loadError ? (
              <p className="status error">{loadError}</p>
            ) : clinicStaff.length === 0 ? (
              <p className="status error">No staff members found.</p>
            ) : (
              <ul className="grid">
                {visibleStaff.map(member => (
                  <li key={member.profile_id} className="card">
                    <header>
                      <h3>{member.name} {member.surname}</h3>
                      <p>{member.email || member.phone_number || "No contact info"}</p>
                      <p><strong>Facility:</strong> {member.facility_name || "Unassigned"}</p>
                      {member.staff_role && <p><strong>Role:</strong> {member.staff_role}</p>}
                    </header>
                    <footer className="card-actions">
                      {member.facility_id ? (
                        <>
                          <button className="btn edit" onClick={() => openAssign(member)}>🔄 Reassign</button>
                          <button className="btn secondary" onClick={() => removeAssignment(member)}>
                            <FiTrash2 /> Remove
                          </button>
                        </>
                      ) : (
                        <button className="btn primary" onClick={() => openAssign(member)}>➕ Assign</button>
                      )}
                    </footer>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Right panel: shows all staff at the clinic the admin clicked on */}
        {selectedClinic && (
          <>
            <header style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <button className="btn secondary" onClick={backToClinics}>
                <FiChevronLeft /> Back
              </button>
              <h2 className="title" style={{ margin: 0 }}>
                <FaHospital /> {selectedClinic.name}
              </h2>
            </header>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {selectedClinic.district}, {selectedClinic.province}
            </p>

            {actionStatus.message && (
              <p className={`status ${actionStatus.type}`}>{actionStatus.message}</p>
            )}

            {/* Search box to filter staff within this specific clinic - no network call needed */}
            <input
              className="input"
              placeholder="👤 Filter staff by name..."
              value={staffSearch}
              onChange={e => setStaffSearch(e.target.value)}
              style={{ maxWidth: "300px", marginBottom: "1rem" }}
            />

            {staffLoading ? (
              <p className="status loading">Loading staff...</p>
            ) : visibleStaff.length === 0 ? (
              <p className="status error">
                {clinicStaff.length === 0 ? "No staff assigned to this clinic." : "No staff match that name."}
              </p>
            ) : (
              <ul className="grid">
                {visibleStaff.map(member => (
                  <li key={member.profile_id} className="card">
                    <header>
                      <h3>{member.name} {member.surname}</h3>
                      <p>{member.email || member.phone_number || "No contact info"}</p>
                      <p><strong>Role:</strong> {member.staff_role}</p>
                    </header>
                    <footer className="card-actions">
                      <button className="btn edit" onClick={() => openAssign(member)}>
                        🔄 Reassign
                      </button>
                      <button className="btn secondary" onClick={() => removeAssignment(member)}>
                        <FiTrash2 /> Remove
                      </button>
                    </footer>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Popup window for assigning or moving a staff member to a clinic */}
        {assigningTo && (
          <section className="modal-overlay" onClick={() => setAssigningTo(null)}>
            {/* Clicking inside the popup should not close it - only the X button should */}
            <article className="modal" onClick={e => e.stopPropagation()}>
              <h3>Assign {assigningTo.name} {assigningTo.surname}</h3>

              <section className="form-group">
                <label><FaHospital /> Facility</label>
                <select
                  className="input"
                  value={form.facility_id}
                  onChange={e => setForm(p => ({ ...p, facility_id: e.target.value }))}
                >
                  <option value="">Select a facility...</option>
                  {allFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </section>

              <section className="form-group">
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
              </section>

              {actionStatus.message && (
                <p className={`status ${actionStatus.type}`}>{actionStatus.message}</p>
              )}

              <footer className="modal-actions">
                <button className="btn secondary" onClick={() => setAssigningTo(null)}>Cancel</button>
                <button className="btn primary" onClick={saveAssignment} disabled={saving}>
                  {saving ? "Saving..." : "Save assignment"}
                </button>
              </footer>
            </article>
          </section>
        )}

      </section>
    </main>
  );
}
