import { useState, useEffect } from "react";
import { supabase } from "#lib/supabase";
import "./ProfilePage.css";

export default function ProfilePage({ profile: propProfile, onBack }) {
  const storedProfile = JSON.parse(localStorage.getItem("userProfile") || "null");
  const profile = propProfile ?? storedProfile ?? null;

  const [editMode, setEditMode] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    name:         profile?.name         || "",
    surname:      profile?.surname      || "",
    phone_number: profile?.phone_number || "",
    dob:          profile?.dob          || "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name:         profile.name         || "",
        surname:      profile.surname      || "",
        phone_number: profile.phone_number || "",
        dob:          profile.dob          || "",
      });
    }
  }, [profile]);

  if (!profile) return (
    <section className="profile-root">
      <section className="profile-card">
        <section className="profile-skeleton">
          <section className="skel-avatar" />
          <section className="skel-line" style={{ width: "60%" }} />
          <section className="skel-line" style={{ width: "80%" }} />
          <section className="skel-line" style={{ width: "40%" }} />
        </section>
      </section>
    </section>
  );

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", profile.id);
    if (!error) setEditMode(false);
    setSaving(false);
  }

  const role = profile?.role || "patient";

  return (
    <section className="profile-root">
      <section className="profile-card">
        <section className="profile-header">
          <h2>My Profile</h2>
          {onBack && <button className="profile-back" onClick={onBack}>← Back</button>}
        </section>

        <section className="profile-avatar">{profile?.name?.[0]}</section>

        <section className="profile-fields">
          <Field label="First Name"    value={form.name}         disabled={!editMode} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Surname"       value={form.surname}      disabled={!editMode} onChange={(v) => setForm({ ...form, surname: v })} />
          <Field label="Phone"         value={form.phone_number} disabled={!editMode} onChange={(v) => setForm({ ...form, phone_number: v })} />
          <Field label="Date of Birth" value={form.dob}          disabled={!editMode} onChange={(v) => setForm({ ...form, dob: v })} type="date" />
          <section className="profile-static"><label>Email</label><section>{profile.email}</section></section>
          <section className="profile-static"><label>Role</label><section>{role}</section></section>
        </section>

        <section className="profile-actions">
          {!editMode ? (
            <button onClick={() => setEditMode(true)}>Edit Profile</button>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditMode(false)}>Cancel</button>
            </>
          )}
        </section>
      </section>
    </section>
  );
}

function Field({ label, value, onChange, disabled, type = "text" }) {
  return (
    <section className="profile-field">
      <label>{label}</label>
      <input type={type} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </section>
  );
}