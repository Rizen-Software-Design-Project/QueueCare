import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { FiGrid, FiCreditCard, FiMap, FiSearch, FiClock, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText, FiLogOut, FiMapPin} from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= DATA =================
const districtsByProvince = {
  "Eastern Cape": ["Alfred Nzo", "Amathole", "Buffalo City", "Chris Hani", "Joe Gqabi", "Nelson Mandela Bay", "OR Tambo", "Sarah Baartman"],
  "Free State": ["Fezile Dabi", "Lejweleputswa", "Mangaung", "Thabo Mofutsanyana", "Xhariep"],
  Gauteng: ["Ekurhuleni", "City of Johannesburg", "City of Tshwane", "Sedibeng", "West Rand"],
  "KwaZulu-Natal": ["Amajuba", "eThekwini", "Harry Gwala", "iLembe", "King Cetshwayo", "Ugu", "Umgungundlovu", "Umkhanyakude", "Umzinyathi", "Uthukela", "Uthungulu", "Zululand"],
  Limpopo: ["Capricorn", "Sekhukhune", "Mopani", "Vhembe", "Waterberg"],
  Mpumalanga: ["Ehlanzeni", "Gert Sibande", "Nkangala"],
  "North West": ["Bojanala", "Dr Kenneth Kaunda", "Dr Ruth Segomotsi Mompati", "Ngaka Modiri Molema"],
  "Northern Cape": ["Frances Baard", "John Taolo Gaetsewe", "Namakwa", "Pixley ka Seme", "ZF Mgcawu"],
  "Western Cape": ["Cape Winelands", "Central Karoo", "City of Cape Town", "Eden", "Overberg", "West Coast"],
};

const allDistricts = [...new Set(Object.values(districtsByProvince).flat())].sort();

const SERVICE_OPTIONS = [
  "General Consultation",
  "HIV Testing",
  "TB Screening",
  "Vaccination",
  "Maternal Care",
  "Child Health",
  "Family Planning",
  "Chronic Medication",
  "Emergency Care",
];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function normalizeOperatingHours(hours) {
  const normalized = {};
  DAYS.forEach((day) => {
    normalized[day] = {
      open: hours?.[day]?.open ?? "",
      close: hours?.[day]?.close ?? "",
      closed: hours?.[day]?.closed ?? false,
    };
  });
  return normalized;
}

