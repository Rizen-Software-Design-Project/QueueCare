import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "npm:emailjs@4.0.3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { patient_id, facility_id, slot_id, reason } = await req.json();

    if (!patient_id || !slot_id) {
      return new Response(
        JSON.stringify({ error: "patient_id and slot_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch patient profile, slot, and facility data
    const [profileRes, slotRes, facilityRes] = await Promise.all([
      supabase.from("profiles").select("email, name, surname").eq("id", patient_id).single(),
      supabase.from("appointment_slots").select("slot_date, slot_time, duration_minutes").eq("id", slot_id).single(),
      supabase.from("facilities").select("name").eq("id", facility_id).single(),
    ]);

    // Get patient email (profile first, then auth.users fallback)
    let patientEmail = profileRes.data?.email;
    if (!patientEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(patient_id);
      patientEmail = authUser?.user?.email;
    }

    if (!patientEmail) {
      return new Response(
        JSON.stringify({ message: "No email found, skipped" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const patientName = profileRes.data?.name || "Patient";
    const slotDate = slotRes.data?.slot_date || "TBD";
    const slotTime = slotRes.data?.slot_time ? slotRes.data.slot_time.slice(0, 5) : "TBD";
    const duration = slotRes.data?.duration_minutes || "";
    const facilityName = facilityRes.data?.name || "the clinic";

    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    const client = new SMTPClient({
      user: smtpUser,
      password: smtpPass,
      host: "smtp.zoho.com",
      ssl: true,
    });

    await client.sendAsync({
      from: `QueueCare <${smtpUser}>`,
      to: patientEmail,
      subject: `Appointment Confirmed – ${facilityName}`,
      attachment: [
        {
          data: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1976d2;">Appointment Confirmed ✅</h2>
              <p>Hi ${patientName},</p>
              <p>Your appointment has been booked successfully.</p>
              <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                <tr><td style="padding: 8px; font-weight: bold;">Clinic</td><td style="padding: 8px;">${facilityName}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Date</td><td style="padding: 8px;">${slotDate}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Time</td><td style="padding: 8px;">${slotTime}</td></tr>
                ${duration ? `<tr><td style="padding: 8px; font-weight: bold;">Duration</td><td style="padding: 8px;">${duration} minutes</td></tr>` : ""}
                <tr><td style="padding: 8px; font-weight: bold;">Reason</td><td style="padding: 8px;">${(reason || "").trim()}</td></tr>
              </table>
              <p>Please arrive a few minutes early.</p>
              <p style="color: #888; font-size: 12px;">— QueueCare Team</p>
            </div>
          `,
          alternative: true,
        },
      ],
    });

    return new Response(
      JSON.stringify({ message: "Email sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Send confirmation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
