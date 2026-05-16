import express from 'express';
import nodemailer from 'nodemailer';
import env from 'dotenv';

env.config();

const router = express.Router();



// ── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

transporter.verify()
    .then(() => console.log('SMTP ready'))
    .catch((err) => console.error('SMTP failed:', err.message));


const applicationEmailHtml = (name, role, status) => {
    const configs = {
        submitted: {
            icon: '📋',
            heading: `Application Received`,
            color: '#0F6E56',
            message: `Thank you for applying for the <strong>${role}</strong> role on QueueCare. Your application has been received and is currently under review. We will notify you once a decision has been made.`,
        },
        approved: {
            icon: '✅',
            heading: `Application Approved`,
            color: '#16a34a',
            message: `Congratulations! Your application for the <strong>${role}</strong> role has been approved. You can now sign in and access your dashboard.`,
        },
        rejected: {
            icon: '❌',
            heading: `Application Unsuccessful`,
            color: '#dc2626',
            message: `Unfortunately, your application for the <strong>${role}</strong> role was not approved at this time. Please contact support if you have any questions.`,
        },
        reassigned: {
            icon: '🔄',
            heading: `Role Reassigned`,
            color: '#f59e0b',
            message: `Your role has been updated to <strong>${role}</strong>. Please sign in to see your new permissions and dashboard.`,
        },
        removed: {
            icon: '🗑️',
            heading: `Assignment Removed`,
            color: '#dc2626',
            message: `You are no longer assigned to a clinic. Please contact support if you believe this is a mistake.`,
            }
    };

    const cfg = configs[status] || configs.submitted;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: ${cfg.color}; padding: 24px;">
            <h2 style="color: #ffffff; margin: 0;">${cfg.icon} ${cfg.heading}</h2>
        </div>
        <div style="padding: 24px;">
            <p>Hi ${name},</p>
            <p>${cfg.message}</p>
            <p style="color: #aaa; font-size: 12px;">— QueueCare Team</p>
        </div>
    </div>`;
};

const sendApplicationEmail = async (req, res) => {
    try {
        const { email, name, role, status } = req.body;

        if (!email || !name || !role || !status) {
            return res.status(400).json({ error: 'email, name, role, and status are required' });
        }
        const validStatuses = ["submitted", "approved", "rejected", "reassigned", "removed"];

        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid application status" });
        }

        const subjects = {
            submitted: `Application Received – ${role} role`,
            approved:  `Application Approved – ${role} role`,
            rejected:  `Application Update – ${role} role`,
            reassigned: `Role Reassigned – ${role} role`,
            removed: `Role Removed – ${role} role`,
        };

        await transporter.sendMail({
            from: `"QueueCare" <${process.env.SMTP_USER}>`,
            to: email,
            subject: subjects[status] || `Application Update`,
            html: applicationEmailHtml(name, role, status),
        });

        return res.status(200).json({ message: 'Application email sent' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
router.post('/application/send-email', sendApplicationEmail);

export default router;