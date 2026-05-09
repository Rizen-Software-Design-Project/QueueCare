import { useEffect, useMemo, useState } from "react";
import { supabase } from "#lib/supabase";  
import { FiGrid, FiCreditCard, FiMap, FiSearch, FiClock, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText, FiLogOut, FiMapPin} from "react-icons/fi";
import { FaHospital } from "react-icons/fa";
import "./AdminClinics.css"


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
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/search_clinics_admin`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
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