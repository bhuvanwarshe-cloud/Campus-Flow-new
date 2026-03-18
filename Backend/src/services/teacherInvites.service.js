/**
 * Teacher Invites Service
 * Handles teacher invitation workflow using Nodemailer (Gmail SMTP).
 *
 * Design decisions:
 *  - email column is NOT unique (teachers can receive multiple invites)
 *  - token column IS unique (each invite link is one-time use)
 *  - resendInvite() UPDATES the existing row with a fresh token + expiry
 *    instead of inserting a new row — avoids any duplicate key issues
 */

import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/errorHandler.js";

const INVITE_TOKEN_LENGTH = 32;
const INVITE_EXPIRY_HOURS = 48;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random token.
 * @returns {string} 64-character hex string
 */
export function generateInviteToken() {
  return crypto.randomBytes(INVITE_TOKEN_LENGTH).toString("hex");
}

/**
 * Calculate expiry timestamp 48 hours from now.
 * @returns {string} ISO 8601 timestamp
 */
export function calculateExpiryTime() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);
  return expiresAt.toISOString();
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Create a new teacher invite record in the database.
 * Validates email format and prevents duplicate pending invites.
 *
 * @param {string} email   - Teacher's email address
 * @param {string} adminId - UUID of the admin creating the invite
 * @returns {Object} Created invite record
 */
export async function createTeacherInvite(email, adminId) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }

  // Check if email already exists as a registered user
  const { data: existingUsers, error: userError } =
    await supabaseAdmin.auth.admin.listUsers();
  if (
    !userError &&
    existingUsers?.users?.some((u) => u.email === email)
  ) {
    throw new AppError("This email is already registered in the system", 400);
  }

  // Block duplicate pending invites for the same email
  const { data: existingInvite } = await supabaseAdmin
    .from("teacher_invites")
    .select("id, status")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    throw new AppError(
      "A pending invite already exists for this email. Use the resend option instead.",
      400
    );
  }

  const token = generateInviteToken();
  const expiresAt = calculateExpiryTime();

  const { data: invite, error: insertError } = await supabaseAdmin
    .from("teacher_invites")
    .insert({
      email,
      token,
      status: "pending",
      invited_by_admin_id: adminId,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError(`Failed to create invite: ${insertError.message}`, 500);
  }

  console.log(`[InviteService] New invite created for ${email} (id: ${invite.id})`);

  return {
    id: invite.id,
    email: invite.email,
    token: invite.token,
    expiresAt: invite.expires_at,
    createdAt: invite.created_at,
  };
}

/**
 * Verify an invite token and return invite details.
 * Marks expired tokens automatically.
 *
 * @param {string} token - Invite token from the URL
 * @returns {Object} Invite details { id, email, expiresAt }
 */
export async function verifyInviteToken(token) {
  if (!token) {
    throw new AppError("Invite token is required", 400);
  }

  const { data: invite, error } = await supabaseAdmin
    .from("teacher_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !invite) {
    throw new AppError("Invalid invite token", 400);
  }

  if (invite.status !== "pending") {
    throw new AppError(`Invite has already been ${invite.status}`, 400);
  }

  // Auto-expire if past expiry time
  if (Date.now() > new Date(invite.expires_at).getTime()) {
    await supabaseAdmin
      .from("teacher_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);

    throw new AppError("Invite link has expired. Please request a new invite.", 400);
  }

  return {
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expires_at,
  };
}

/**
 * Mark an invite as accepted after the teacher completes profile setup.
 *
 * @param {string} token - Invite token
 * @returns {Object} Updated invite record
 */
export async function acceptInvite(token) {
  const invite = await verifyInviteToken(token);

  const { data: updatedInvite, error } = await supabaseAdmin
    .from("teacher_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .select()
    .single();

  if (error) {
    throw new AppError(`Failed to accept invite: ${error.message}`, 500);
  }

  console.log(`[InviteService] Invite accepted by ${updatedInvite.email}`);

  return {
    id: updatedInvite.id,
    email: updatedInvite.email,
    status: updatedInvite.status,
    acceptedAt: updatedInvite.accepted_at,
  };
}

/**
 * Retrieve all pending teacher invites for the admin dashboard.
 *
 * @returns {Array} List of pending invite records
 */
export async function getPendingInvites() {
  const { data: invites, error } = await supabaseAdmin
    .from("teacher_invites")
    .select("id, email, status, created_at, expires_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch invites: ${error.message}`, 500);
  }

  return invites || [];
}

/**
 * Resend an invite by regenerating the token and resetting the expiry.
 *
 * FIX: Previously this called createTeacherInvite() which INSERT-ed a new row,
 * hitting the UNIQUE constraint on the email column.
 *
 * Now it UPDATE-s the existing row with a fresh token + expires_at,
 * so no new row is inserted and no constraint is violated.
 *
 * @param {string} inviteId - UUID of the invite to refresh
 * @param {string} adminId  - UUID of the admin performing the resend
 * @returns {Object} Updated invite with new token
 */
export async function resendInvite(inviteId, adminId) {
  // Fetch existing invite
  const { data: existingInvite, error: getError } = await supabaseAdmin
    .from("teacher_invites")
    .select("id, email, status")
    .eq("id", inviteId)
    .single();

  if (getError || !existingInvite) {
    throw new AppError("Invite not found", 404);
  }

  // Generate a fresh token and new expiry window
  const newToken = generateInviteToken();
  const newExpiresAt = calculateExpiryTime();

  // UPDATE the existing row — no insert, no duplicate email conflict
  const { data: updatedInvite, error: updateError } = await supabaseAdmin
    .from("teacher_invites")
    .update({
      token: newToken,
      expires_at: newExpiresAt,
      status: "pending",         // reset status in case it was expired
      invited_by_admin_id: adminId,
    })
    .eq("id", inviteId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(`Failed to resend invite: ${updateError.message}`, 500);
  }

  console.log(
    `[InviteService] Invite resent for ${updatedInvite.email} (id: ${updatedInvite.id})`
  );

  return {
    id: updatedInvite.id,
    email: updatedInvite.email,
    token: updatedInvite.token,
    expiresAt: updatedInvite.expires_at,
  };
}

export default {
  generateInviteToken,
  calculateExpiryTime,
  createTeacherInvite,
  verifyInviteToken,
  acceptInvite,
  getPendingInvites,
  resendInvite,
};
