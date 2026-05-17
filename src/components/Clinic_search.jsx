import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Clinic_search.css";
import { FiGrid, FiCreditCard, FiMap, FiSearch, FiClock, FiCalendar, FiHash, FiBell, FiUser, FiSettings, FiFileText, FiLogOut, FiMapPin} from "react-icons/fi";
import { FaHospital } from "react-icons/fa";

// ================= HARDCODED DISTRICTS =================
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
  "General Consultation", "HIV Testing", "TB Screening", "Vaccination",
  "Maternal Care", "Child Health", "Family Planning", "Chronic Medication", "Emergency Care",
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// ================= HELPERS =================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function getClinicOpenStatus(hours) {
  if (!hours) return { open: false, text: "Hours not listed" };
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date();
  const today = dayNames[now.getDay()];
  const entry = hours[today];
  if (!entry || entry.closed || !entry.open || !entry.close) return { open: false, text: "Closed today" };
  const current = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = entry.open.split(":").map(Number);
  const [closeH, closeM] = entry.close.split(":").map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;
  if (current >= openTime && current < closeTime) return { open: true, text: `Open now · Closes ${entry.close}` };
  if (current < openTime) return { open: false, text: `Closed · Opens today ${entry.open}` };
  return { open: false, text: "Closed · Opens next working day" };
}

