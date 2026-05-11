import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToQueue,
  getMyQueue,
  removeFromQueue,
  getQueueHistory,
  viewFullQueue,
  updateQueueStatus,
  notifyPatient,
  getSchedule,
  createSchedule,
  updateDaySchedule,
  deleteSchedule,
} from "./queueApi";

const API_BASE = "http://localhost:5000";

const mockJson = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: mockJson }));
  mockJson.mockResolvedValue({ success: true });
});

describe("addToQueue", () => {
  it("sends POST to /queue/add_to_queue with JSON body", async () => {
    const result = await addToQueue("john@example.com", 42);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/add_to_queue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_details: "john@example.com", facility_id: 42 }),
      }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("getMyQueue", () => {
  it("sends GET to /queue/my_queue with encoded query params", async () => {
    const result = await getMyQueue("jane@test.com", 5);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/my_queue?contact_details=jane%40test.com&facility_id=5`
    );
    expect(result).toEqual({ success: true });
  });
});

describe("removeFromQueue", () => {
  it("sends DELETE to /queue/remove_queue with encoded query params", async () => {
    const result = await removeFromQueue("user@test.com", 10);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/remove_queue?contact_details=user%40test.com&facility_id=10`,
      { method: "DELETE" }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("viewFullQueue", () => {
  it("sends GET to /queue/full_queue with facility_id", async () => {
    const result = await viewFullQueue(7);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/full_queue?facility_id=7`
    );
    expect(result).toEqual({ success: true });
  });
});

describe("updateQueueStatus", () => {
  it("sends PATCH to /queue/update_status with JSON body", async () => {
    const result = await updateQueueStatus("user@test.com", 3, "In-consultation");
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/update_status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_details: "user@test.com", facility_id: 3, status: "In-consultation" }),
      }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("notifyPatient", () => {
  it("sends GET to /notify/notify_patient with encoded query params", async () => {
    const result = await notifyPatient("patient@email.com", 15);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/notify/notify_patient?email=patient%40email.com&facility_id=15`
    );
    expect(result).toEqual({ success: true });
  });
});

describe("getQueueHistory", () => {
  it("sends GET to /queue/history with encoded query params", async () => {
    const result = await getQueueHistory("john@example.com", 5);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/history?contact_details=john%40example.com&facility_id=5`
    );
    expect(result).toEqual({ success: true });
  });
});

describe("getMyQueue - error paths", () => {
  it("returns error object when response is not ok", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, json: mockJson }));
    const result = await getMyQueue("john@example.com", 5);
    expect(result).toEqual({ error: true, status: 404, data: null });
  });

  it("returns error object when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("network error")));
    const result = await getMyQueue("john@example.com", 5);
    expect(result).toEqual({ error: true, message: "network error", data: null });
  });
});

describe("updateQueueStatus - error path", () => {
  it("returns error when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("connection refused")));
    const result = await updateQueueStatus("user@test.com", 3, "In-consultation");
    expect(result).toEqual({ error: "connection refused" });
  });
});

describe("getSchedule", () => {
  it("sends GET to /schedule with staff_id and returns data", async () => {
    mockJson.mockResolvedValue([{ id: 1, staff_id: "staff-1" }]);
    const result = await getSchedule("staff-1");
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/schedule?staff_id=staff-1`);
    expect(result).toEqual([{ id: 1, staff_id: "staff-1" }]);
  });

  it("returns error object when response is not ok", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: vi.fn() }));
    const result = await getSchedule("staff-1");
    expect(result).toEqual({ success: false, error: "HTTP 500" });
  });

  it("returns error object when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network failure")));
    const result = await getSchedule("staff-1");
    expect(result).toEqual({ success: false, error: "Network failure" });
  });
});

describe("createSchedule", () => {
  it("returns error when rows have no staffId", async () => {
    const result = await createSchedule([]);
    expect(result).toEqual({ success: false, error: "Missing staff_id" });
  });

  it("returns error when rows is null/undefined", async () => {
    const result = await createSchedule(null);
    expect(result).toEqual({ success: false, error: "Missing staff_id" });
  });

  it("sends POST to /schedule with rows and returns success", async () => {
    mockJson.mockResolvedValue({ success: true, id: 1 });
    const rows = [{ staff_id: "staff-1", day: "monday" }];
    const result = await createSchedule(rows);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/schedule`,
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ success: true, id: 1 });
  });

  it("returns error when response is not ok", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 400, json: () => Promise.resolve({ error: "Bad request" }) })
    );
    const rows = [{ staff_id: "staff-1" }];
    const result = await createSchedule(rows);
    expect(result).toEqual({ success: false, error: "Bad request" });
  });

  it("returns error when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
    const rows = [{ staff_id: "staff-1" }];
    const result = await createSchedule(rows);
    expect(result).toEqual({ success: false, error: "Network error" });
  });
});

describe("updateDaySchedule", () => {
  it("returns error when staff not found (not ok response)", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404, json: vi.fn() }));
    const result = await updateDaySchedule({ staff_id: "staff-1", day: "monday" });
    expect(result).toEqual({ success: false, error: "Staff not found" });
  });

  it("returns error when checkStaff fetch throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(() => Promise.reject(new Error("Network failure")));
    const result = await updateDaySchedule({ staff_id: "staff-1", day: "monday" });
    expect(result).toEqual({ success: false, error: "Staff not found" });
    consoleSpy.mockRestore();
  });

  it("returns error when staff data.status is false", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ status: false }) })
    );
    const result = await updateDaySchedule({ staff_id: "staff-1", day: "monday" });
    expect(result).toEqual({ success: false, error: "Staff not found" });
  });

  it("updates schedule when staff exists", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });
    const result = await updateDaySchedule({ staff_id: "staff-1", day: "monday" });
    expect(result).toEqual({ success: true });
  });

  it("returns error when PUT request is not ok", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ status: true }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: vi.fn() });
    const result = await updateDaySchedule({ staff_id: "staff-1", day: "monday" });
    expect(result).toEqual({ success: false, error: "HTTP 500" });
  });
});

describe("deleteSchedule", () => {
  it("sends DELETE to /schedule with staff_id", async () => {
    mockJson.mockResolvedValue({ success: true });
    const result = await deleteSchedule("staff-1");
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/schedule?staff_id=staff-1`,
      { method: "DELETE" }
    );
    expect(result).toEqual({ success: true });
  });

  it("returns error when response is not ok", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500, json: vi.fn() }));
    const result = await deleteSchedule("staff-1");
    expect(result).toEqual({ success: false, error: "HTTP 500" });
  });

  it("returns error when fetch throws", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Delete failed")));
    const result = await deleteSchedule("staff-1");
    expect(result).toEqual({ success: false, error: "Delete failed" });
  });
});
