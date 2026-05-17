import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import "./ProfilePage.css";

export default function ProfilePage({ profile: propProfile }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Use route state if the prop isn't provided
const storedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");

const profile =
  propProfile ??
  location.state?.profile ??
  location.state?.staff ??
  location.state?.patient ??
  location.state?.admin ??
  storedProfile ??
  null;

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name || "",
    surname: profile?.surname || "",
    phone_number: profile?.phone_number || "",
    dob: profile?.dob || "",
  });
  useEffect(() => {
  if (profile) {
    setForm({
      name: profile.name || "",
      surname: profile.surname || "",
      phone_number: profile.phone_number || "",
      dob: profile.dob || "",
    });
  }
}, [profile]);
  
  if (!profile) return (
  <div className="profile-root">
    <div className="profile-card">
      <div className="profile-skeleton">
        <div className="skel-avatar" />
        <div className="skel-line" style={{ width: "60%" }} />
        <div className="skel-line" style={{ width: "80%" }} />
        <div className="skel-line" style={{ width: "40%" }} />
      </div>
    </div>
  </div>
);
  async function handleSave() {
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update(form)
      .eq("id", profile.id);

    if (!error) {
      setEditMode(false);
    }

    setSaving(false);
  }
const role =
  profile?.role ||
  (location.state?.staff
    ? "staff"
    : location.state?.admin
    ? "admin"
    : "patient");

  return (
    <div className="profile-root">
      <div className="profile-card">

        {/* Header */}
        <div className="profile-header">
          <h2>My Profile</h2>
          <button className="profile-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        {/* Avatar */}
        <div className="profile-avatar">
          {profile?.name?.[0]}
        </div>

        {/* Info */}
        <div className="profile-fields">

          <Field
            label="First Name"
            value={form.name}
            disabled={!editMode}
            onChange={(v) => setForm({ ...form, name: v })}
          />

          <Field
            label="Surname"
            value={form.surname}
            disabled={!editMode}
            onChange={(v) => setForm({ ...form, surname: v })}
          />

          <Field
            label="Phone"
            value={form.phone_number}
            disabled={!editMode}
            onChange={(v) => setForm({ ...form, phone_number: v })}
          />

          <Field
            label="Date of Birth"
            type="date"
            value={form.dob}
            disabled={!editMode}
            onChange={(v) => setForm({ ...form, dob: v })}
          />

          <div className="profile-static">
            <label>Email</label>
            <span>{profile.email}</span>
          </div>

          <div className="profile-static">
            <label>Role</label>
            <span>{role}</span>
          </div>

        </div>

        {/* Actions */}
        <div className="profile-actions">
          {!editMode ? (
            <button onClick={() => setEditMode(true)}>Edit Profile</button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }) {
  return (
    <div className="profile-field">
      <label>{label}</label>
      <input
        type={type}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}