// ================= COMPONENT =================
export default function AdminClinics() {
  const [nameSearch, setNameSearch] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [status, setStatus] = useState({
    type: "loading",
    message: "Use filters to search for facilities.",
  });
  const [editingFacility, setEditingFacility] = useState(null);
  const [saving, setSaving] = useState(false);

  const availableDistricts = useMemo(() => {
    return province && districtsByProvince[province] ? districtsByProvince[province] : allDistricts;
  }, [province]);

  function handleProvinceChange(e) {
    setProvince(e.target.value);
    setDistrict("");
  }

  // ================= SEARCH =================
  async function applyFilters() {
    setStatus({ type: "loading", message: "🔍 Searching..." });
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_clinics_admin`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_name: nameSearch || null,
          search_province: province || null,
          search_district: district || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setFilteredFacilities(data);
      setStatus({
        type: data.length ? "success" : "error",
        message: data.length ? `Showing ${data.length} facilities` : "No facilities found",
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  }

  function clearFilters() {
    setNameSearch("");
    setProvince("");
    setDistrict("");
    setFilteredFacilities([]);
    setStatus({ type: "info", message: "Filters cleared" });
  }

  // ================= EDIT =================
  function openEditModal(facility) {
    setEditingFacility({
      ...facility,
      is_active: !!facility.is_active,
      services_offered: facility.services_offered ?? [],
      operating_hours_form: normalizeOperatingHours(facility.operating_hours),
    });
  }

  function updateHours(day, field, value) {
    setEditingFacility((prev) => ({
      ...prev,
      operating_hours_form: {
        ...prev.operating_hours_form,
        [day]: { ...prev.operating_hours_form[day], [field]: value },
      },
    }));
  }

  async function saveFacilityChanges() {
    if (!editingFacility) return;
    setSaving(true);
    const identity = JSON.parse(localStorage.getItem("userIdentity") || "{}");
    if (!identity.auth_provider || !identity.provider_user_id) {
      setStatus({ type: "error", message: "Not logged in. Please sign in again." });
      setSaving(false);
      return;
    }
    const cleanedHours = {};
    DAYS.forEach((day) => {
      const entry = editingFacility.operating_hours_form?.[day] ?? { open: "", close: "", closed: false };
      cleanedHours[day] = {
        open: entry.closed ? "" : entry.open ?? "",
        close: entry.closed ? "" : entry.close ?? "",
        closed: !!entry.closed,
      };
    });
    const { data, error } = await supabase.rpc("update_facility_as_admin", {
      p_auth_provider: identity.auth_provider,
      p_provider_user_id: identity.provider_user_id,
      p_facility_id: editingFacility.id,
      p_is_active: !!editingFacility.is_active,
      p_services_offered: editingFacility.services_offered ?? [],
      p_operating_hours: cleanedHours,
    });
    setSaving(false);
    if (error || data?.error) {
      setStatus({ type: "error", message: error?.message || data?.error || "Update failed." });
      return;
    }
    setFilteredFacilities((prev) =>
      prev.map((f) =>
        f.id === editingFacility.id
          ? { ...f, is_active: editingFacility.is_active, services_offered: editingFacility.services_offered, operating_hours: cleanedHours }
          : f
      )
    );
    setStatus({ type: "success", message: "Facility updated successfully." });
    setEditingFacility(null);
  }

  // ================= UI =================
  return (
    <>
      <style>{`
        /* ----- GLOBAL RESET & VARIABLES (scoped to this component) ----- */
        .admin-module * {
          box-sizing: border-box;
          margin: 0;
        }
        .admin-module {
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
        .admin-module .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        /* Title */
        .admin-module .title {
          font-size: 1.85rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--primary-dark);
          border-left: 5px solid var(--primary);
          padding-left: 1rem;
        }

        /* Filters bar */
        .admin-module .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          background: white;
          padding: 1rem;
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--gray-200);
        }
        .admin-module .input, .admin-module select.input {
          flex: 1 1 180px;
          padding: 0.6rem 0.75rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          transition: 0.2s;
          background: white;
        }
        .admin-module .input:focus, .admin-module select.input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(27,94,32,0.2);
        }

        /* Buttons */
        .admin-module .btn {
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius-sm);
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          background: var(--gray-200);
          color: var(--gray-800);
        }
        .admin-module .btn.primary {
          background: var(--primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }
        .admin-module .btn.primary:hover {
          background: var(--primary-light);
          transform: translateY(-1px);
        }
        .admin-module .btn.secondary {
          background: var(--gray-200);
          border: 1px solid var(--gray-300);
        }
        .admin-module .btn.secondary:hover {
          background: var(--gray-300);
        }
        .admin-module .btn.edit {
          background: white;
          border: 1px solid var(--primary);
          color: var(--primary);
          margin-top: 0.5rem;
          width: 100%;
        }
        .admin-module .btn.edit:hover {
          background: var(--primary);
          color: white;
        }

        /* Status message */
        .admin-module .status {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .admin-module .status.success { background: #e8f5e9; color: #1e4620; border-left: 4px solid var(--primary); }
        .admin-module .status.error { background: #ffebee; color: #b71c1c; border-left: 4px solid #d32f2f; }
        .admin-module .status.loading { background: #e3f2fd; color: #0d47a1; border-left: 4px solid #1976d2; }
        .admin-module .status.info { background: #f1f8e9; color: #33691e; border-left: 4px solid var(--primary); }

        /* Grid */
        .admin-module .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        /* Card */
        .admin-module .card {
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
        .admin-module .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        }
        .admin-module .card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--primary-dark);
        }
        .admin-module .card p {
          font-size: 0.85rem;
          color: var(--gray-600);
          margin-bottom: 0.5rem;
        }
        .admin-module .card .active {
          color: var(--primary);
          font-weight: 600;
          background: #e8f5e9;
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }
        .admin-module .card .inactive {
          color: #b91c1c;
          background: #ffebee;
          display: inline-block;
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
        }

        /* Modal overlay */
        .admin-module .modal-overlay {
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
        .admin-module .modal {
          background: white;
          border-radius: var(--radius);
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1.5rem;
          box-shadow: 0 20px 35px rgba(0,0,0,0.2);
        }
        .admin-module .modal.large {
          max-width: 950px;
        }
        .admin-module .modal h3 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--primary-dark);
        }

        /* Form elements */
        .admin-module .checkbox-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.2rem;
          background: var(--gray-100);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
        }
        .admin-module .form-group {
          margin-bottom: 1.5rem;
        }
        .admin-module .form-group label {
          font-weight: 600;
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.9rem;
        }

        /* Services tags */
        .admin-module .services-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .admin-module .service-tag {
          background: var(--gray-200);
          border: none;
          padding: 0.4rem 1rem;
          border-radius: 30px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--gray-800);
        }
        .admin-module .service-tag.selected {
          background: var(--primary);
          color: white;
          box-shadow: var(--shadow-sm);
        }

        /* Hours grid */
        .admin-module .hours-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-sm);
          padding: 1rem;
          background: var(--gray-100);
        }
        .admin-module .day-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--gray-300);
        }
        .admin-module .day-row:last-child {
          border-bottom: none;
        }
        .admin-module .day-name {
          width: 100px;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .admin-module .day-row label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-weight: normal;
          font-size: 0.8rem;
        }
        .admin-module .day-row input[type="time"] {
          padding: 0.4rem;
          border: 1px solid var(--gray-300);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
        }
        .admin-module .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        @media (max-width: 640px) {
          .admin-module .day-name { width: 70px; }
          .admin-module .day-row input[type="time"] { width: 100px; }
          .admin-module .filters .input, .admin-module .filters select { flex: 1 1 100%; }
          .admin-module .modal { padding: 1rem; }
        }
      `}</style>

      <div className="admin-module">
        <div className="container">
          <h2 className="title"><FaHospital /> Clinic Management</h2>

          <div className="filters">
            <input
              className="input"
              placeholder="🔍 Search clinic..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
            <select className="input" value={province} onChange={handleProvinceChange}>
              <option value="">All provinces</option>
              {Object.keys(districtsByProvince).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select className="input" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">All districts</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button className="btn primary" onClick={applyFilters}>Search</button>
            <button className="btn secondary" onClick={clearFilters}>Clear</button>
          </div>

          <div className={`status ${status.type}`}>{status.message}</div>

          <div className="grid">
            {filteredFacilities.map((facility) => (
              <div key={facility.id} className="card">
                <div>
                  <h3>{facility.name}</h3>
                  <p>{facility.district}, {facility.province}</p>
                  <span className={facility.is_active ? "active" : "inactive"}>
                    {facility.is_active ? "● Active" : "○ Inactive"}
                  </span>
                  <p style={{ marginTop: "0.75rem" }}>
                    <strong>Services:</strong>{" "}
                    {Array.isArray(facility.services_offered) && facility.services_offered.length
                      ? facility.services_offered.join(", ")
                      : "None listed"}
                  </p>
                </div>
                <button className="btn edit" onClick={() => openEditModal(facility)}>
                  ✏️ Edit facility
                </button>
              </div>
            ))}
          </div>

          {editingFacility && (
            <div className="modal-overlay" onClick={() => setEditingFacility(null)}>
              <div className="modal large" onClick={(e) => e.stopPropagation()}>
                <h3>✏️ {editingFacility.name}</h3>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={!!editingFacility.is_active}
                    onChange={(e) => setEditingFacility(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <span>✅ Facility is active (visible to users)</span>
                </label>

                <div className="form-group">
                  <label>🩺 Services Offered</label>
                  <div className="services-tags">
                    {SERVICE_OPTIONS.map((service) => {
                      const selected = editingFacility.services_offered?.includes(service) ?? false;
                      return (
                        <button
                          key={service}
                          type="button"
                          className={`service-tag ${selected ? "selected" : ""}`}
                          onClick={() => {
                            setEditingFacility(prev => {
                              const current = prev.services_offered ?? [];
                              const updated = current.includes(service)
                                ? current.filter(s => s !== service)
                                : [...current, service];
                              return { ...prev, services_offered: updated };
                            });
                          }}
                        >
                          {selected && "✓ "}{service}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>🕒 Operating Hours</label>
                  <div className="hours-grid">
                    {DAYS.map(day => (
                      <div key={day} className="day-row">
                        <div className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
                        <label>
                          <input
                            type="checkbox"
                            checked={editingFacility.operating_hours_form?.[day]?.closed ?? false}
                            onChange={e => updateHours(day, "closed", e.target.checked)}
                          />
                          Closed
                        </label>
                        <input
                          type="time"
                          className="input"
                          value={editingFacility.operating_hours_form?.[day]?.open ?? ""}
                          disabled={editingFacility.operating_hours_form?.[day]?.closed ?? false}
                          onChange={e => updateHours(day, "open", e.target.value)}
                        />
                        <input
                          type="time"
                          className="input"
                          value={editingFacility.operating_hours_form?.[day]?.close ?? ""}
                          disabled={editingFacility.operating_hours_form?.[day]?.closed ?? false}
                          onChange={e => updateHours(day, "close", e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn secondary" onClick={() => setEditingFacility(null)}>Cancel</button>
                  <button className="btn primary" onClick={saveFacilityChanges} disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
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