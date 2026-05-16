import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WalkIn from "./Walkin";
import userEvent from "@testing-library/user-event";


//jump-mocks
//jump-loading
//jump-queue-tab
//jump-book-tab
//jump-checkin-tab


//jump-mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);


const slotsOrderFinal = vi.fn();

const mockQuery = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    or:          vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit:       vi.fn().mockResolvedValue({ data: [], error: null }),
};

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => mockQuery),
        auth: { signOut: vi.fn(() => Promise.resolve()) },
    },
}));

const mockIdentity = {
    auth_provider:    "firebase",
    provider_user_id: "fb-staff-uid",
};

const mockStaffDbProfile = { id: "staff-db-id" };

const mockAssignment = {
    facility_id: "fac-1",
    facilities:  { id: "fac-1", name: "Soweto Clinic" },
};

const TODAY = new Date().toISOString().split("T")[0];

const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
const todaySlotTime = inOneHour.toTimeString().slice(0, 8);

const mockTodaySlot = {
    id:               "slot-today",
    slot_date:        TODAY,
    slot_time:        todaySlotTime,
    duration_minutes: 30,
    total_capacity:   5,
    booked_count:     2,
};

const mockFutureSlot = {
    id:               "slot-future",
    slot_date:        "2099-12-31",
    slot_time:        "09:00:00",
    duration_minutes: 30,
    total_capacity:   5,
    booked_count:     1,
};

const mockPatientProfile = {
    id:           "patient-id",
    name:         "John",
    surname:      "Doe",
    email:        "john@example.com",
    phone_number: "0820000000",
    sex:          "male",
    dob:          "2000-01-01",
};


function seedMount({ slots = [mockTodaySlot, mockFutureSlot] } = {}) {
    localStorage.setItem("userIdentity", JSON.stringify(mockIdentity));

    mockQuery.maybeSingle
        .mockResolvedValueOnce({ data: mockStaffDbProfile, error: null })
        .mockResolvedValueOnce({ data: mockAssignment,     error: null });

    slotsOrderFinal.mockResolvedValue({ data: slots, error: null });
    mockQuery.order.mockReturnValue({ order: slotsOrderFinal });
}

async function renderAndWait() {
    const user = userEvent.setup();
    render(<WalkIn />);
    await waitFor(() =>
        expect(screen.queryByText(/loading facility/i)).not.toBeInTheDocument()
    );
    return user;
}

async function searchForPatient(user, contact = "john@example.com") {
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: mockPatientProfile, error: null });
    const input = screen.getByPlaceholderText(/email or phone/i);
    await user.clear(input);
    await user.type(input, contact);
    await user.click(screen.getByRole("button", { name: /find/i }));
    await waitFor(() =>
        expect(screen.getByText(/profile found/i)).toBeVisible()
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockQuery.order.mockReturnThis();
});


//jump-loading
describe("Loading state", () => {
    it("shows loading message while facility is being fetched", () => {
        localStorage.setItem("userIdentity", JSON.stringify(mockIdentity));
        mockQuery.maybeSingle.mockReturnValue(new Promise(() => {})); // never resolves
        render(<WalkIn />);
        expect(screen.getByText(/loading facility/i)).toBeVisible();
    });
});

describe("Error states", () => {
    it("shows error when not logged in (no identity in localStorage)", async () => {
        localStorage.clear();
        render(<WalkIn />);
        await waitFor(() =>
            expect(screen.getByText(/not logged in/i)).toBeVisible()
        );
    });

    it("shows error when staff profile cannot be loaded", async () => {
        localStorage.setItem("userIdentity", JSON.stringify(mockIdentity));
        mockQuery.maybeSingle
            .mockResolvedValueOnce({ data: null, error: null });
        render(<WalkIn />);
        await waitFor(() =>
            expect(screen.getByText(/could not load your profile/i)).toBeVisible()
        );
    });

    it("shows error when staff has no facility assignment", async () => {
        localStorage.setItem("userIdentity", JSON.stringify(mockIdentity));
        mockQuery.maybeSingle
            .mockResolvedValueOnce({ data: mockStaffDbProfile, error: null })
            .mockResolvedValueOnce({ data: null, error: null });
        render(<WalkIn />);
        await waitFor(() =>
            expect(screen.getByText(/not assigned to a facility/i)).toBeVisible()
        );
    });
});


