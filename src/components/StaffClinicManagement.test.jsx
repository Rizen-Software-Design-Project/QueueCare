import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StaffClinicManagement from "./StaffClinicManagement";
import userEvent from "@testing-library/user-event";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("./AIAssistant", () => ({
  default: () => <div data-testid="ai-assistant" />,
}));

vi.mock("../queueApi", () => ({
  viewFullQueue:     vi.fn(() => Promise.resolve({ data: [], error: null })),
  updateQueueStatus: vi.fn(() => Promise.resolve({ error: null })),
}));

const mockRpc   = vi.fn();
const mockQuery = {
  select:      vi.fn().mockReturnThis(),
  eq:          vi.fn().mockReturnThis(),
  order:       vi.fn().mockReturnThis(),
  update:      vi.fn().mockReturnThis(),
  limit:       vi.fn().mockResolvedValue({ data: [], error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("#lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQuery),
    rpc:  (...args) => mockRpc(...args),
  },
}));

global.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);

// ─── Default props ────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  facilityId:     "fac-1",
  facilityName:   "Soweto Clinic",
  authProvider:   "firebase",
  providerUserId: "fb-staff-uid",
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

const makeAppointment = (overrides = {}) => ({
  id:          "appt-1",
  status:      "booked",
  reason:      "Flu symptoms",
  booked_at:   new Date().toISOString(),
  patient_id:  "patient-1",
  slot_id:     "slot-1",
  facility_id: "fac-1",
  appointment_slots: {
    slot_date:        TODAY,
    slot_time:        "09:00:00",
    duration_minutes: 30,
    facility_id:      "fac-1",
  },
  profiles: {
    name:         "John",
    surname:      "Doe",
    email:        "john@example.com",
    phone_number: "0820000000",
  },
  ...overrides,
});

const makeSlot = (overrides = {}) => ({
  id:               "slot-1",
  slot_date:        "2099-12-31",
  slot_time:        "09:00:00",
  duration_minutes: 30,
  total_capacity:   5,
  booked_count:     1,
  facility_id:      "fac-1",
  ...overrides,
});

const makeQueueEntry = (overrides = {}) => ({
  id:         "queue-1",
  status:     "waiting",
  position:   1,
  patient_id: "patient-1",
  profiles: {
    name:         "John",
    surname:      "Doe",
    email:        "john@example.com",
    phone_number: "0820000000",
  },
  appointments: {
    id:     "appt-1",
    reason: "Flu symptoms",
    appointment_slots: {
      slot_time: "09:00:00",
      end_time:  "09:30:00",
    },
  },
  ...overrides,
});

// ─── Setup helpers ────────────────────────────────────────────────────────────

function seedAppointments(appointments = [makeAppointment()]) {
  mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });
}

function seedSlots(slots = [makeSlot()]) {
  mockQuery.order
    .mockReturnValueOnce(mockQuery)
    .mockResolvedValueOnce({ data: slots, error: null });
}

function renderComponent(props = DEFAULT_PROPS) {
  return render(<StaffClinicManagement {...props} />);
}

async function renderAndWait(props = DEFAULT_PROPS) {
  const user = userEvent.setup();
  renderComponent(props);
  if (props.facilityId) {
    // facilityId present — fetches fire, loading text appears then clears
    await waitFor(() =>
      expect(screen.queryByText(/loading appointments/i)).not.toBeInTheDocument()
    );
  } else {
    // facilityId null — useEffect bails early, loading text never shows;
    // wait for the always-rendered header instead
    await waitFor(() =>
      expect(screen.getByText(/staff dashboard/i)).toBeInTheDocument()
    );
  }
  return user;
}

