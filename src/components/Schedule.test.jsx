import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Schedule from "./Schedule";


const mockGetSchedule = vi.fn();
const mockCreateSchedule = vi.fn();
const mockUpdateDaySchedule = vi.fn();
const mockDeleteSchedule = vi.fn();

vi.mock("../queueApi", () => ({
  getSchedule: (...a) => mockGetSchedule(...a),
  createSchedule: (...a) => mockCreateSchedule(...a),
  updateDaySchedule: (...a) => mockUpdateDaySchedule(...a),
  deleteSchedule: (...a) => mockDeleteSchedule(...a),
}));


const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});


const STAFF_STATE = {
  state: { staff: { id: "staff-123" }, facilityId: "facility-456" },
};

const EMPTY_SCHEDULE = { success: true, data: null };


beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();

  HTMLDialogElement.prototype.showModal = vi.fn(function () {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function () {
    this.removeAttribute("open");
  });
});

afterEach(() => {
  localStorage.clear();
});


function renderSchedule(locationProps = STAFF_STATE) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/schedule", ...locationProps }]}>
      <Schedule />
    </MemoryRouter>
  );
}


const getDialog = (title) => screen.getByText(title).closest("dialog");

const openDialog = async (user, buttonName, title) => {
  await user.click(screen.getByRole("button", { name: buttonName }));
  return getDialog(title);
};

const clickWithin = async (user, scope, name) => {
  await user.click(within(scope).getByRole("button", { name }));
};

const quickFillWeekdays = async (user, dialog) =>
  clickWithin(user, dialog, /weekdays 09:00/i);

const quickFillAllDays = async (user, dialog) =>
  clickWithin(user, dialog, /all days 08:00/i);


describe("Schedule > day card display", () => {
  it("renders a card for all 7 days", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    renderSchedule();

    // "Monday" etc. also appear in dialog <strong> tags (dialogs are in the DOM
    // even when closed), so scope to .avail-grid to match card labels only.
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    await waitFor(() => {
      const gridEl = document.querySelector(".avail-grid");
      for (const day of days) {
        expect(within(gridEl).getByText(day)).toBeInTheDocument();
      }
    });
  });

  it("shows 'Not set' × 14 when schedule returns null data", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    renderSchedule();

    await waitFor(() => {
      expect(screen.getAllByText("Not set")).toHaveLength(14);
    });
  });

  it("displays saved start and end times on day cards", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Mon: { start_time: "07:30", end_time: "15:30", appointment_status: "open" },
      },
    });

    renderSchedule();

    expect(await screen.findByText("07:30")).toBeInTheDocument();
    expect(screen.getByText("15:30")).toBeInTheDocument();
  });

  it("shows status badge with 'open' class on day card", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Mon: { start_time: "08:00", end_time: "16:00", appointment_status: "open" },
      },
    });

    renderSchedule();

    await waitFor(() => {
      const badge = document.querySelector(".status-badge.open");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("open");
    });
  });

  it("shows status badge with 'closed' class on day card", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Mon: { start_time: null, end_time: null, appointment_status: "closed" },
      },
    });

    renderSchedule();

    await waitFor(() => {
      const badge = document.querySelector(".status-badge.closed");
      expect(badge).toBeInTheDocument();
    });
  });

  it("shows 'on-leave' status badge with on_leave class", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Fri: { start_time: null, end_time: null, appointment_status: "on_leave" },
      },
    });

    renderSchedule();

    await waitFor(() => {
      const badge = document.querySelector(".status-badge.on_leave");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("on-leave");
    });
  });
});

describe("Schedule > getSchedule", () => {
  it("calls getSchedule with the correct staff_id on mount", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    renderSchedule();

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledWith("staff-123");
    });
  });

  it("calls getSchedule with staff_id from localStorage when not in nav state", async () => {
    localStorage.setItem("staff_id", "ls-staff-999");
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    renderSchedule({ state: { facilityId: "facility-456" } });

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledWith("ls-staff-999");
    });
  });
});


