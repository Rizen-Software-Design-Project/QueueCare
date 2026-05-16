import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Schedule from "./Schedule";

// ─────────────────────────────────────────────────────────────
// API mocks
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Router mocks
// ─────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ─────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────
const STAFF_STATE = {
  state: {
    staff: { id: "staff-123" },
    facilityId: "facility-456",
  },
};

const EMPTY_SCHEDULE = {
  success: true,
  data: null,
};

// ─────────────────────────────────────────────────────────────
// Test factories
// ─────────────────────────────────────────────────────────────
const makeScheduleDay = (
  start = "08:00",
  end = "17:00",
  status = "open"
) => ({
  start_time: start,
  end_time: end,
  appointment_status: status,
});

const makeSchedule = (days) => ({
  success: true,
  data: days,
});

// ─────────────────────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Render helpers
// ─────────────────────────────────────────────────────────────
function renderSchedule(locationProps = STAFF_STATE) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/schedule",
          ...locationProps,
        },
      ]}
    >
      <Schedule />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────
const getDialog = (title) =>
  screen.getByText(title).closest("dialog");

const clickButton = async (user, scope, name) => {
  await user.click(
    within(scope).getByRole("button", { name })
  );
};

const openDialog = async (user, buttonName, title) => {
  await user.click(
    screen.getByRole("button", { name: buttonName })
  );

  return getDialog(title);
};

const quickFillWeekdays = async (user, dialog) => {
  await clickButton(
    user,
    dialog,
    /weekdays 09:00/i
  );
};

const quickFillAllDays = async (user, dialog) => {
  await clickButton(
    user,
    dialog,
    /all days 08:00/i
  );
};

const saveDialog = async (user, dialog, buttonLabel) => {
  await clickButton(user, dialog, buttonLabel);
};

// ─────────────────────────────────────────────────────────────
// Read refresh tests
// ─────────────────────────────────────────────────────────────
describe("Schedule > refresh after mutations", () => {
  it("refreshes after successful add", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockCreateSchedule.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save weekly schedule/i
    );

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledTimes(2);
    });
  });

  it("refreshes after successful clear", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockDeleteSchedule.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /clear all/i,
      "Clear Schedule"
    );

    await saveDialog(
      user,
      dialog,
      /yes, clear all/i
    );

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledTimes(2);
    });
  });

  it("refreshes after successful edit", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockCreateSchedule.mockResolvedValue({ success: true });

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save changes/i
    );

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledTimes(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────
describe("Schedule > validation", () => {
  it("alerts when staff ID is missing", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => {});

    const user = userEvent.setup();

    renderSchedule({
      state: {
        facilityId: "fac-456",
      },
    });

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save changes/i
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Missing staff ID."
      );
    });

    expect(mockCreateSchedule).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("alerts when facility ID is missing", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => {});

    const user = userEvent.setup();

    renderSchedule({
      state: {
        staff: { id: "staff-123" },
      },
    });

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save changes/i
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Missing facility ID."
      );
    });

    alertSpy.mockRestore();
  });

  it("alerts about missing facility before staff", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => {});

    const user = userEvent.setup();

    renderSchedule({
      state: {},
    });

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save weekly schedule/i
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringMatching(/missing facility id/i)
      );
    });

    alertSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────
// Payload tests
// ─────────────────────────────────────────────────────────────
describe("Schedule > payload handling", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    mockCreateSchedule.mockResolvedValue({ success: true });
  });

  it("sends null times for closed days", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    const closedButtons = within(dialog).getAllByRole(
      "button",
      {
        name: /^closed$/i,
      }
    );

    await user.click(closedButtons[0]);

    await saveDialog(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload =
        mockCreateSchedule.mock.calls[0][0];

      expect(payload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            day_of_week: "Mon",
            appointment_status: "closed",
            start_time: null,
            end_time: null,
          }),
        ])
      );
    });
  });

  it("only includes configured days", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    const closedButtons = within(dialog).getAllByRole(
      "button",
      {
        name: /^closed$/i,
      }
    );

    await user.click(closedButtons[0]);

    await saveDialog(user, dialog, /save changes/i);

    await waitFor(() => {
      const payload =
        mockCreateSchedule.mock.calls[0][0];

      expect(payload).toHaveLength(1);

      expect(payload[0]).toEqual(
        expect.objectContaining({
          day_of_week: "Mon",
        })
      );
    });
  });

  it("uses localStorage IDs", async () => {
    localStorage.setItem("staff_id", "ls-staff");
    localStorage.setItem("facility_id", "ls-fac");

    const user = userEvent.setup();

    renderSchedule({
      state: {},
    });

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save weekly schedule/i
    );

    await waitFor(() => {
      const payload =
        mockCreateSchedule.mock.calls[0][0];

      expect(payload).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            staff_id: "ls-staff",
            facility_id: "ls-fac",
          }),
        ])
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Quick fill
// ─────────────────────────────────────────────────────────────
describe("Schedule > quick fill", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("applies weekday quick fill", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillWeekdays(user, dialog);

    expect(
      within(dialog).getAllByDisplayValue("09:00")
    ).toHaveLength(5);

    expect(
      within(dialog).getAllByDisplayValue("17:00")
    ).toHaveLength(5);
  });

  it("applies all-days quick fill", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillAllDays(user, dialog);

    expect(
      within(dialog).getAllByDisplayValue("08:00")
    ).toHaveLength(7);

    expect(
      within(dialog).getAllByDisplayValue("16:00")
    ).toHaveLength(7);
  });

  it("copies Monday to weekdays", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await quickFillAllDays(user, dialog);

    await clickButton(
      user,
      dialog,
      /copy monday to weekdays/i
    );

    expect(
      within(dialog).getAllByDisplayValue("08:00")
    ).toHaveLength(7);
  });
});

