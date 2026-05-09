import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addToQueue,
  getMyQueue,
  removeFromQueue,
  viewFullQueue,
  updateQueueStatus,
  notifyPatient,
} from "./queueApi";

const mockJson = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ json: mockJson }));
  mockJson.mockResolvedValue({ success: true });
});

describe("addToQueue", () => {
  it("sends POST to /queue/add_to_queue with encoded params", async () => {
    const result = await addToQueue("john@example.com", 42);
    expect(global.fetch).toHaveBeenCalledWith(
      "/queue/add_to_queue?contact_details=john%40example.com&facility_id=42",
      { method: "POST" }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("getMyQueue", () => {
  it("sends GET to /queue/my_queue with encoded params", async () => {
    const result = await getMyQueue("jane@test.com", 5);
    expect(global.fetch).toHaveBeenCalledWith(
      "/queue/my_queue?contact_details=jane%40test.com&facility_id=5"
    );
    expect(result).toEqual({ success: true });
  });
});

describe("removeFromQueue", () => {
  it("sends DELETE to /queue/remove_queue with encoded params", async () => {
    const result = await removeFromQueue("user@test.com", 10);
    expect(global.fetch).toHaveBeenCalledWith(
      "/queue/remove_queue?contact_details=user%40test.com&facility_id=10",
      { method: "DELETE" }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("viewFullQueue", () => {
  it("sends GET to /staff/view_queue with facility_id", async () => {
    const result = await viewFullQueue(7);
    expect(global.fetch).toHaveBeenCalledWith(
      "/staff/view_queue?facility_id=7"
    );
    expect(result).toEqual({ success: true });
  });
});

describe("updateQueueStatus", () => {
  it("sends PUT to /queue/queue_status with encoded params", async () => {
    const result = await updateQueueStatus("user@test.com", 3, "In-consultation");
    expect(global.fetch).toHaveBeenCalledWith(
      "/queue/queue_status?contact_details=user%40test.com&facility_id=3&status=In-consultation",
      { method: "PUT" }
    );
    expect(result).toEqual({ success: true });
  });
});

describe("notifyPatient", () => {
  it("sends GET to /notify/notify_patient with encoded params", async () => {
    const result = await notifyPatient("patient@email.com", 15);
    expect(global.fetch).toHaveBeenCalledWith(
      "/notify/notify_patient?email=patient%40email.com&facility_id=15"
    );
    expect(result).toEqual({ success: true });
  });
});
