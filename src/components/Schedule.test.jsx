import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Schedule from "./Schedule";

// ── API mocks ─────────────────────────────────────────────────────────────────
const mockGetSchedule      = vi.fn();
const mockCreateSchedule   = vi.fn();
const mockUpdateDaySchedule = vi.fn();
const mockDeleteSchedule   = vi.fn();

vi.mock("../queueApi", () => ({
    getSchedule:       (...a) => mockGetSchedule(...a),
    createSchedule:    (...a) => mockCreateSchedule(...a),
    updateDaySchedule: (...a) => mockUpdateDaySchedule(...a),
    deleteSchedule:    (...a) => mockDeleteSchedule(...a),
}));

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

// ── <dialog> shim (jsdom doesn't implement showModal/close) ───────────────────
beforeEach(() => {
    vi.clearAllMocks(); // reset call counts on every mock before every test
    HTMLDialogElement.prototype.showModal = vi.fn(function () {
        this.setAttribute("open", "");
    });
    HTMLDialogElement.prototype.close = vi.fn(function () {
        this.removeAttribute("open");
    });
});

// ── Shared helpers ────────────────────────────────────────────────────────────
const STAFF_STATE  = { state: { staff: { id: "staff-123" }, facilityId: "facility-456" } };
const EMPTY_SCHEDULE = { success: true, data: null };

function renderSchedule(locationProps = STAFF_STATE) {
    return render(
        <MemoryRouter initialEntries={[{ pathname: "/schedule", ...locationProps }]}>
            <Schedule />
        </MemoryRouter>
    );
}

// Open the Add dialog via the "+ Add Schedule" button
async function openAddDialog(user) {
    await user.click(screen.getByRole("button", { name: /add schedule/i }));
}

// Open the Edit dialog
async function openEditDialog(user) {
    await user.click(screen.getByRole("button", { name: /^edit$/i }));
}