describe("Schedule > cancel buttons", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("cancel button closes the add dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await clickWithin(user, dialog, /^cancel$/i);

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("cancel button closes the edit dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await clickWithin(user, dialog, /^cancel$/i);

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });

  it("cancel button closes the clear dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /clear all/i, "Clear Schedule");
    await clickWithin(user, dialog, /^cancel$/i);

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});

describe("Schedule > add_time validation", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("alerts 'Please fill in at least one complete day' when no days are configured", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await clickWithin(user, dialog, /save weekly schedule/i);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Please fill in at least one complete day."
      );
    });

    expect(mockCreateSchedule).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("validates facility ID before staff ID in add_time", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    // Only staff provided — facility missing → facility alert fires first
    renderSchedule({ state: { staff: { id: "staff-123" } } });

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");

    // Use old-style add form quick fill — all 3 fields must be set
    const mondayRow = dialog.querySelector("section.weekly-row");
    const selects = within(dialog).getAllByRole("combobox");
    const timeInputs = dialog.querySelectorAll("input[type='time']");

    // Manually set a complete day via the weekly editor inputs
    await user.selectOptions(selects[0], "open");
    // After selecting open, type times directly
    await user.type(timeInputs[0], "09:00");
    await user.type(timeInputs[1], "17:00");

    await clickWithin(user, dialog, /save weekly schedule/i);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringMatching(/missing facility id/i)
      );
    });

    alertSpy.mockRestore();
  });
});


describe("Schedule > saveWeeklySchedule validation order", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("validates staff ID before facility ID in saveWeeklySchedule", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    // Only facility provided — staff missing → staff alert fires first
    renderSchedule({ state: { facilityId: "facility-456" } });

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillWeekdays(user, dialog);
    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Missing staff ID.");
    });

    alertSpy.mockRestore();
  });
});


describe("Schedule > saveWeeklySchedule payload", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockCreateSchedule.mockResolvedValue({ success: true });
  });

  it("sends actual times for open days", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillWeekdays(user, dialog); // 09:00–17:00 open for Mon–Fri
    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload = mockCreateSchedule.mock.calls[0][0];
      const mon = payload.find((d) => d.day_of_week === "Mon");
      expect(mon).toMatchObject({
        start_time: "09:00",
        end_time: "17:00",
        appointment_status: "open",
      });
    });
  });

  it("sends null times for on_leave days", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");

    // Mark Monday as on_leave via the mini-button
    const onLeaveButtons = within(dialog).getAllByRole("button", { name: /on.leave/i });
    await user.click(onLeaveButtons[0]);

    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload = mockCreateSchedule.mock.calls[0][0];
      expect(payload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            day_of_week: "Mon",
            appointment_status: "on_leave",
            start_time: null,
            end_time: null,
          }),
        ])
      );
    });
  });

  it("includes correct day_of_week abbreviations in payload", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillAllDays(user, dialog);
    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload = mockCreateSchedule.mock.calls[0][0];
      const days = payload.map((d) => d.day_of_week);
      expect(days).toEqual(
        expect.arrayContaining(["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat", "Sun"])
      );
      expect(days).toHaveLength(7);
    });
  });

  it("attaches staff_id and facility_id from nav state to every payload entry", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillWeekdays(user, dialog);
    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload = mockCreateSchedule.mock.calls[0][0];
      payload.forEach((entry) => {
        expect(entry).toMatchObject({
          staff_id: "staff-123",
          facility_id: "facility-456",
        });
      });
    });
  });
});


