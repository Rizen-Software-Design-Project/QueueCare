import { useState, useEffect, useRef } from "react";

const sections = [
  {
    id: "terms",
    icon: "📋",
    label: "Terms of Use",
    title: "Institutional Ground Rules",
    lastUpdated: "16 May 2026",
    content: [
      {
        heading: "What you're legally locking in for",
        body:
          "By using the QueueCare platform, including the web or mobile application, you agree to be bound by these Terms of Use. If you do not agree with any part of these terms, you must stop using the service. QueueCare operates under South African law, including the Electronic Communications and Transactions Act (ECTA).",
      },
      {
        heading: "Account eligibility and access boundaries",
        body:
          "QueueCare is intended for users aged 18 and older. If you are booking on behalf of a minor, you must be the parent or legal guardian. Clinical staff accounts are restricted and created through internal administration only. Self-registration for staff accounts is not available.",
      },
      {
        heading: "Our zero-tolerance stance on system abuse",
        body:
          "Users may not manipulate bookings, reserve slots without intent to attend, or interfere with system functionality. Identity fraud and system exploitation are strictly prohibited. Accounts found engaging in abuse may be suspended or permanently blocked.",
      },
      {
        heading: "The reality of slot availability",
        body:
          "Appointment availability depends on participating clinics. Slots are only displayed when provided by the relevant facility. QueueCare reflects this information in real time and does not guarantee availability.",
      },
      {
        heading: "Live line updates and waiting expectations",
        body:
          "Once a booking is confirmed, users are placed in the active queue. Estimated waiting times are provided for guidance only. These estimates may change due to clinic workload, emergencies, or operational delays. QueueCare is not responsible for delays on site.",
      },
    ],
  },
  {
    id: "privacy",
    icon: "🔒",
    label: "Privacy Policy",
    title: "Data Stewardship & Protection",
    lastUpdated: "16 May 2026",
    content: [
      {
        heading: "The specific parameters of what we track",
        body:
          "QueueCare collects only the information required to manage bookings and queue positions. This includes your name, email, phone number, and identification number. We also collect your selected facility. Medical records and clinical history are not collected or stored.",
      },
      {
        heading: "How your information is processed",
        body:
          "Your information is used to validate bookings, manage queue placement, and send notifications. Processing is carried out in line with the Protection of Personal Information Act (POPIA).",
      },
      {
        heading: "Our strict anti-brokerage policy",
        body:
          "QueueCare does not sell, rent, or share personal information with third parties for commercial purposes. Data is only shared with the selected healthcare facility to support service delivery.",
      },
      {
        heading: "Exercising your POPIA rights",
        body:
          "You may request access to your personal data, request corrections, or request deletion where applicable under POPIA. Requests can be sent to privacy@queuecare.co.za.",
      },
      {
        heading: "Cookies and tracking",
        body:
          "QueueCare uses basic session cookies to maintain authentication and system functionality. No third-party tracking tools or advertising pixels are used.",
      },
    ],
  },
  {
    id: "cancellation",
    icon: "🗓️",
    label: "Cancellation & No-show",
    title: "Cancellations & Missed Windows",
    lastUpdated: "16 May 2026",
    content: [
      {
        heading: "The procedure for withdrawing a booking",
        body:
          "Appointments may be cancelled through the user dashboard. Cancellations should be made at least 2 hours before the scheduled time. This allows the slot to be made available to other users.",
      },
      {
        heading: "The consequences of late cancellations",
        body:
          "Late cancellations reduce clinic efficiency and may result in restrictions. Repeated late cancellations within a 30-day period may lead to temporary booking limitations.",
      },
      {
        heading: "Failing to check in (No-show policy)",
        body:
          "Failure to attend a scheduled appointment without cancellation will be recorded as a no-show. Multiple no-shows may result in temporary account restrictions.",
      },
      {
        heading: "What happens when a clinic cancels",
        body:
          "If a clinic cancels due to operational issues, users will be notified immediately. No penalties apply in these cases, and affected users may be prioritised for rebooking.",
      },
      {
        heading: "Responding to your queue call",
        body:
          "When called, users must be present at reception. Failure to check in within the required timeframe may result in the appointment being forfeited.",
      },
    ],
  },
  {
    id: "staff",
    icon: "🏥",
    label: "Staff & Admin Policy",
    title: "Clinical Staff Operational Protocols",
    lastUpdated: "16 May 2026",
    content: [
      {
        heading: "Securing administrative credentials",
        body:
          "Staff accounts are created through an internal registration process. Verification of employment and role is required before access is granted.",
      },
      {
        heading: "Our verification pipeline",
        body:
          "All staff accounts are verified with the relevant healthcare facility before activation. This process typically takes 3 to 5 business days.",
      },
      {
        heading: "Account security mandates",
        body:
          "Login credentials are personal and must not be shared. Access must comply with POPIA and applicable healthcare regulations.",
      },
      {
        heading: "Revocation of access",
        body:
          "Access may be suspended or revoked in cases of policy violations, security risks, or employment termination.",
      },
    ],
  },
  {
    id: "data",
    icon: "🛡️",
    label: "Data & Security",
    title: "Infrastructure & Server Integrity",
    lastUpdated: "16 May 2026",
    content: [
      {
        heading: "Data hosting and encryption",
        body:
          "QueueCare stores data on encrypted servers located within South Africa. Data at rest uses AES-256 encryption. Data in transit uses TLS 1.3.",
      },
      {
        heading: "Internal access limitations",
        body:
          "Access to personal information is restricted to authorised personnel. Access is granted only where required for service operation.",
      },
      {
        heading: "Security incident response",
        body:
          "If a security incident involving personal information occurs, affected users and relevant authorities will be notified in accordance with applicable law.",
      },
      {
        heading: "Responsible disclosure",
        body:
          "Security vulnerabilities may be reported to security@queuecare.co.za. All good-faith reports will be reviewed and addressed.",
      },
    ],
  },
];

export default function QueueCarePolicy() {
  return (
    <section style={{ padding: "20px" }}>
      <h1>QueueCare Policies</h1>
      <p>This page outlines the terms and operational policies of QueueCare.</p>

      <hr />

      <section>
        <p>
          QueueCare operates under the Protection of Personal Information Act
          (POPIA) 4 of 2013, the National Health Act 61 of 2003, and the
          Electronic Communications and Transactions Act 25 of 2002.
        </p>
      </section>

      <hr />

      {sections.map((section) => (
        <section
          key={section.id}
          style={{
            marginBottom: "40px",
            border: "1px solid black",
            padding: "10px",
          }}
        >
          <h2>
            {section.icon} {section.title} ({section.label})
          </h2>
          <p>Last updated: {section.lastUpdated}</p>

          <div style={{ marginTop: "15px", paddingLeft: "10px" }}>
            {section.content.map((item, index) => (
              <div key={index} style={{ marginBottom: "20px" }}>
                <h3>{item.heading}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <hr />

      <footer>
        <h3>Support</h3>
        <p>
          Support is available Monday to Friday, 08:00 to 17:00 SAST. Contact
          support@queuecare.co.za or use the in-app help centre.
        </p>
        <p>
          © 2026 QueueCare (Pty) Ltd. All rights reserved. Registered in South
          Africa.
        </p>
      </footer>
    </section>
  );
}