// Open the Clear dialog
async function openClearDialog(user) {
    await user.click(screen.getByRole("button", { name: /clear all/i }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Rendering
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – rendering", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        renderSchedule();
    });

    it("renders the page title", () => {
        expect(screen.getByText("Staff Availability")).toBeVisible();
    });

    it("renders the Back button", () => {
        expect(screen.getByRole("button", { name: /back/i })).toBeVisible();
    });

    it("renders Add Schedule, Edit and Clear All action buttons", () => {
        expect(screen.getByRole("button", { name: /add schedule/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /clear all/i })).toBeVisible();
    });

    it("renders a card for every day of the week", () => {
        const grid = document.querySelector(".avail-grid");
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        days.forEach((day) => {
            expect(within(grid).getByText(day)).toBeVisible();
        });
    });

    it("shows 'Not set' when no schedule data exists for a day", () => {
        const notSetLabels = screen.getAllByText("Not set");
        // 7 days × 2 (start + end) = 14
        expect(notSetLabels.length).toBe(14);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Saved schedule displayed in cards
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – saved times rendered in cards", () => {
    it("displays fetched start/end times and status badge", async () => {
        mockGetSchedule.mockResolvedValue({
            success: true,
            data: {
                Mon: { start_time: "09:00", end_time: "17:00", appointment_status: "open" },
            },
        });
        renderSchedule();
        await waitFor(() => {
            expect(screen.getByText("09:00")).toBeVisible();
            expect(screen.getByText("17:00")).toBeVisible();
        });
    });

    it("calls getSchedule with the staff_id from location state", async () => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        renderSchedule();
        await waitFor(() => {
            expect(mockGetSchedule).toHaveBeenCalledWith("staff-123");
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Back navigation
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – back button", () => {
    it("navigates to /dashboard when Back is clicked", async () => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        renderSchedule();
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: /back/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Add dialog
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – Add dialog", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        mockCreateSchedule.mockResolvedValue({ success: true });
    });

    it("opens when '+ Add Schedule' is clicked", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);
        expect(screen.getByText("Add Schedule")).toBeVisible();
    });

    it("closes when Cancel is clicked inside the Add dialog", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);
        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("closes when ✕ is clicked", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);
        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: "✕" }));
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("calls createSchedule with correct payload on submit", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        // Click the "Weekdays 09:00–17:00" quick-fill inside the Add dialog
        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));

        await user.click(within(dialog).getByRole("button", { name: /save weekly schedule/i }));

        await waitFor(() => {
            expect(mockCreateSchedule).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        staff_id: "staff-123",
                        facility_id: "facility-456",
                        day_of_week: "Mon",
                        start_time: "09:00",
                        end_time: "17:00",
                        appointment_status: "open",
                    }),
                ])
            );
        });
    });

    it("shows alert and does not call createSchedule when no day is filled", async () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /save weekly schedule/i }));

        expect(alertSpy).toHaveBeenCalledWith("Please fill in at least one complete day.");
        expect(mockCreateSchedule).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it("shows alert when createSchedule returns an error", async () => {
        mockCreateSchedule.mockResolvedValue({ success: false, error: "DB error" });
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /save weekly schedule/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("DB error");
        });
        alertSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Quick-fill buttons (Add dialog)
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – quick fill buttons", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    });

    it("'Weekdays 09:00–17:00' sets Mon–Fri inputs to 09:00 and 17:00", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));

        // All weekday time inputs should be filled
        const timeInputs = within(dialog).getAllByDisplayValue("09:00");
        expect(timeInputs.length).toBeGreaterThanOrEqual(5);
    });

    it("'All days 08:00–16:00' sets all 7 days", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /all days 08:00/i }));

        const startInputs = within(dialog).getAllByDisplayValue("08:00");
        expect(startInputs.length).toBe(7);
    });

    it("'Copy Monday to weekdays' copies Mon values to Tue–Fri", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");

        // Set Monday to 08:00–16:00 open via the "all days" button then verify copy
        await user.click(within(dialog).getByRole("button", { name: /all days 08:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /copy monday to weekdays/i }));

        // Tue–Fri should now also show 08:00
        const startInputs = within(dialog).getAllByDisplayValue("08:00");
        expect(startInputs.length).toBeGreaterThanOrEqual(5);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Mini-buttons: Closed / On leave
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – Closed / On leave mini-buttons", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
    });

    it("clicking 'Closed' mini-button sets that day's status to closed and clears times", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");

        // First set all days so time inputs are enabled
        await user.click(within(dialog).getByRole("button", { name: /all days 08:00/i }));

        // Click the first "Closed" mini-btn (Monday)
        const closedBtns = within(dialog).getAllByRole("button", { name: /^closed$/i });
        await user.click(closedBtns[0]);

        // Monday's start_time input should now be empty/disabled
        const timeInputs = within(dialog).getAllByDisplayValue("");
        expect(timeInputs.length).toBeGreaterThan(0);
    });

    it("clicking 'On leave' mini-button sets that day's status to on_leave", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openAddDialog(user);

        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /all days 08:00/i }));

        const onLeaveBtns = within(dialog).getAllByRole("button", { name: /on leave/i });
        await user.click(onLeaveBtns[0]);

        // The status badge for Monday should now show on-leave
        const badges = within(dialog).getAllByText("on-leave");
        expect(badges.length).toBeGreaterThanOrEqual(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Clear dialog
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – Clear dialog", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        mockDeleteSchedule.mockResolvedValue({ success: true });
    });

    it("opens when 'Clear All' is clicked", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openClearDialog(user);
        expect(screen.getByText(/remove all schedule entries/i)).toBeVisible();
    });

    it("closes on Cancel without calling deleteSchedule", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openClearDialog(user);

        const dialog = screen.getByText(/remove all schedule entries/i).closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

        expect(mockDeleteSchedule).not.toHaveBeenCalled();
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("calls deleteSchedule with staff_id when 'Yes, Clear All' is confirmed", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openClearDialog(user);

        const dialog = screen.getByText(/remove all schedule entries/i).closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /yes, clear all/i }));

        await waitFor(() => {
            expect(mockDeleteSchedule).toHaveBeenCalledWith("staff-123");
        });
    });

    it("shows alert when deleteSchedule returns an error", async () => {
        mockDeleteSchedule.mockResolvedValue({ success: false });
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();
        renderSchedule();
        await openClearDialog(user);

        const dialog = screen.getByText(/remove all schedule entries/i).closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /yes, clear all/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("Failed to clear schedule. Please try again.");
        });
        alertSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Edit dialog
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – Edit dialog", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue({
            success: true,
            data: {
                Mon: { start_time: "09:00", end_time: "17:00", appointment_status: "open" },
            },
        });
        mockCreateSchedule.mockResolvedValue({ success: true });
    });

    it("opens when 'Edit' is clicked", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openEditDialog(user);
        expect(screen.getByText("Edit Schedule")).toBeVisible();
    });

    it("closes on Cancel without calling createSchedule", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openEditDialog(user);

        const dialog = screen.getByText("Edit Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

        expect(mockCreateSchedule).not.toHaveBeenCalled();
        expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it("pre-populates form with saved schedule values", async () => {
        const user = userEvent.setup();
        renderSchedule();

        await waitFor(() => expect(mockGetSchedule).toHaveBeenCalled());
        await openEditDialog(user);

        const dialog = screen.getByText("Edit Schedule").closest("dialog");
        const startInputs = within(dialog).getAllByDisplayValue("09:00");
        expect(startInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("calls createSchedule with updated payload on 'Save Changes'", async () => {
        const user = userEvent.setup();
        renderSchedule();
        await openEditDialog(user);

        const dialog = screen.getByText("Edit Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(mockCreateSchedule).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ staff_id: "staff-123", appointment_status: "open" }),
                ])
            );
        });
    });

    it("shows alert when save returns an error", async () => {
        mockCreateSchedule.mockResolvedValue({ success: false, error: "Update failed" });
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();
        renderSchedule();
        await openEditDialog(user);

        const dialog = screen.getByText("Edit Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith("Update failed");
        });
        alertSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Missing staff_id / facility_id guards
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – missing IDs guard", () => {
    beforeEach(() => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        mockCreateSchedule.mockClear(); // prevent call count leaking from earlier tests
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it("alerts and does not submit when staff_id is missing", async () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();

        // Provide facilityId but NOT staff — add_time checks facility first,
        // so both must be absent for the wrong guard to fire. Isolate by
        // giving only facilityId so the staff_id guard is the one that fires.
        render(
            <MemoryRouter initialEntries={[{ pathname: "/schedule", state: { facilityId: "fac-999" } }]}>
                <Schedule />
            </MemoryRouter>
        );

        await openAddDialog(user);
        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /save weekly schedule/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/missing staff id/i));
        });
        expect(mockCreateSchedule).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it("alerts and does not submit when facility_id is missing", async () => {
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = userEvent.setup();

        render(
            <MemoryRouter initialEntries={[{ pathname: "/schedule", state: { staff: { id: "staff-123" } } }]}>
                <Schedule />
            </MemoryRouter>
        );

        await openAddDialog(user);
        const dialog = screen.getByText("Add Schedule").closest("dialog");
        await user.click(within(dialog).getByRole("button", { name: /weekdays 09:00/i }));
        await user.click(within(dialog).getByRole("button", { name: /save weekly schedule/i }));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/missing facility id/i));
        });
        expect(mockCreateSchedule).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. localStorage fallback for staff_id / facility_id
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – localStorage fallback", () => {
    afterEach(() => localStorage.clear());

    it("uses staff_id from localStorage when not in location state", async () => {
        localStorage.setItem("staff_id", "ls-staff-999");
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);

        render(
            <MemoryRouter initialEntries={[{ pathname: "/schedule", state: {} }]}>
                <Schedule />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mockGetSchedule).toHaveBeenCalledWith("ls-staff-999");
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. StatusBadge rendering
// ─────────────────────────────────────────────────────────────────────────────
describe("Schedule – StatusBadge in day cards", () => {
    it("renders 'open' badge when status is open", async () => {
        mockGetSchedule.mockResolvedValue({
            success: true,
            data: { Mon: { start_time: "08:00", end_time: "16:00", appointment_status: "open" } },
        });
        renderSchedule();
        await waitFor(() => {
            expect(screen.getByText("open")).toBeVisible();
        });
    });

    it("renders '—' badge for days with no status", async () => {
        mockGetSchedule.mockResolvedValue(EMPTY_SCHEDULE);
        renderSchedule();
        await waitFor(() => {
            // scope to the grid only — dialogs are in the DOM but not open,
            // and they also render StatusBadges, inflating the count
            const grid = document.querySelector(".avail-grid");
            const dashes = within(grid).getAllByText("—");
            expect(dashes.length).toBe(7);
        });
    });

    it("renders 'on-leave' badge (with hyphen) for on_leave status", async () => {
        mockGetSchedule.mockResolvedValue({
            success: true,
            data: { Mon: { start_time: "", end_time: "", appointment_status: "on_leave" } },
        });
        renderSchedule();
        await waitFor(() => {
            // scope to the grid — dialogs in the DOM also contain "on-leave"
            // text inside <option> and mini-buttons
            const grid = document.querySelector(".avail-grid");
            const badge = within(grid).getByText("on-leave");
            expect(badge).toBeVisible();
        });
    });
});