// ─────────────────────────────────────────────────────────────
// Status behavior
// ─────────────────────────────────────────────────────────────
describe("Schedule > status handling", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("clears times when changing to closed", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillAllDays(user, dialog);

    const selects =
      within(dialog).getAllByRole("combobox");

    await user.selectOptions(selects[0], "closed");

    const mondayRow =
      selects[0].closest("section.weekly-row");

    const timeInputs =
      mondayRow.querySelectorAll("input[type='time']");

    timeInputs.forEach((input) => {
      expect(input.value).toBe("");
    });
  });

  it("clears times when changing to on_leave", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillAllDays(user, dialog);

    const selects =
      within(dialog).getAllByRole("combobox");

    await user.selectOptions(selects[0], "on_leave");

    const mondayRow =
      selects[0].closest("section.weekly-row");

    const timeInputs =
      mondayRow.querySelectorAll("input[type='time']");

    timeInputs.forEach((input) => {
      expect(input.value).toBe("");
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Dialog close
// ─────────────────────────────────────────────────────────────
describe("Schedule > dialog close buttons", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("closes edit dialog", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    await clickButton(user, dialog, "✕");

    expect(
      HTMLDialogElement.prototype.close
    ).toHaveBeenCalled();
  });

  it("closes clear dialog", async () => {
    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /clear all/i,
      "Clear Schedule"
    );

    await clickButton(user, dialog, "✕");

    expect(
      HTMLDialogElement.prototype.close
    ).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// Saved schedule loading
// ─────────────────────────────────────────────────────────────
describe("Schedule > load saved schedule", () => {
  it("loads existing schedule into edit form", async () => {
    mockGetSchedule.mockResolvedValue(
      makeSchedule({
        Mon: makeScheduleDay("08:00", "14:00"),
        Fri: makeScheduleDay("10:00", "18:00"),
      })
    );

    const user = userEvent.setup();

    renderSchedule();

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalled();
    });

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    expect(
      within(dialog).getAllByDisplayValue("08:00")
        .length
    ).toBeGreaterThan(0);

    expect(
      within(dialog).getAllByDisplayValue("14:00")
        .length
    ).toBeGreaterThan(0);

    expect(
      within(dialog).getAllByDisplayValue("10:00")
        .length
    ).toBeGreaterThan(0);
  });

  it("fills empty days with blank values", async () => {
    mockGetSchedule.mockResolvedValue(
      makeSchedule({
        Mon: makeScheduleDay("09:00", "17:00"),
      })
    );

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /^edit$/i,
      "Edit Schedule"
    );

    const inputs =
      dialog.querySelectorAll("input[type='time']");

    const emptyInputs = [...inputs].filter(
      (i) => i.value === ""
    );

    expect(emptyInputs.length).toBeGreaterThanOrEqual(
      12
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────
describe("Schedule > navigation", () => {
  it("navigates back to dashboard", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    const user = userEvent.setup();

    renderSchedule();

    await user.click(
      screen.getByRole("button", {
        name: /back/i,
      })
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      "/dashboard"
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Loading states
// ─────────────────────────────────────────────────────────────
describe("Schedule > loading states", () => {
  it("disables save button while saving", async () => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

    mockCreateSchedule.mockImplementation(
      () => new Promise(() => {})
    );

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    const saveButton = within(dialog).getByRole(
      "button",
      {
        name: /save weekly schedule/i,
      }
    );

    await user.click(saveButton);

    expect(saveButton).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────
// API failures
// ─────────────────────────────────────────────────────────────
describe("Schedule > API failures", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("handles create failure", async () => {
    mockCreateSchedule.mockResolvedValue({
      success: false,
      error: "Failed to save schedule.",
    });

    const alertSpy = vi
      .spyOn(window, "alert")
      .mockImplementation(() => {});

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    await saveDialog(
      user,
      dialog,
      /save weekly schedule/i
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it("handles getSchedule failure gracefully", async () => {
    mockGetSchedule.mockResolvedValue({
      success: false,
      data: null,
    });

    renderSchedule();

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalled();
    });

    expect(
      screen.getAllByText("Not set")
    ).toHaveLength(14);
  });
});

// ─────────────────────────────────────────────────────────────
// Form reset
// ─────────────────────────────────────────────────────────────
describe("Schedule > form reset", () => {
  beforeEach(() => {
    mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
  });

  it("resets form after successful add", async () => {
    mockCreateSchedule.mockResolvedValue({
      success: true,
    });

    const user = userEvent.setup();

    renderSchedule();

    const dialog = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    await quickFillWeekdays(user, dialog);

    expect(
      within(dialog).getAllByDisplayValue("09:00")
        .length
    ).toBeGreaterThan(0);

    await saveDialog(
      user,
      dialog,
      /save weekly schedule/i
    );

    await waitFor(() => {
      expect(mockCreateSchedule).toHaveBeenCalledTimes(
        1
      );
    });

    const reopened = await openDialog(
      user,
      /add schedule/i,
      "Add Schedule"
    );

    expect(
      within(reopened).queryAllByDisplayValue(
        "09:00"
      )
    ).toHaveLength(0);
  });
});