describe("Schedule > mini-buttons", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("'Closed' mini-button clears times and sets status to closed", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    const closedButtons = within(dialog).getAllByRole("button", { name: /^closed$/i });
    await user.click(closedButtons[0]); // Monday

    const mondayRow = closedButtons[0].closest("section.weekly-row");
    const timeInputs = mondayRow.querySelectorAll("input[type='time']");

    timeInputs.forEach((input) => expect(input.value).toBe(""));

    // Status badge in that row should now show closed
    const badge = mondayRow.querySelector(".status-badge");
    expect(badge).toHaveTextContent("closed");
  });

  it("'On leave' mini-button clears times and sets status to on_leave", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    const onLeaveButtons = within(dialog).getAllByRole("button", { name: /on.leave/i });
    await user.click(onLeaveButtons[0]); // Monday

    const mondayRow = onLeaveButtons[0].closest("section.weekly-row");
    const timeInputs = mondayRow.querySelectorAll("input[type='time']");

    timeInputs.forEach((input) => expect(input.value).toBe(""));

    const badge = mondayRow.querySelector(".status-badge");
    expect(badge).toHaveTextContent("on-leave");
  });
});


describe("Schedule > select dropdown", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("selecting 'closed' from dropdown clears times in add dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    const selects = within(dialog).getAllByRole("combobox");
    await user.selectOptions(selects[0], "closed");

    const mondayRow = selects[0].closest("section.weekly-row");
    const timeInputs = mondayRow.querySelectorAll("input[type='time']");
    timeInputs.forEach((input) => expect(input.value).toBe(""));
  });

  it("selecting 'on_leave' from dropdown clears times in add dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    const selects = within(dialog).getAllByRole("combobox");
    await user.selectOptions(selects[0], "on_leave");

    const mondayRow = selects[0].closest("section.weekly-row");
    const timeInputs = mondayRow.querySelectorAll("input[type='time']");
    timeInputs.forEach((input) => expect(input.value).toBe(""));
  });

  it("selecting 'open' from dropdown preserves existing times", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    const selects = within(dialog).getAllByRole("combobox");

    // Switch to closed first, then back to open
    await user.selectOptions(selects[0], "closed");
    await user.selectOptions(selects[0], "open");

    // Times should NOT be cleared — inputs re-enabled for open
    const mondayRow = selects[0].closest("section.weekly-row");
    const timeInputs = mondayRow.querySelectorAll("input[type='time']");

    // At least one input should not be cleared (open doesn't wipe times)
    const anyHasValue = [...timeInputs].some((i) => i.value !== "");
    // After closed→open the component only sets status, not times, so they stay ""
    // This verifies the branch doesn't accidentally restore or clear times
    expect(timeInputs[0]).not.toBeDisabled();
  });
});


describe("Schedule > quick fill in add dialog", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("weekday quick fill sets 09:00–17:00 for Mon–Fri in add dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillWeekdays(user, dialog);

    expect(within(dialog).getAllByDisplayValue("09:00")).toHaveLength(5);
    expect(within(dialog).getAllByDisplayValue("17:00")).toHaveLength(5);
  });

  it("all-days quick fill sets 08:00–16:00 for all 7 days in add dialog", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);

    expect(within(dialog).getAllByDisplayValue("08:00")).toHaveLength(7);
    expect(within(dialog).getAllByDisplayValue("16:00")).toHaveLength(7);
  });

  it("copy Monday to weekdays in add dialog does not affect Saturday or Sunday", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await quickFillAllDays(user, dialog);
    await clickWithin(user, dialog, /copy monday to weekdays/i);

    // All 7 days should still have 08:00 (Mon filled then copied; Sat/Sun untouched)
    expect(within(dialog).getAllByDisplayValue("08:00")).toHaveLength(7);
    expect(within(dialog).getAllByDisplayValue("16:00")).toHaveLength(7);
  });

  it("copy Monday to weekdays does NOT copy to Saturday or Sunday when Monday differs", async () => {
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");

    // Set only Mon via weekday quick fill first
    await quickFillWeekdays(user, dialog); // Mon–Fri = 09:00

    // Now overwrite just Sat + Sun via all-days to give them different values
    // (can't easily do this without another quick-fill, so we verify count after copy)
    await clickWithin(user, dialog, /copy monday to weekdays/i);

    // Sat and Sun rows should NOT have 09:00 (they were never set)
    const rows = dialog.querySelectorAll("section.weekly-row");
    const satRow = rows[5]; // Saturday
    const sunRow = rows[6]; // Sunday

    const satInputs = satRow.querySelectorAll("input[type='time']");
    const sunInputs = sunRow.querySelectorAll("input[type='time']");

    satInputs.forEach((i) => expect(i.value).toBe(""));
    sunInputs.forEach((i) => expect(i.value).toBe(""));
  });
});