export default function ClinicSearch({ onBook }) {
  const navigate = useNavigate();
  const [nameSearch, setNameSearch] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [radius, setRadius] = useState("5");
  const [clinics, setClinics] = useState([]);
  const [status, setStatus] = useState({ type: "loading", message: '🔍 Use filters above or click "Clinics Near Me" to find clinics.' });
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const availableDistricts = province && districtsByProvince[province] ? districtsByProvince[province] : allDistricts;

  // ================= MAP INIT =================
  useEffect(() => {
    const scriptId = "google-maps-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyD6FjJh0F-AGUUQzQSlqUUwHsmi35FrCag&callback=__initClinicMap`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    window.__initClinicMap = () => {
      if (mapRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: -28.479, lng: 24.672 },
          zoom: 5,
          styles: [{ featureType: "poi.medical", elementType: "labels.icon", stylers: [{ color: "#1B5E20" }] }],
        });
      }
    };

    if (window.google && window.google.maps && mapRef.current && !mapInstanceRef.current) {
      window.__initClinicMap();
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // ================= MAP MARKERS =================
  const updateMapMarkers = useCallback((displayedClinics) => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();

    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: userLocation, map, title: "You are here",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#1B5E20", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" },
      });
      markersRef.current.push(userMarker);
      bounds.extend(userLocation);
    }

    displayedClinics.forEach((clinic) => {
      if (clinic.latitude && clinic.longitude) {
        const pos = { lat: parseFloat(clinic.latitude), lng: parseFloat(clinic.longitude) };
        const marker = new window.google.maps.Marker({
          position: pos, map, title: clinic.name || "Clinic",
          icon: { url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", scaledSize: new window.google.maps.Size(32, 32) },
        });
        const infoWindow = new window.google.maps.InfoWindow();
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
        infoWindow.setContent(`
          <div style="font-family: system-ui; padding: 4px;">
            <strong style="color: #1B5E20;">${clinic.name}</strong>
            <p style="margin: 6px 0; font-size: 0.85rem;">${clinic.district || ""}</p>
            <a href="${mapsUrl}" target="_blank" style="color: #1B5E20; text-decoration: none; font-weight: 500;">🚗 Get Directions</a>
          </div>
        `);
        marker.addListener("click", () => infoWindow.open(map, marker));
        markersRef.current.push(marker);
        bounds.extend(pos);
      }
    });

    if (displayedClinics.length || userLocation) {
      map.fitBounds(bounds);
      if (displayedClinics.length === 1 && !userLocation) map.setZoom(12);
    }
  }, [userLocation]);

  // ================= SEARCH CLINICS =================
  const searchClinics = useCallback(async (name, prov, dist, service) => {
    setStatus({ type: "loading", message: "🔍 Searching clinics..." });
    setClinics([]);

    try {
      const body = {
        search_name: name && name.trim() !== "" ? name.trim() : null,
        search_province: prov && prov !== "" ? prov : null,
        search_district: dist && dist !== "" ? dist : null,
      };

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/search_clinics`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP ${response.status}: ${errorText}`); }

      let results = await response.json();
      if (service) {
        results = results.filter((clinic) => Array.isArray(clinic.services_offered) && clinic.services_offered.includes(service));
      }

      const withDistance = results.map((c) => ({
        ...c,
        distance: userLocation && c.latitude && c.longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, parseFloat(c.latitude), parseFloat(c.longitude))
          : null,
      }));

      if (userLocation) withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

      const titleParts = [];
      if (body.search_name)     titleParts.push(`name: "${body.search_name}"`);
      if (body.search_province) titleParts.push(`province: ${body.search_province}`);
      if (body.search_district) titleParts.push(`district: ${body.search_district}`);
      if (service)              titleParts.push(`service: ${service}`);
      const title = titleParts.length ? titleParts.join(", ") : "all clinics (no filters)";

      if (!withDistance.length) {
        setStatus({ type: "error", message: `😕 No clinics found for "${title}".` });
      } else {
        setStatus({ type: "count", message: `📋 ${withDistance.length} clinic(s) – ${title}` });
        setClinics(withDistance);
        updateMapMarkers(withDistance);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: `❌ Search failed: ${err.message}` });
    }
  }, [userLocation, updateMapMarkers]);

  // ================= NEARBY CLINICS =================
  const performNearbySearch = useCallback(async (loc) => {
    const r = parseFloat(radius);
    setStatus({ type: "loading", message: `📡 Searching clinics within ${r} km...` });
    setClinics([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/nearby_clinics`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_lat: loc.lat, user_lng: loc.lng, radius_km: r }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      let results = await response.json();
      if (selectedService) {
        results = results.filter((clinic) => Array.isArray(clinic.services_offered) && clinic.services_offered.includes(selectedService));
      }
      results = results.map((c) => ({
        ...c,
        distance: c.distance ?? calculateDistance(loc.lat, loc.lng, parseFloat(c.latitude), parseFloat(c.longitude)),
      }));
      results.sort((a, b) => a.distance - b.distance);

      if (!results.length) {
        setStatus({ type: "error", message: `😕 No clinics found within ${r} km of you.` });
      } else {
        setStatus({ type: "count", message: `📋 ${results.length} clinic(s) – within ${r} km of you` });
        setClinics(results);
        updateMapMarkers(results);
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: `❌ Error fetching nearby clinics: ${err.message}` });
    }
  }, [radius, selectedService, updateMapMarkers]);

  const findNearbyClinics = useCallback(() => {
    if (!navigator.geolocation) { setStatus({ type: "error", message: "❌ Geolocation not supported." }); return; }
    if (userLocation) {
      performNearbySearch(userLocation);
    } else {
      setStatus({ type: "loading", message: "📍 Getting your location..." });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          performNearbySearch(loc);
        },
        (err) => {
          let msg = "Unable to get location. ";
          if (err.code === 1) msg += "Permission denied.";
          else if (err.code === 2) msg += "Position unavailable.";
          else if (err.code === 3) msg += "Timeout.";
          setStatus({ type: "error", message: `❌ ${msg}` });
        }
      );
    }
  }, [userLocation, performNearbySearch]);

  const applyFilters = () => searchClinics(nameSearch, province, district, selectedService);

  const handleProvinceChange = (e) => { setProvince(e.target.value); setDistrict(""); };

  return (
    <main className="cs-wrapper">
      <h2><FaHospital aria-hidden="true" /> South African Clinics</h2>

      {/* Main filter row */}
      <search>
        <fieldset className="filter-row">
          <legend className="sr-only">Search filters</legend>

          <section className="filter-group">
            <label htmlFor="filter-name"><FiCreditCard aria-hidden="true" /> Clinic name</label>
            <input
              id="filter-name"
              type="text"
              placeholder="e.g., Tygerberg"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
            />
          </section>

          <section className="filter-group">
            <label htmlFor="filter-province"><FiMap aria-hidden="true" /> Province</label>
            <select id="filter-province" value={province} onChange={handleProvinceChange}>
              <option value="">Any province</option>
              {Object.keys(districtsByProvince).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </section>

          <section className="filter-group">
            <label htmlFor="filter-district"><FiMapPin aria-hidden="true" /> District</label>
            <select id="filter-district" value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="">Any district</option>
              {availableDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </section>

          <section className="filter-group">
            <label htmlFor="filter-service">Services</label>
            <select id="filter-service" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">Any service</option>
              {SERVICE_OPTIONS.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
          </section>

          <section className="filter-group">
            <button onClick={applyFilters}><FiSearch aria-hidden="true" /> Apply filters</button>
          </section>
        </fieldset>

        {/* Nearby row */}
        <div className="nearby-row">
          <div className="filter-group-inline">
            <button id="nearMeBtn" onClick={findNearbyClinics}><FiMapPin aria-hidden="true" /> Clinics Near Me</button>
            <label htmlFor="radius-select" className="sr-only">Search radius</label>
            <select id="radius-select" value={radius} onChange={(e) => setRadius(e.target.value)}>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </div>
        </div>
      </search>

      {/* Status message */}
      <p role="status" className={status.type}>{status.message}</p>

      {/* Clinic cards */}
      <ul className="clinic-list">
        {clinics.map((clinic) => {
          const distanceText = clinic.distance !== null && clinic.distance !== undefined
            ? `${clinic.distance.toFixed(1)} km away`
            : "Distance unknown";
          const openStatus = getClinicOpenStatus(clinic.operating_hours);
          const bookUrl = `/clinic?id=${clinic.id}`;

          return (
            <li key={clinic.id}>
              <article className="clinic-card">
                <section className="clinic-info">
                  <h3 className="clinic-name">{clinic.name}</h3>
                  <p className="clinic-distance"><FiMapPin aria-hidden="true" /> {distanceText}</p>
                  <p className="clinic-district">
                    {clinic.district || ""}
                    {clinic.province ? `, ${clinic.province}` : ""}
                  </p>

                  <section className="clinic-services">
                    <h4>Services</h4>
                    {Array.isArray(clinic.services_offered) && clinic.services_offered.length > 0 ? (
                      <ul className="clinic-service-tags">
                        {clinic.services_offered.map((service) => (
                          <li key={service} className="clinic-service-tag">{service}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="clinic-empty">No services listed</p>
                    )}
                  </section>

                  <p className="clinic-hours">
                    <strong>Working hours:</strong>{" "}
                    <mark className={`clinic-open-badge ${openStatus.open ? "open" : "closed"}`}>
                      {openStatus.text}
                    </mark>
                  </p>
                </section>

                <button className="book-btn" onClick={() => onBook(clinic.id)}>
                  <FiCalendar aria-hidden="true" /> Book now
                </button>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Map */}
      <figure id="map" ref={mapRef} aria-label="Clinic locations map" />
    </main>
  );
}