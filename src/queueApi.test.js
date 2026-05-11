import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToQueue,
  getMyQueue,
  removeFromQueue,
  viewFullQueue,
  updateQueueStatus,
  notifyPatient,
} from "./queueApi";

const API_BASE =
  "https://queuecare-gubjeae9fqdzekfv.southafricanorth-01.azurewebsites.net";

const mockJson = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();

  mockJson.mockResolvedValue({ success: true });

  global.fetch = vi.fn(() =>
    Promise.resolve({
      json: mockJson,
    })
  );
});

describe("addToQueue", () => {
  it("sends POST to /queue/add_to_queue with JSON body", async () => {
    const result = await addToQueue("john@example.com", 42);

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/queue/add_to_queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contact_details: "john@example.com",
        facility_id: 42,
      }),
    });

    expect(result).toEqual({ success: true });
  });
});

describe("getMyQueue", () => {
  it("sends GET to /queue/my_queue with encoded params", async () => {
    const result = await getMyQueue("jane@test.com", 5);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/queue/my_queue?contact_details=jane%40test.com&facility_id=5`
    );

    expect(result).toEqual({ success: true });
  });
});

describe("removeFromQueue", () => {
  it("sends DELETE to /queue/remove_queue with encoded params", async () => {
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

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE}/queue/update_status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contact_details: "user@test.com",
        facility_id: 3,
        status: "In-consultation",
      }),
    });

    expect(result).toEqual({ success: true });
  });
});

describe("notifyPatient", () => {
  it("sends GET to /notify/notify_patient with encoded params", async () => {
    const result = await notifyPatient("patient@email.com", 15);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/notify/notify_patient?email=patient%40email.com&facility_id=15`
    );

    expect(result).toEqual({ success: true });
  });
});