describe("Page structure", () => {
    beforeEach(async () => {
        seedMount();
        await renderAndWait();
    });

    it("renders the page heading", () => {
        expect(screen.getByText(/walk-in patients/i)).toBeVisible();
    });

    it("renders the facility name", () => {
        expect(screen.getByText(/soweto clinic/i)).toBeVisible();
    });

    it("renders all three tab buttons", () => {
        expect(screen.getByRole("button", { name: /queue today/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /book future appointment/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /check in patient/i })).toBeVisible();
    });

    it("renders the Back button", () => {
        expect(screen.getByRole("button", { name: /back/i })).toBeVisible();
    });

    it("Back button calls navigate(-1)", async () => {
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: /back/i }));
        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("renders Step 1 patient search input", () => {
        expect(screen.getByPlaceholderText(/email or phone/i)).toBeVisible();
    });

    it("renders the Find button", () => {
        expect(screen.getByRole("button", { name: /find/i })).toBeVisible();
    });
});


describe("Step 1 - patient search", () => {
    beforeEach(async () => {
        seedMount();
        await renderAndWait();
    });

    it("shows error message when patient is not found", async () => {
        const user = userEvent.setup();
        mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        await user.type(screen.getByPlaceholderText(/email or phone/i), "unknown@test.com");
        await user.click(screen.getByRole("button", { name: /find/i }));

        await waitFor(() =>
            expect(screen.getByText(/no profile found/i)).toBeVisible()
        );
    });

    it("shows success message and profile card when patient is found", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(screen.getByText("John Doe")).toBeVisible();
        expect(screen.getByText(/john@example.com/i)).toBeVisible();
        expect(screen.getByText(/profile found/i)).toBeVisible();
    });

    it("renders patient email and phone in profile card", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(screen.getByText(/john@example.com/i)).toBeVisible();
        expect(screen.getByText(/0820000000/i)).toBeVisible();
    });
});


//jump-queue-tab
describe("Queue Today tab - render", () => {
    beforeEach(async () => {
        seedMount();
        await renderAndWait();
    });

    it("Queue Today is the default active tab", () => {
        expect(screen.getByText(/find a registered patient and add them to today/i)).toBeVisible();
    });

    it("renders Step 2 slot selector and reason input after patient found", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(
            screen.getByLabelText(/reason for visit/i)
        ).toBeVisible();

        expect(screen.getByRole("combobox")).toBeVisible();
    });

    it("renders today's available slots in the dropdown", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        const options = screen.getAllByRole("option");
        const slotOption = options.find((o) => o.value === "slot-today");
        expect(slotOption).toBeTruthy();
    });

    it("submit button is disabled when no slot is selected", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(screen.getByRole("button", { name: /add to today's queue/i })).toBeDisabled();
    });

    it("submit button is enabled after selecting a slot", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-today");

        expect(screen.getByRole("button", { name: /add to today's queue/i })).not.toBeDisabled();
    });
});

describe("Queue Today tab - submit", () => {
    it("calls book-walkin and add_to_queue APIs on submit, then shows success", async () => {
        seedMount();
        const user = await renderAndWait();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-today");

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment_id: "appt-1" }) })
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ position: 3 }) });

        await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

        await waitFor(() =>
            expect(screen.getByText(/booked and added to today's queue/i)).toBeVisible()
        );

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/appointments/book-walkin"),
            expect.objectContaining({ method: "POST" })
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/queue/add_to_queue"),
            expect.objectContaining({ method: "POST" })
        );
    });

    it("shows error message when book-walkin API fails", async () => {
        seedMount();
        const user = await renderAndWait();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-today");

        global.fetch.mockResolvedValueOnce({
            ok:   false,
            json: () => Promise.resolve({ error: "Slot is full." }),
        });

        await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

        await waitFor(() =>
            expect(screen.getByText(/slot is full/i)).toBeVisible()
        );
    });

    it("shows error when queue API fails after successful booking", async () => {
        seedMount();
        const user = await renderAndWait();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-today");

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment_id: "appt-1" }) })
            .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: "Queue error." }) });

        await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

        await waitFor(() =>
            expect(screen.getByText(/queue error/i)).toBeVisible()
        );
    });

    it("clears the form and profile card after successful submission", async () => {
        seedMount();
        const user = await renderAndWait();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-today");

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

        await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

        await waitFor(() =>
            expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
        );
    });
});


//jump-book-tab
describe("Book Future Appointment tab - render", () => {
    beforeEach(async () => {
        seedMount();
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /book future appointment/i }));
    });

    it("shows the correct tab description", () => {
        expect(screen.getByText(/schedule a future appointment/i)).toBeVisible();
    });

    it("renders future slots in dropdown after patient found", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        const options = screen.getAllByRole("option");
        const futureOption = options.find((o) => o.value === "slot-future");
        expect(futureOption).toBeTruthy();
    });

    it("does NOT show today's slot in the Book Future tab", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        const options = screen.getAllByRole("option");
        const todayOption = options.find((o) => o.value === "slot-today");
        expect(todayOption).toBeUndefined();
    });

    it("submit button reads 'Book Appointment'", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-future");
        expect(screen.getByRole("button", { name: /book appointment/i })).toBeVisible();
    });
});

