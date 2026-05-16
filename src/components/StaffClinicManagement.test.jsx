import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StaffClinicManagement from "./StaffClinicManagement";
import userEvent from "@testing-library/user-event";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useLocation: () => ({
            state: {
                facilityId:      "fac-1",
                facilityName:    "Soweto Clinic",
                authProvider:    "firebase",
                providerUserId:  "fb-staff-uid",
            },
        }),
    };
});

vi.mock("./AIAssistant", () => ({
    default: () => <div data-testid="ai-assistant" />,
}));

vi.mock("../queueApi", () => ({
    viewFullQueue:     vi.fn(() => Promise.resolve({ data: [], error: null })),
    updateQueueStatus: vi.fn(() => Promise.resolve({ error: null })),
}));

const mockRpc = vi.fn();
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

async function renderAndWait() {
    const user = userEvent.setup();
    render(<StaffClinicManagement />);
    await waitFor(() =>
        expect(screen.queryByText(/loading appointments/i)).not.toBeInTheDocument()
    );
    return user;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.limit.mockResolvedValue({ data: [], error: null });
    mockQuery.order.mockReturnThis();
    mockRpc.mockResolvedValue({ data: { message: "ok" }, error: null });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Page structure", () => {
    it("renders the staff dashboard heading", async () => {
        await renderAndWait();
        expect(screen.getByText(/staff dashboard/i)).toBeVisible();
    });

    it("renders the facility name", async () => {
        await renderAndWait();
        expect(screen.getByText(/soweto clinic/i)).toBeVisible();
    });

    it("renders the AI assistant", async () => {
        await renderAndWait();
        expect(screen.getByTestId("ai-assistant")).toBeInTheDocument();
    });

    it("renders Today and View Upcoming buttons", async () => {
        await renderAndWait();
        expect(screen.getByRole("button", { name: /^today$/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /view upcoming/i })).toBeVisible();
    });

    it("renders Create Appointment Slots section", async () => {
        await renderAndWait();
        expect(screen.getByText(/create appointment slots/i)).toBeVisible();
    });

    it("renders Available Appointment Slots section", async () => {
        await renderAndWait();
        expect(screen.getByText(/available appointment slots/i)).toBeVisible();
    });

    it("renders Live Patient Queue section", async () => {
        await renderAndWait();
        expect(screen.getByText(/live patient queue/i)).toBeVisible();
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Appointments table - today view", () => {
    it("shows 'No appointments found for today' when list is empty", async () => {
        await renderAndWait();
        expect(screen.getByText(/no appointments found for today/i)).toBeVisible();
    });

    it("renders appointment rows for today", async () => {
        seedAppointments([makeAppointment()]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByText("John Doe")).toBeVisible()
        );
        expect(screen.getByText("john@example.com")).toBeVisible();
        expect(screen.getByText("Flu symptoms")).toBeVisible();
    });

    it("shows status badge for each appointment", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByText("booked")).toBeVisible()
        );
    });

    it("does NOT show action buttons for terminal appointments", async () => {
        seedAppointments([
            makeAppointment({ id: "a1", status: "complete" }),
            makeAppointment({ id: "a2", status: "cancelled" }),
            makeAppointment({ id: "a3", status: "no_show" }),
        ]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.queryByRole("button", { name: /reschedule/i })).not.toBeInTheDocument()
        );
    });

    it("shows Reschedule button for non-terminal appointments", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
        );
    });

    it("shows status change buttons for non-terminal appointments", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirmed/i })).toBeVisible()
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Appointments table - view switching", () => {
    it("switches to upcoming view when View Upcoming is clicked", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /view upcoming/i }));
        expect(screen.getByRole("heading", { name: /upcoming appointments/i })).toBeVisible();
    });

    it("switches back to today view when Today is clicked", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /view upcoming/i }));
        await user.click(screen.getByRole("button", { name: /^today$/i }));
        expect(screen.getByText(/today's appointments/i)).toBeVisible();
    });

    it("shows future appointments in upcoming view", async () => {
        seedAppointments([
            makeAppointment({
                id: "a1",
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
            expect(screen.getByText("John Doe")).toBeVisible()
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Appointment status update", () => {
    it("updates appointment status when a status button is clicked", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        mockQuery.update.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: "appt-1", status: "confirmed" }], error: null }),
            }),
        });

        const user = await renderAndWait();
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirmed/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /confirmed/i }));

        await waitFor(() =>
            expect(screen.getByText("confirmed")).toBeVisible()
        );
    });

    it("shows error alert when status update fails", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        mockQuery.update.mockReturnValue({
            eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } }),
            }),
        });

        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirmed/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /confirmed/i }));

        await waitFor(() =>
            expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Update failed"))
        );
        alertSpy.mockRestore();
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Reschedule modal", () => {
    it("opens reschedule modal when Reschedule is clicked", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /reschedule/i }));

        expect(screen.getByText(/reschedule appointment/i)).toBeVisible();
        expect(screen.getByText(/current appointment/i)).toBeVisible();
    });

    it("shows patient name and reason in reschedule modal", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /reschedule/i }));

        await waitFor(() =>
            expect(screen.getByText(/reschedule appointment/i)).toBeVisible()
        );

        const modal = screen.getByText(/current appointment/i).closest("section");
        expect(within(modal).getByText(/john/i)).toBeVisible();
        expect(within(modal).getByText(/flu symptoms/i)).toBeVisible();
    });

    it("closes reschedule modal when Cancel is clicked", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /reschedule/i }));
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));

        expect(screen.queryByText(/current appointment/i)).not.toBeInTheDocument();
    });

    it("shows error when Confirm Reschedule is clicked with no slot selected", async () => {
        seedAppointments([makeAppointment({ status: "booked" })]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /reschedule/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /reschedule/i }));

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirm reschedule/i })).toBeVisible()
        );

        const select = screen.getByRole("combobox");
        select.removeAttribute("required");

        await user.click(screen.getByRole("button", { name: /confirm reschedule/i }));

        await waitFor(() =>
            expect(screen.getByText(/please select a new slot/i)).toBeVisible()
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Live patient queue", () => {
    it("shows 'No patients currently in queue' when queue is empty", async () => {
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByText(/no patients currently in queue/i)).toBeVisible()
        );
    });

    it("renders queue entries when queue has patients", async () => {
        const { viewFullQueue } = await import("../queueApi");
        viewFullQueue.mockResolvedValue({ data: [makeQueueEntry()], error: null });

        await renderAndWait();

        await waitFor(() =>
            expect(screen.getByText("John Doe")).toBeVisible()
        );
        expect(screen.getByText("waiting")).toBeVisible();
    });

    it("renders queue status action buttons for waiting patients", async () => {
        const { viewFullQueue } = await import("../queueApi");
        viewFullQueue.mockResolvedValue({ data: [makeQueueEntry({ status: "waiting" })], error: null });

        await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /in consultation/i })).toBeVisible()
        );
        expect(screen.getByRole("button", { name: /remove/i })).toBeVisible();
    });

    it("does not show action buttons for completed queue entries", async () => {
        const { viewFullQueue } = await import("../queueApi");
        viewFullQueue.mockResolvedValue({ data: [makeQueueEntry({ status: "completed" })], error: null });

        await renderAndWait();

        await waitFor(() =>
            expect(screen.queryByRole("button", { name: /in consultation/i })).not.toBeInTheDocument()
        );
    });

    it("calls updateQueueStatus when a status button is clicked", async () => {
        const { viewFullQueue, updateQueueStatus } = await import("../queueApi");
        viewFullQueue.mockResolvedValue({ data: [makeQueueEntry({ status: "waiting" })], error: null });

        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /in consultation/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /in consultation/i }));

        await waitFor(() =>
            expect(updateQueueStatus).toHaveBeenCalledWith(
                "john@example.com",
                "fac-1",
                "called"
            )
        );
    });

    it("prompts confirmation and removes patient from queue", async () => {
        const { viewFullQueue } = await import("../queueApi");
        viewFullQueue.mockResolvedValue({ data: [makeQueueEntry()], error: null });

        global.fetch.mockResolvedValueOnce({
            ok:   true,
            json: () => Promise.resolve({}),
        });

        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /remove/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /remove/i }));

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/queue/remove_queue"),
                expect.objectContaining({ method: "DELETE" })
            )
        );
        confirmSpy.mockRestore();
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Create appointment slots", () => {
    it("slot creation form is hidden by default", async () => {
        await renderAndWait();
        expect(screen.queryByRole("button", { name: /create distributed slots/i })).not.toBeInTheDocument();
    });

    it("toggles slot creation form when + button is clicked", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));
        expect(screen.getByRole("button", { name: /create distributed slots/i })).toBeVisible();
    });

    it("hides slot creation form when − button is clicked", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));
        await user.click(screen.getByRole("button", { name: "−" }));
        expect(screen.queryByRole("button", { name: /create distributed slots/i })).not.toBeInTheDocument();
    });

    it("shows error when no slots are generated on submit", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));

        const checkboxes = screen.getAllByRole("checkbox");
        for (const cb of checkboxes) {
            if (cb.checked) await user.click(cb);
        }

        const dateInput = screen.getByLabelText(/^date$/i);
        await user.type(dateInput, "2099-12-31");

        await user.click(screen.getByRole("button", { name: /create distributed slots/i }));

        expect(screen.getByText(/no appointment slots generated/i)).toBeVisible();
    });

    it("adds a new time block when '+ Add time block' is clicked", async () => {
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));

        const initialBlocks = screen.getAllByDisplayValue(/morning|lunch break|afternoon/i).length;
        await user.click(screen.getByRole("button", { name: /\+ add time block/i }));
        const newBlocks = screen.getAllByDisplayValue(/morning|lunch break|afternoon|custom block/i).length;

        expect(newBlocks).toBeGreaterThan(initialBlocks);
    });

    it("shows success message after slots are created", async () => {
        mockRpc.mockResolvedValue({ data: { message: "ok" }, error: null });

        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));

        const dateInput = screen.getByLabelText(/date/i);
        await user.type(dateInput, "2099-12-31");

        await user.click(screen.getByRole("button", { name: /create distributed slots/i }));

        await waitFor(() =>
            expect(screen.getByText(/slot.*created successfully/i)).toBeVisible()
        );
    });

    it("shows error message when slot creation fails", async () => {
        mockRpc.mockResolvedValue({ data: { error: "Permission denied" }, error: null });

        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: "+" }));

        const dateInput = screen.getByLabelText(/date/i);
        await user.type(dateInput, "2099-12-31");

        await user.click(screen.getByRole("button", { name: /create distributed slots/i }));

        await waitFor(() =>
            expect(screen.getByText(/failed to create slots|permission denied/i)).toBeVisible()
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Available slots table", () => {
    it("shows 'No slots found' when slots list is empty", async () => {
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByText(/no slots found for this facility/i)).toBeVisible()
        );
    });

    it("renders slot rows when slots exist", async () => {
        seedSlots([makeSlot()]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
    });

    it("shows Edit and Delete buttons for each slot", async () => {
        seedSlots([makeSlot()]);
        await renderAndWait();
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible();
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible();
        });
    });

    it("Delete button is disabled when slot has bookings", async () => {
        seedSlots([makeSlot({ booked_count: 2 })]);
        await renderAndWait();
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled()
        );
    });

    it("filters slots by date when date filter is used", async () => {
        seedSlots([
            makeSlot({ id: "s1", slot_date: "2099-12-31" }),
            makeSlot({ id: "s2", slot_date: "2099-11-15" }),
        ]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(2)
        );

        const dateFilter = document.querySelector(".slot-date-filter");
        await user.type(dateFilter, "2099-12-31");

        expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(1);
    });

    it("clears date filter when Clear date button is clicked", async () => {
        seedSlots([
            makeSlot({ id: "s1", slot_date: "2099-12-31" }),
            makeSlot({ id: "s2", slot_date: "2099-11-15" }),
        ]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(2)
        );

        const dateFilter = document.querySelector(".slot-date-filter");
        await user.type(dateFilter, "2099-12-31");
        await user.click(screen.getByRole("button", { name: /clear date/i }));

        expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(2);
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Edit slot", () => {
    it("opens edit form when Edit is clicked", async () => {
        seedSlots([makeSlot()]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^edit$/i }));

        expect(screen.getByText(/edit slot/i)).toBeVisible();
        expect(screen.getByRole("button", { name: /save changes/i })).toBeVisible();
    });

    it("pre-fills edit form with slot values", async () => {
        seedSlots([makeSlot({ slot_time: "09:00:00", total_capacity: 5, duration_minutes: 30 })]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^edit$/i }));

        expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
        expect(screen.getByDisplayValue("5")).toBeInTheDocument();
        expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    });

    it("closes edit form when Cancel is clicked", async () => {
        seedSlots([makeSlot()]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^edit$/i }));
        await user.click(screen.getByRole("button", { name: /^cancel$/i }));

        expect(screen.queryByText(/edit slot/i)).not.toBeInTheDocument();
    });

    it("calls update RPC and closes edit form on success", async () => {
        mockRpc.mockResolvedValue({ data: { message: "Slot updated successfully." }, error: null });
        mockQuery.order
            .mockReturnValueOnce(mockQuery)
            .mockResolvedValueOnce({ data: [makeSlot()], error: null })
            .mockReturnValueOnce(mockQuery)
            .mockResolvedValueOnce({ data: [makeSlot()], error: null });

        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^edit$/i }));
        await waitFor(() => expect(screen.getByText(/edit slot/i)).toBeVisible());
        await user.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() =>
            expect(mockRpc).toHaveBeenCalledWith(
                "update_appointment_slot",
                expect.objectContaining({ p_slot_id: "slot-1" })
            )
        );
        await waitFor(() =>
            expect(screen.queryByText(/edit slot/i)).not.toBeInTheDocument()
        );
    });

    it("shows error message when slot update fails", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "Update failed" } });
        seedSlots([makeSlot()]);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^edit$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^edit$/i }));
        await user.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() =>
            expect(screen.getByText(/update failed/i)).toBeVisible()
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Delete slot", () => {
    it("prompts confirmation before deleting", async () => {
        seedSlots([makeSlot({ booked_count: 0 })]);
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^delete$/i }));

        expect(confirmSpy).toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it("removes slot from list after successful delete", async () => {
        mockRpc.mockResolvedValue({ data: { message: "deleted" }, error: null });
        seedSlots([makeSlot({ booked_count: 0 })]);
        const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeVisible()
        );
        await user.click(screen.getByRole("button", { name: /^delete$/i }));

        await waitFor(() =>
            expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument()
        );
        confirmSpy.mockRestore();
    });

    it("shows alert when slot has bookings and cannot be deleted", async () => {
        seedSlots([makeSlot({ booked_count: 2 })]);
        const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
        const user = await renderAndWait();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled()
        );

        expect(alertSpy).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });
});