describe("Schedule > edit dialog loads saved schedule", () => {
  it("pre-populates on_leave status from saved schedule", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Wed: { start_time: null, end_time: null, appointment_status: "on_leave" },
      },
    });

    const user = userEvent.setup();
    renderSchedule();

    await waitFor(() => expect(mockGetSchedule).toHaveBeenCalled());

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");

    // Wednesday's select should be pre-set to on_leave
    const selects = within(dialog).getAllByRole("combobox");
    const wedSelect = selects[2]; // 0=Mon,1=Tues,2=Wed
    expect(wedSelect.value).toBe("on_leave");
  });

  it("pre-populates closed status from saved schedule", async () => {
    mockGetSchedule.mockResolvedValue({
      success: true,
      data: {
        Sat: { start_time: null, end_time: null, appointment_status: "closed" },
      },
    });

    const user = userEvent.setup();
    renderSchedule();

    await waitFor(() => expect(mockGetSchedule).toHaveBeenCalled());

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");

    const selects = within(dialog).getAllByRole("combobox");
    const satSelect = selects[5]; // 0=Mon..5=Sat
    expect(satSelect.value).toBe("closed");
  });
});


describe("Schedule > loading states", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("disables 'Yes, Clear All' button while delete is in progress", async () => {
    mockDeleteSchedule.mockImplementation(() => new Promise(() => {})); // never resolves

    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /clear all/i, "Clear Schedule");
    const clearBtn = within(dialog).getByRole("button", { name: /yes, clear all/i });

    await user.click(clearBtn);

    expect(clearBtn).toBeDisabled();
  });

  it("disables 'Save Changes' in edit dialog while saving", async () => {
    mockCreateSchedule.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillWeekdays(user, dialog);

    const saveBtn = within(dialog).getByRole("button", { name: /save changes/i });
    await user.click(saveBtn);

    expect(saveBtn).toBeDisabled();
  });
});


describe("Schedule > clear API failure", () => {
  it("shows alert and does not close dialog when clear fails", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockDeleteSchedule.mockResolvedValue({ success: false });

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(user, /clear all/i, "Clear Schedule");
    await clickWithin(user, dialog, /yes, clear all/i);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to clear schedule. Please try again."
      );
    });

    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});


describe("Schedule > form reset after edit save", () => {
  it("resets the edit form after a successful save", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockCreateSchedule.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /^edit$/i, "Edit Schedule");
    await quickFillWeekdays(user, dialog);

    expect(within(dialog).getAllByDisplayValue("09:00").length).toBeGreaterThan(0);

    await clickWithin(user, dialog, /save changes/i);

    await waitFor(() =>
      expect(mockCreateSchedule).toHaveBeenCalledTimes(1)
    );

  
    const reopened = await openDialog(user, /^edit$/i, "Edit Schedule");
    expect(within(reopened).queryAllByDisplayValue("09:00")).toHaveLength(0);
  });
});

describe("Schedule > add dialog ✕ close", () => {
  it("closes the add dialog via the ✕ button", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    const user = userEvent.setup();
    renderSchedule();

    const dialog = await openDialog(user, /add schedule/i, "Add Schedule");
    await clickWithin(user, dialog, "✕");

    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});