describe("Book Future Appointment tab - submit", () => {
    it("calls book-walkin API and shows success with date on submit", async () => {
        seedMount();
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /book future appointment/i }));
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-future");

        global.fetch.mockResolvedValueOnce({
            ok:   true,
            json: () => Promise.resolve({ appointment_id: "appt-2" }),
        });

        await user.click(screen.getByRole("button", { name: /book appointment/i }));

        await waitFor(() =>
            expect(screen.getByText(/appointment booked for john doe/i)).toBeVisible()
        );

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/appointments/book-walkin"),
            expect.objectContaining({ method: "POST" })
        );
        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining("/queue/add_to_queue"),
            expect.anything()
        );
    });

    it("shows error when book-walkin API fails", async () => {
        seedMount();
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /book future appointment/i }));
        await searchForPatient(user);

        await user.selectOptions(screen.getByRole("combobox"), "slot-future");

        global.fetch.mockResolvedValueOnce({
            ok:   false,
            json: () => Promise.resolve({ error: "Slot unavailable." }),
        });

        await user.click(screen.getByRole("button", { name: /book appointment/i }));

        await waitFor(() =>
            expect(screen.getByText(/slot unavailable/i)).toBeVisible()
        );
    });
});


//jump-checkin-tab
describe("Check In Patient tab - render", () => {
    beforeEach(async () => {
        seedMount();
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /check in patient/i }));
    });

    it("shows the correct tab description", () => {
        expect(screen.getByText(/existing booking/i)).toBeVisible();
    });

    it("renders Confirm Check In button after patient found", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(screen.getByRole("button", { name: /confirm check in/i })).toBeVisible();
    });

    it("does NOT render slot selector or reason input in check-in tab", async () => {
        const user = userEvent.setup();
        await searchForPatient(user);

        expect(screen.queryByPlaceholderText(/reason/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
});

describe("Check In Patient tab - submit", () => {
    async function setupCheckin() {
        seedMount();
        const user = await renderAndWait();
        await user.click(screen.getByRole("button", { name: /check in patient/i }));
        await searchForPatient(user);
        return user;
    }

    it("shows error when patient has no booked appointment today", async () => {
        const user = await setupCheckin();

        mockQuery.in.mockResolvedValueOnce({ data: [], error: null });

        await user.click(screen.getByRole("button", { name: /confirm check in/i }));

        await waitFor(() =>
            expect(screen.getByText(/no booked appointment at this clinic today/i)).toBeVisible()
        );
    });

    it("calls add_to_queue API and shows success when patient has an appointment today", async () => {
        const user = await setupCheckin();

        mockQuery.in.mockResolvedValueOnce({
            data:  [{ id: "appt-today" }],
            error: null,
        });

        global.fetch.mockResolvedValueOnce({
            ok:   true,
            json: () => Promise.resolve({ position: 1 }),
        });

        await user.click(screen.getByRole("button", { name: /confirm check in/i }));

        await waitFor(() =>
            expect(screen.getByText(/checked in and added to the queue/i)).toBeVisible()
        );

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/queue/add_to_queue"),
            expect.objectContaining({ method: "POST" })
        );
    });

    it("shows error when queue API fails during check-in", async () => {
        const user = await setupCheckin();

        mockQuery.in.mockResolvedValueOnce({
            data:  [{ id: "appt-today" }],
            error: null,
        });

        global.fetch.mockResolvedValueOnce({
            ok:   false,
            json: () => Promise.resolve({ error: "Queue full." }),
        });

        await user.click(screen.getByRole("button", { name: /confirm check in/i }));

        await waitFor(() =>
            expect(screen.getByText(/queue full/i)).toBeVisible()
        );
    });

    it("clears profile card after successful check-in", async () => {
        const user = await setupCheckin();

        mockQuery.in.mockResolvedValueOnce({ data: [{ id: "appt-today" }], error: null });
        global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

        await user.click(screen.getByRole("button", { name: /confirm check in/i }));

        await waitFor(() =>
            expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
        );
    });
});


describe("Tab switching", () => {
    beforeEach(async () => {
        seedMount();
        await renderAndWait();
    });

    it("switching tabs clears the submit message", async () => {
        const user = userEvent.setup();

        await searchForPatient(user);
        await user.selectOptions(screen.getByRole("combobox"), "slot-today");
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
        await user.click(screen.getByRole("button", { name: /add to today's queue/i }));
        await waitFor(() =>
            expect(screen.getByText(/booked and added to today's queue/i)).toBeVisible()
        );

        await user.click(screen.getByRole("button", { name: /book future appointment/i }));
        expect(screen.queryByText(/booked and added to today's queue/i)).not.toBeInTheDocument();
    });
});