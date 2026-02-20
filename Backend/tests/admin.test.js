/**
 * Admin Module Tests
 * Covers: role enforcement, user updates, overview wiring, analytics wiring
 */

import { describe, it, expect, jest, beforeAll } from "@jest/globals";
import { AppError } from "../src/utils/errorHandler.js";

// ── Supabase service mocks ─────────────────────────────────────────────────────
const mockGetAdminOverview = jest.fn();
const mockGetAdminUsers = jest.fn();
const mockUpdateUserRole = jest.fn();
const mockUpdateUserStatus = jest.fn();
const mockGetAdminAcademics = jest.fn();

jest.unstable_mockModule("../src/services/supabase.service.js", () => ({
  getAdminOverview: mockGetAdminOverview,
  getAdminUsers: mockGetAdminUsers,
  updateUserRole: mockUpdateUserRole,
  updateUserStatus: mockUpdateUserStatus,
  getAdminAcademics: mockGetAdminAcademics,
}));

let adminController;

beforeAll(async () => {
  adminController = await import("../src/controllers/admin.controller.js");
});

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── Role Enforcement ───────────────────────────────────────────────────────────

describe("Admin role enforcement (controller layer)", () => {
  it("should reject non-admin access to legacy students endpoint", async () => {
    const req = { user: { id: "u1", role: "teacher" } };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.getAllStudents(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it("should allow admin access to legacy students endpoint", async () => {
    const req = { user: { id: "u1", role: "admin" } };
    const res = createMockRes();
    const next = jest.fn();

    mockGetAdminUsers.mockReset();

    await adminController.getAllStudents(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ── User Updates ───────────────────────────────────────────────────────────────

describe("Admin user updates", () => {
  it("should prevent admins from demoting themselves", async () => {
    const req = {
      params: { id: "admin-1" },
      user: { id: "admin-1", role: "admin" },
      body: { role: "teacher" },
    };
    const res = createMockRes();
    const next = jest.fn();

    mockUpdateUserRole.mockReset();

    await adminController.updateUserRole(req, res, next);

    expect(mockUpdateUserRole).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it("should call service to update other users' roles", async () => {
    const req = {
      params: { id: "user-2" },
      user: { id: "admin-1", role: "admin" },
      body: { role: "teacher" },
    };
    const res = createMockRes();
    const next = jest.fn();

    mockUpdateUserRole.mockResolvedValue({
      user_id: "user-2",
      role: "teacher",
    });

    await adminController.updateUserRole(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockUpdateUserRole).toHaveBeenCalledWith("user-2", "teacher");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ role: "teacher" }),
      })
    );
  });

  it("should validate user status payload type", async () => {
    const req = {
      params: { id: "user-3" },
      user: { id: "admin-1", role: "admin" },
      body: { isActive: "yes" }, // invalid
    };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.updateUserStatus(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });
});

// ── Overview Accuracy (wiring) ────────────────────────────────────────────────

describe("Admin overview wiring", () => {
  it("should return overview payload from service unchanged", async () => {
    const mockOverview = {
      totals: { users: 10, students: 7, teachers: 3, classes: 4 },
      averages: { attendancePct: 88, marks: 72.5 },
    };

    mockGetAdminOverview.mockResolvedValue(mockOverview);

    const req = { user: { id: "admin-1", role: "admin" } };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.getOverview(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockGetAdminOverview).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockOverview,
    });
  });
});

// ── Analytics Wiring ──────────────────────────────────────────────────────────

describe("Admin analytics endpoint", () => {
  it("should pass validated thresholds to service", async () => {
    mockGetAdminAcademics.mockResolvedValue({
      weakClasses: [],
      lowAttendanceClasses: [],
      teacherWorkload: [],
    });

    const req = {
      query: { weakThreshold: "50", attendanceThreshold: "80" },
    };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.getAcademicsOverview(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockGetAdminAcademics).toHaveBeenCalledWith({
      weakThreshold: 50,
      attendanceThreshold: 80,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("should reject invalid weakThreshold values", async () => {
    const req = { query: { weakThreshold: "-5" } };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.getAcademicsOverview(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });

  it("should reject invalid attendanceThreshold values", async () => {
    const req = { query: { attendanceThreshold: "150" } };
    const res = createMockRes();
    const next = jest.fn();

    await adminController.getAcademicsOverview(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
  });
});

