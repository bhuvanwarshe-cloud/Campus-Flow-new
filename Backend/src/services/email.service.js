/**
 * Email Service
 * Sends transactional emails using Nodemailer with Gmail SMTP.
 * This is the sole email transport for CampusFlow.
 *
 * Required environment variables:
 *   EMAIL_USER  - Gmail address (e.g. campusflow7@gmail.com)
 *   EMAIL_PASS  - Gmail App Password (NOT the account password)
 *   FRONTEND_URL / APP_URL - Base URL for invite links
 */

import nodemailer from "nodemailer";
import { COLLEGE_NAME, COLLEGE_ACRONYM } from "../constants/college.js";
import { AppError } from "../utils/errorHandler.js";

// ---------------------------------------------------------------------------
// Transporter (reused across all calls)
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a teacher invite email via Gmail SMTP.
 *
 * @param {Object} params
 * @param {string} params.email      - Recipient teacher email
 * @param {string} params.token      - Invite token (included in link)
 * @param {string} params.inviteLink - Full invite URL
 * @returns {Promise<Object>} Delivery result
 */
export async function sendTeacherInviteEmail({ email, token, inviteLink }) {
  if (!email || !inviteLink) {
    throw new AppError("Email and invite link are required", 400);
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new AppError(
      "Gmail credentials are not configured. Set EMAIL_USER and EMAIL_PASS in .env",
      500
    );
  }

  let info;
  try {
    info = await transporter.sendMail({
      from: `"CampusFlow ${COLLEGE_ACRONYM}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Invitation to Join CampusFlow",
      html: buildInviteHtml(email, inviteLink),
    });
  } catch (err) {
    console.error("[EmailService] Gmail send failed:", err);
    throw new AppError(`Failed to send email: ${err.message}`, 500);
  }

  // Delivery confirmation log
  console.log("[EmailService] Invite email sent successfully");
  console.log("  → messageId :", info.messageId);
  console.log("  → accepted  :", info.accepted);
  console.log("  → rejected  :", info.rejected);

  return {
    success: true,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    service: "gmail",
  };
}

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------

function buildInviteHtml(email, inviteLink) {
  const recipientName = email.split("@")[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
      padding: 28px 24px;
      text-align: center;
    }
    .header .logo {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .header .college {
      font-size: 13px;
      color: #bae6fd;
      margin-top: 4px;
    }
    .content {
      padding: 32px 28px;
    }
    h2 {
      color: #111827;
      font-size: 20px;
      margin-top: 0;
    }
    p {
      color: #4b5563;
      font-size: 15px;
    }
    .role-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin: 4px 0 16px;
    }
    .cta-wrap {
      text-align: center;
      margin: 28px 0 20px;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background: #0ea5e9;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
    }
    .link-box {
      margin-top: 20px;
      padding: 14px;
      background: #f3f4f6;
      border-radius: 6px;
      font-size: 12px;
      color: #6b7280;
      word-break: break-all;
    }
    .link-box a { color: #0ea5e9; }
    .expiry {
      margin-top: 20px;
      padding: 12px 16px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      font-size: 13px;
      color: #92400e;
    }
    .footer {
      padding: 20px 28px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CampusFlow</div>
      <div class="college">${COLLEGE_NAME}</div>
    </div>

    <div class="content">
      <h2>You have been invited to join CampusFlow!</h2>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>
        The admin of <strong>${COLLEGE_NAME}</strong> has invited you to join
        <strong>CampusFlow</strong> as a:
      </p>
      <span class="role-badge">🎓 Teacher</span>
      <p>Click the button below to activate your account and complete your profile:</p>

      <div class="cta-wrap">
        <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
      </div>

      <div class="link-box">
        <strong>Or paste this link in your browser:</strong><br/>
        <a href="${inviteLink}">${inviteLink}</a>
      </div>

      <div class="expiry">
        ⏰ <strong>Important:</strong> This invitation link will expire in
        <strong>48 hours</strong>. Please accept it before it expires.
      </div>
    </div>

    <div class="footer">
      <p>If you did not expect this invitation, you can safely ignore this email.</p>
      <p>— CampusFlow Team &amp; ${COLLEGE_NAME}</p>
      <p>&copy; ${new Date().getFullYear()} CampusFlow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default { sendTeacherInviteEmail };
