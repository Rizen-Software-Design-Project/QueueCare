import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Clinic_search.css";

// ================= CONFIG =================
const SUPABASE_URL = "https://vktjtxljwzyakobkkhol.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdGp0eGxqd3p5YWtvYmtraG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE1ODYsImV4cCI6MjA5MTE1NzU4Nn0.LVNelw--Xp1t_weGNwhPGMrzqg0iS7J5TAXw9ZM6aUA";

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

export default function ClinicSearch() {
  const navigate = useNavigate();
  const [nameSearch, setNameSearch] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
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
  const updateMapMarkers = useCallback(
    (displayedClinics) => {
      const map = mapInstanceRef.current;
      if (!map || !window.google) return;

      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      const bounds = new window.google.maps.LatLngBounds();

      if (userLocation) {
        const userMarker = new window.google.maps.Marker({
          position: userLocation,
          map,
          title: "You are here",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
        markersRef.current.push(userMarker);
        bounds.extend(userLocation);
      }

      displayedClinics.forEach((clinic) => {
        if (clinic.latitude && clinic.longitude) {
          const pos = { lat: parseFloat(clinic.latitude), lng: parseFloat(clinic.longitude) };
          const marker = new window.google.maps.Marker({
            position: pos,
            map,
            title: clinic.name || "Clinic",
            icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
          });
          const infoWindow = new window.google.maps.InfoWindow();
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
          infoWindow.setContent(`<h3>${clinic.name}</h3><p>${clinic.district || ""}</p><a href="${mapsUrl}" target="_blank">🚗 Get Directions</a>`);
          marker.addListener("click", () => infoWindow.open(map, marker));
          markersRef.current.push(marker);
          bounds.extend(pos);
        }
      });

      if (displayedClinics.length || userLocation) {
        map.fitBounds(bounds);
        if (displayedClinics.length === 1 && !userLocation) map.setZoom(12);
      }
    },
    [userLocation]
  );

  // ================= SEARCH CLINICS =================
  const searchClinics = useCallback(
    async (name, prov, dist) => {
      setStatus({ type: "loading", message: "🔍 Searching..." });
      setClinics([]);

      try {
        const body = {
          search_name: name && name.trim() !== "" ? name.trim() : null,
          search_province: prov && prov !== "" ? prov : null,
          search_district: dist && dist !== "" ? dist : null,
        };

        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_clinics`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        let results = await response.json();

        const withDistance = results.map((c) => ({
          ...c,
          distance:
            userLocation && c.latitude && c.longitude
              ? calculateDistance(userLocation.lat, userLocation.lng, parseFloat(c.latitude), parseFloat(c.longitude))
              : null,
        }));

        if (userLocation) {
          withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        const titleParts = [];
        if (body.search_name) titleParts.push(`name: "${body.search_name}"`);
        if (body.search_province) titleParts.push(`province: ${body.search_province}`);
        if (body.search_district) titleParts.push(`district: ${body.search_district}`);
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
    },
    [userLocation, updateMapMarkers]
  );

  // ================= NEARBY CLINICS =================
  const performNearbySearch = useCallback(
    async (loc) => {
      const r = parseFloat(radius);
      setStatus({ type: "loading", message: `📡 Searching clinics within ${r} km...` });
      setClinics([]);

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/nearby_clinics`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_lat: loc.lat, user_lng: loc.lng, radius_km: r }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        let results = await response.json();
        results = results.map((c) => ({
          ...c,
          distance:
            c.distance ??
            calculateDistance(loc.lat, loc.lng, parseFloat(c.latitude), parseFloat(c.longitude)),
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
    },
    [radius, updateMapMarkers]
  );

  const findNearbyClinics = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus({ type: "error", message: "❌ Geolocation not supported." });
      return;
    }

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

  // ================= APPLY FILTERS =================
  const applyFilters = () => searchClinics(nameSearch, province, district);

  const handleProvinceChange = (e) => {
    setProvince(e.target.value);
    setDistrict("");
  };

  return (
    <div className="cs-wrapper">
      <h2>🏥 South African Clinics</h2>

      {/* Main filter row */}
      <div className="filter-row">
        <div className="filter-group">
          <label>🏷️ Clinic name</label>
          <input
            type="text"
            placeholder="e.g., Tygerberg"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
          />
        </div>
        <div className="filter-group">
          <label>🗺️ Province</label>
          <select value={province} onChange={handleProvinceChange}>
            <option value="">-- Any province --</option>
            {Object.keys(districtsByProvince).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>📍 District</label>
          <select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">-- Any district --</option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <button onClick={applyFilters}>🔍 Apply filters</button>
        </div>
      </div>

      {/* Nearby row */}
      <div className="nearby-row">
        <div className="filter-group-inline">
          <button id="nearMeBtn" onClick={findNearbyClinics}>📍 Clinics Near Me</button>
          <select value={radius} onChange={(e) => setRadius(e.target.value)}>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
        </div>
      </div>

      {/* Status message */}
      <div className={status.type}>{status.message}</div>

      {/* Clinic cards */}
      {clinics.map((clinic) => {
        const distanceText =
          clinic.distance !== null && clinic.distance !== undefined
            ? `${clinic.distance.toFixed(1)} km away`
            : "Distance unknown";
        const bookUrl = `/clinic?id=${clinic.id}&name=${encodeURIComponent(clinic.name)}`;
        return (
          <div key={clinic.id} className="clinic-card">
            <div className="clinic-info">
              <div className="clinic-name">{clinic.name}</div>
              <div className="clinic-distance">📍 {distanceText}</div>
              <div className="clinic-district">
                {clinic.district || ""}
                {clinic.province ? `, ${clinic.province}` : ""}
              </div>
            </div>
            <button className="book-btn" onClick={() => navigate(bookUrl)}>
              📅 Book now
            </button>
          </div>
        );
      })}

      {/* Map */}
      <div id="map" ref={mapRef}></div>
    </div>
  );
}