beforeEach(async () => {
  vi.clearAllMocks();
  mockQuery.select.mockReturnThis();
  mockQuery.eq.mockReturnThis();
  mockQuery.order.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.limit.mockResolvedValue({ data: [], error: null });
  mockRpc.mockResolvedValue({ data: { message: "ok" }, error: null });

  const { viewFullQueue } = await import("../queueApi");
  viewFullQueue.mockResolvedValue({ data: [], error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Null facility state", () => {
  it("renders without crashing when facilityId is null", async () => {
    await renderAndWait({ ...DEFAULT_PROPS, facilityId: null });
    expect(screen.getByText(/staff dashboard/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Appointments table - data loading", () => {
  it("shows appointment with missing profile gracefully", async () => {
    seedAppointments([
      makeAppointment({ profiles: null, patient_id: "abc12345678" }),
    ]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText(/abc12345/i)).toBeVisible()
    );
  });

  it("shows '—' when appointment has no reason", async () => {
    seedAppointments([makeAppointment({ reason: null })]);
    await renderAndWait();
    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0));
  });

  it("shows '—' when slot has no date or time", async () => {
    seedAppointments([
      makeAppointment({
        appointment_slots: {
          slot_date:        TODAY,
          slot_time:        null,
          duration_minutes: null,
          facility_id:      "fac-1",
        },
      }),
    ]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText("—")).toBeVisible()
    );
  });

  it("shows all non-terminal status change buttons for booked appointment", async () => {
    seedAppointments([makeAppointment({ status: "booked" })]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /confirmed/i })).toBeVisible()
    );
    expect(screen.getByRole("button", { name: /complete/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /cancelled/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /no_show/i })).toBeVisible();
  });

  it("disables status buttons while update is in progress", async () => {
    seedAppointments([makeAppointment({ status: "booked" })]);

    mockQuery.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn(() => new Promise(() => {})), // never resolves
      }),
    });

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /confirmed/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /confirmed/i }));

    await waitFor(() =>
      expect(screen.getAllByText("...").length).toBeGreaterThan(0)
    );
  });

  it("shows appt loading error message", async () => {
    mockQuery.limit.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });
    await renderAndWait();
    await waitFor(() => expect(screen.getByText(/DB error/i)).toBeVisible());
  });

  it("shows refresh button and triggers re-fetch when clicked", async () => {
    const user = await renderAndWait();
    const refreshBtns = screen.getAllByRole("button", { name: /^refresh$/i });
    expect(refreshBtns.length).toBeGreaterThanOrEqual(1);
    const apptRefreshBtn = refreshBtns[0];
    expect(apptRefreshBtn).toBeVisible();
    await user.click(apptRefreshBtn);
    expect(mockQuery.limit).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Appointments table - upcoming view edge cases", () => {
  it("does not show cancelled appointments in upcoming view", async () => {
    seedAppointments([
      makeAppointment({
        id:     "a1",
        status: "cancelled",
        appointment_slots: {
          slot_date:        "2099-12-31",
          slot_time:        "10:00:00",
          duration_minutes: 30,
          facility_id:      "fac-1",
        },
      }),
    ]);
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: /view upcoming/i }));
    await waitFor(() =>
      expect(screen.getByText(/no upcoming appointments found/i)).toBeVisible()
    );
  });

  it("does not show complete appointments in upcoming view", async () => {
    seedAppointments([
      makeAppointment({
        id:     "a1",
        status: "complete",
        appointment_slots: {
          slot_date:        "2099-12-31",
          slot_time:        "10:00:00",
          duration_minutes: 30,
          facility_id:      "fac-1",
        },
      }),
    ]);
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: /view upcoming/i }));
    await waitFor(() =>
      expect(screen.getByText(/no upcoming appointments found/i)).toBeVisible()
    );
  });

  it("shows no_show appointments have no action buttons", async () => {
    seedAppointments([makeAppointment({ status: "no_show" })]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /reschedule/i })).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Reschedule modal - slot selection and submission", () => {
  it("shows available slots in reschedule dropdown", async () => {
    seedAppointments([makeAppointment({ status: "booked", slot_id: "slot-1" })]);
    seedSlots([
      makeSlot({ id: "slot-2", slot_date: "2099-12-31", booked_count: 0, total_capacity: 5 }),
    ]);

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /reschedule/i }));

    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeVisible()
    );

    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(1);
  });

  it("excludes current slot from reschedule options", async () => {
    seedAppointments([makeAppointment({ status: "booked", slot_id: "slot-same" })]);
    seedSlots([
      makeSlot({ id: "slot-same", slot_date: "2099-12-31", booked_count: 0 }),
    ]);

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /reschedule/i }));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveValue("");
  });

  it("shows success message after successful reschedule", async () => {
    seedAppointments([makeAppointment({ status: "booked", slot_id: "slot-1" })]);
    seedSlots([makeSlot({ id: "slot-2", slot_date: "2099-12-31", booked_count: 0 })]);

    mockQuery.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data:  [{ id: "appt-1", slot_id: "slot-2" }],
          error: null,
        }),
      }),
    });

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /reschedule/i }));

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "slot-2");
    await user.click(screen.getByRole("button", { name: /confirm reschedule/i }));

    await waitFor(() =>
      expect(screen.getByText(/rescheduled successfully/i)).toBeVisible()
    );
  });

  it("shows error message when reschedule update fails", async () => {
    seedAppointments([makeAppointment({ status: "booked", slot_id: "slot-1" })]);
    seedSlots([makeSlot({ id: "slot-2", slot_date: "2099-12-31", booked_count: 0 })]);

    mockQuery.update.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data:  null,
          error: { message: "Reschedule failed" },
        }),
      }),
    });

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /reschedule/i }));

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "slot-2");
    await user.click(screen.getByRole("button", { name: /confirm reschedule/i }));

    await waitFor(() =>
      expect(screen.getByText(/reschedule failed/i)).toBeVisible()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Live patient queue - extended", () => {
  it("renders queue entry with appointment as array", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data: [
        makeQueueEntry({
          appointments: [
            {
              id:     "appt-1",
              reason: "Headache",
              appointment_slots: { slot_time: "08:00:00", end_time: "08:30:00" },
            },
          ],
        }),
      ],
      error: null,
    });

    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText("Headache")).toBeVisible()
    );
  });

  it("shows '—' when appointment or slot is missing from queue entry", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry({ appointments: null })],
      error: null,
    });

    await renderAndWait();
    await waitFor(() =>
      expect(screen.getAllByText("—").length).toBeGreaterThan(0)
    );
  });

  it("shows Waiting button for in-consultation patients", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry({ status: "called" })],
      error: null,
    });

    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /waiting/i })).toBeVisible()
    );
  });

  it("calls updateQueueStatus with 'completed' and removes entry from list", async () => {
    const { viewFullQueue, updateQueueStatus } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry({ status: "called" })],
      error: null,
    });
    updateQueueStatus.mockResolvedValue({ error: null });

    mockQuery.update.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    global.fetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({}),
    });

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /completed/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /completed/i }));

    await waitFor(() =>
      expect(updateQueueStatus).toHaveBeenCalledWith(
        "john@example.com",
        "fac-1",
        "completed"
      )
    );

    await waitFor(() =>
      expect(screen.getByText(/no patients currently in queue/i)).toBeVisible()
    );
  });

  it("shows alert when queue status update fails", async () => {
    const { viewFullQueue, updateQueueStatus } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry({ status: "waiting" })],
      error: null,
    });
    updateQueueStatus.mockResolvedValue({ error: "Queue update error" });

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user     = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /in consultation/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /in consultation/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Queue update error"))
    );
    alertSpy.mockRestore();
  });

  it("shows alert when remove fetch returns error JSON", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry()],
      error: null,
    });

    global.fetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({ error: "Not found in queue" }),
    });

    const alertSpy   = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Not found in queue"))
    );

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("shows alert when remove fetch throws a network error", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry()],
      error: null,
    });

    global.fetch.mockRejectedValueOnce(new Error("Network failure"));

    const alertSpy   = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Network failure"))
    );

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("does not remove patient when confirm is cancelled", async () => {
    const { viewFullQueue } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry()],
      error: null,
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /remove/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByText("John Doe")).toBeVisible();

    confirmSpy.mockRestore();
  });

  it("updates queue entry status locally when non-completed status is set", async () => {
    const { viewFullQueue, updateQueueStatus } = await import("../queueApi");
    viewFullQueue.mockResolvedValue({
      data:  [makeQueueEntry({ status: "waiting" })],
      error: null,
    });
    updateQueueStatus.mockResolvedValue({ error: null });

    const user = await renderAndWait();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /in consultation/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /in consultation/i }));

    await waitFor(() =>
      expect(screen.getByText("called")).toBeVisible()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Create appointment slots - extended", () => {
  it("removes a time block when Remove is clicked", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() =>
      expect(document.querySelectorAll(".slot-block-row").length).toBe(3)
    );

    const blocksContainer = document.querySelector(".slot-blocks");
    const removeBtn = within(blocksContainer).getAllByRole("button", { name: /^remove$/i })[0];
    await user.click(removeBtn);

    await waitFor(() =>
      expect(document.querySelectorAll(".slot-block-row").length).toBe(2)
    );
  });

  it("does not remove the last time block", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() =>
      expect(document.querySelectorAll(".slot-block-row").length).toBe(3)
    );

    const blocksContainer = document.querySelector(".slot-blocks");

    const firstRemove = within(blocksContainer).getAllByRole("button", { name: /^remove$/i })[0];
    await user.click(firstRemove);
    await waitFor(() =>
      expect(document.querySelectorAll(".slot-block-row").length).toBe(2)
    );

    const secondRemove = within(blocksContainer).getAllByRole("button", { name: /^remove$/i })[0];
    await user.click(secondRemove);
    await waitFor(() =>
      expect(document.querySelectorAll(".slot-block-row").length).toBe(1)
    );

    const lastRemove = within(blocksContainer).getByRole("button", { name: /^remove$/i });
    expect(lastRemove).toBeDisabled();
  });

  it("disabling a block checkbox hides its time inputs", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    const checkboxes = screen.getAllByRole("checkbox");
    const enabledCheckbox = checkboxes.find((cb) => cb.checked);
    if (enabledCheckbox) {
      await user.click(enabledCheckbox);
      const timeInputs = document.querySelectorAll("input[type='time']:disabled");
      expect(timeInputs.length).toBeGreaterThan(0);
    }
  });

  it("shows preview chips when valid blocks are configured", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    await waitFor(() => {
      const chips = document.querySelectorAll(".slot-chip");
      expect(chips.length).toBeGreaterThan(0);
    });
  });

  it("shows 'No slots will be created yet' when all blocks disabled", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      if (cb.checked) await user.click(cb);
    }

    await waitFor(() =>
      expect(screen.getByText(/no slots will be created yet/i)).toBeVisible()
    );
  });

  it("submit button is enabled when facilityId is provided", async () => {
    const user = await renderAndWait();
    await user.click(screen.getByRole("button", { name: "+" }));

    const submitBtn = screen.getByRole("button", { name: /create distributed slots/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("submit button is disabled when facilityId is not provided", async () => {
    const user = await renderAndWait({ ...DEFAULT_PROPS, facilityId: null });
    await user.click(screen.getByRole("button", { name: "+" }));

    const submitBtn = screen.getByRole("button", { name: /create distributed slots/i });
    expect(submitBtn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Available slots table - extended", () => {
  it("shows slots loading state then clears it", async () => {
    mockQuery.order
      .mockReturnValueOnce(mockQuery)
      .mockReturnValueOnce(new Promise((res) => setTimeout(() => res({ data: [], error: null }), 50)));

    renderComponent();

    await waitFor(() =>
      expect(screen.queryByText(/loading slots/i)).not.toBeInTheDocument(),
      { timeout: 2000 }
    );
  });

  it("shows slots error message when fetch fails", async () => {
    mockQuery.order
      .mockReturnValueOnce(mockQuery)
      .mockResolvedValueOnce({ data: null, error: { message: "Slots fetch failed" } });

    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText(/slots fetch failed/i)).toBeVisible()
    );
  });

  it("filters out past slots from the available list", async () => {
    const pastDate = "2000-01-01";
    mockQuery.order
      .mockReturnValueOnce(mockQuery)
      .mockResolvedValueOnce({
        data:  [makeSlot({ slot_date: pastDate, slot_time: "09:00:00" })],
        error: null,
      });

    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText(/no slots found for this facility/i)).toBeVisible()
    );
  });

  it("calls delete RPC with correct arguments", async () => {
    mockRpc.mockResolvedValue({ data: { message: "deleted" }, error: null });
    seedSlots([makeSlot({ booked_count: 0 })]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith(
        "delete_appointment_slot_as_staff",
        expect.objectContaining({ p_slot_id: "slot-1" })
      )
    );
    confirmSpy.mockRestore();
  });

  it("shows alert and keeps slot when delete RPC returns data.error", async () => {
    mockRpc.mockResolvedValue({ data: { error: "Permission denied" }, error: null });
    seedSlots([makeSlot({ booked_count: 0 })]);
    const alertSpy   = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Permission denied"))
    );
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();

    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("shows alert and keeps slot when delete RPC returns error object", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } });
    seedSlots([makeSlot({ booked_count: 0 })]);
    const alertSpy   = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user       = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("RPC error"))
    );
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("refreshes slot list when Refresh button is clicked", async () => {
    seedSlots([makeSlot()]);
    const user = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
    );

    const orderCallCount = mockQuery.order.mock.calls.length;
    await user.click(screen.getByRole("button", { name: /↻ refresh/i }));

    await waitFor(() =>
      expect(mockQuery.order.mock.calls.length).toBeGreaterThan(orderCallCount)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Edit slot - extended", () => {
  it("shows error when update RPC returns data.error", async () => {
    mockRpc.mockResolvedValue({ data: { error: "Slot conflict" }, error: null });
    seedSlots([makeSlot()]);
    const user = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/slot conflict/i)).toBeVisible()
    );
  });

  it("edit form fields can be changed by the user", async () => {
    seedSlots([makeSlot({ slot_time: "09:00:00", total_capacity: 5, duration_minutes: 30 })]);
    const user = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^edit$/i }));

    const capacityInput = screen.getByDisplayValue("5");
    await user.clear(capacityInput);
    await user.type(capacityInput, "10");

    expect(capacityInput).toHaveValue(10);
  });

  it("cancelling edit clears the update message", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Some error" } });
    seedSlots([makeSlot()]);
    const user = await renderAndWait();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
    );
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/some error/i)).toBeVisible()
    );

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByText(/some error/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Helper / utility coverage", () => {
  it("renders facility name from props", async () => {
    await renderAndWait();
    expect(screen.getByText(/soweto clinic/i)).toBeVisible();
  });

  it("duration shown as '— min' when duration_minutes is null on appointment", async () => {
    seedAppointments([
      makeAppointment({
        appointment_slots: {
          slot_date:        TODAY,
          slot_time:        "09:00:00",
          duration_minutes: null,
          facility_id:      "fac-1",
        },
      }),
    ]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText(/— min/i)).toBeVisible()
    );
  });

  it("renders gracefully when appointment_slots is null (row filtered from today view)", async () => {
    seedAppointments([makeAppointment({ appointment_slots: null })]);
    await renderAndWait();
    await waitFor(() =>
      expect(screen.getByText(/no appointments found for today/i)).toBeVisible()
    );
  });
});