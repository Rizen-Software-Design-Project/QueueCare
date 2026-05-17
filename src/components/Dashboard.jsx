// Dashboard.jsx — auth router only
// Loads profile, then renders the correct role dashboard.

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { supabase } from "#lib/supabase";
import { useNavigate } from "react-router-dom";

import PatientDashboard from "./PatientDashboard";
import StaffDashboard   from "./StaffDashboard";
import AdminDashboard   from "./AdminDashboard";

export default function Dashboard() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let unsubFirebase = null;

    async function resolveIdentity(firebaseUser) {
      if (firebaseUser || auth.currentUser) {
        const fb = firebaseUser || auth.currentUser;
        return { authProvider: "firebase", providerUserId: fb.uid };
      }
      /* v8 ignore next 3 */
      const { data } = await supabase.auth.getUser();
      if (data?.user) return { authProvider: "supabase", providerUserId: data.user.id };
      return null;
    }

    unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      const identity = await resolveIdentity(firebaseUser);

      /* v8 ignore next 4 */
      if (!identity) {
        setLoading(false);
        navigate("/signin", { replace: true });
        return;
      }

      const { authProvider, providerUserId } = identity;

      // Persist identity for components that read from localStorage
      localStorage.setItem(
        "userIdentity",
        JSON.stringify({ auth_provider: authProvider, provider_user_id: providerUserId })
      );

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_provider", authProvider)
        .eq("provider_user_id", providerUserId)
        .maybeSingle();

      if (cancelled) return;

      if (!prof) {
        // Check for pending application
        const { data: app } = await supabase
          .from("role_applications")
          .select("requested_role, status")
          .eq("auth_provider", authProvider)
          .eq("provider_user_id", providerUserId)
          .order("submitted_at", { ascending: false })
          .maybeSingle();

        const msg =
          app?.status === "pending"   ? `Your ${app.requested_role} application is still pending approval.`
          : app?.status === "rejected" ? `Your ${app.requested_role} application was rejected.`
          : null;

        navigate("/signin", { replace: true, state: msg ? { pendingMessage: msg } : undefined });
        setLoading(false);
        return;
      }

      if (!cancelled) {
        setProfile(prof);
        setLoading(false);
      }
    });

    return () => { cancelled = true; if (unsubFirebase) unsubFirebase(); };
  }, [navigate]);

  if (loading) {
    return (
      <div className="db-splash">
        <div className="db-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (!profile) return null;

  if (profile.role === "patient") return <PatientDashboard profile={profile} />;
  if (profile.role === "staff")   return <StaffDashboard   profile={profile} />;
  if (profile.role === "admin")   return <AdminDashboard   profile={profile} />;

  return (
    <div className="db-splash">
      <p>Unknown role: {profile.role}. Please contact support.</p>
    </div>
  );
}