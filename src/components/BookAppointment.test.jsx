import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import BookAppointment from "./BookAppointment";


// *****THE COMMENTS ARE NECESSARY*****
//mocks
//opening pages
//fill and submit
//navigate to page ...
//tests(describes)




//mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => [
            new URLSearchParams({ id: "1", name: "Soweto Clinic" }),
        ],
    };
});

// onAuthStateChanged fires the callback immediately with a Firebase user
vi.mock("firebase/auth", () => ({
    onAuthStateChanged: vi.fn((auth, cb) => {
        cb({ uid: "fb-uid-123" });
        return vi.fn(); // unsubscribe
    }),
}));

vi.mock("../firebase", () => ({
    auth: {},
}));

const mockQuery = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("#lib/supabase", () => ({
    supabase: {
        auth: {
            getUser: vi.fn(() =>
                Promise.resolve({ data: { user: null } })
            ),
        },
        from: vi.fn(() => mockQuery),
    },
}));

global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);

const mockProfile = {
    id:           "patient-123",
    email:        "jane@example.com",
    phone_number: "0821234567",
};

const mockClinicDetails = {
    id:               1,
    name:             "Soweto Clinic",
    facility_type:    "Community Health Centre",
    province:         "Gauteng",
    district:         "Johannesburg",
    services_offered: ["General Checkup", "Vaccinations"],
    operating_hours:  {
        monday:    { open: "08:00", close: "16:00" },
        tuesday:   { open: "08:00", close: "16:00" },
        wednesday: { open: "08:00", close: "16:00" },
        thursday:  { open: "08:00", close: "16:00" },
        friday:    { open: "08:00", close: "13:00" },
        saturday:  { closed: true },
        sunday:    { closed: true },
    },
    is_active: true,
};

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const tomorrowDate = tomorrow.toISOString().split("T")[0];

const mockSlot = {
    id:               "slot-1",
    slot_date:        tomorrowDate,
    slot_time:        "09:00:00",
    duration_minutes: 30,
    total_capacity:   5,
    booked_count:     2,
    facility_id:      1,
};

const mockSlot2 = {
    id:               "slot-2",
    slot_date:        tomorrowDate,
    slot_time:        "10:00:00",
    duration_minutes: 30,
    total_capacity:   5,
    booked_count:     0,
    facility_id:      1,
};

const mockBookedAppointment = {
    id:        "appt-1",
    status:    "booked",
    reason:    "General Checkup",
    slot_id:   "slot-1",
    patient_id: "patient-123",
};

// Seeds the three sequential Supabase calls that happen on mount:
// 1. profiles maybeSingle → mockProfile (auth resolution)
// 2. facilities maybeSingle → mockClinicDetails
// 3. appointment_slots eq() → resolves with slots
// 4. appointments eq().eq() → no existing bookings
function seedMount({ slots = [mockSlot, mockSlot2], existingBookings = [] } = {}) {
    mockQuery.maybeSingle
        .mockResolvedValueOnce({ data: mockProfile,      error: null }) // profiles
        .mockResolvedValueOnce({ data: mockClinicDetails, error: null }); // facilities

    // appointment_slots: .select("*").eq("facility_id", ...) — ends at eq(), no maybeSingle
    // appointments: .select("slot_id").eq("patient_id",...).eq("status","booked") — ends at eq()
    // Both end with eq() so we use mockResolvedValueOnce on eq for each
    mockQuery.eq
        .mockReturnThis()                                                         // facility_id eq (slots query, chain continues)
        .mockResolvedValueOnce({ data: slots, error: null })                      // slots query resolves
        .mockReturnThis()                                                         // patient_id eq (appointments query, chain continues)
        .mockResolvedValueOnce({ data: existingBookings, error: null });          // appointments query resolves
}




//opening pages
function openLoadingState() {
    it("shows loading message initially", () => {
        expect(screen.getByText(/loading available slots/i)).toBeVisible();
    });
}

function openSlotsPage() {
    it("renders the page heading", async () => {
        await waitFor(() =>
            expect(screen.getByText(/book appointment/i)).toBeVisible()
        );
    });

    it("renders the clinic name", async () => {
        await waitFor(() =>
            expect(screen.getByText(/soweto clinic/i)).toBeVisible()
        );
    });

    it("renders the Back to search button", async () => {
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /back to search/i })).toBeVisible()
        );
    });

    it("renders the Available Time Slots heading", async () => {
        await waitFor(() =>
            expect(screen.getByText(/available time slots/i)).toBeVisible()
        );
    });

    it("renders slot cards for each available slot", async () => {
        await waitFor(() => {
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0);
            expect(screen.getAllByText(/10:00/i).length).toBeGreaterThan(0);
        });
    });

    it("renders the reason textarea", async () => {
        await waitFor(() =>
            expect(screen.getByPlaceholderText(/general checkup/i)).toBeVisible()
        );
    });

    it("renders reason suggestion chips", async () => {
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "General Checkup" })).toBeVisible();
            expect(screen.getByRole("button", { name: "Flu Symptoms" })).toBeVisible();
        });
    });

    it("renders the Confirm Booking button", async () => {
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirm booking/i })).toBeVisible()
        );
    });

    it("Confirm Booking button is disabled when no slot and no reason", async () => {
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /confirm booking/i })).toBeDisabled()
        );
    });
}

function openClinicDetailsSection() {
    it("renders the clinic facility type", async () => {
        await waitFor(() =>
            expect(screen.getByText(/community health centre/i)).toBeVisible()
        );
    });

    it("renders services offered", async () => {
        await waitFor(() => {
            expect(screen.getByText("General Checkup")).toBeVisible();
            expect(screen.getByText("Vaccinations")).toBeVisible();
        });
    });

    it("renders operating hours section", async () => {
        await waitFor(() =>
            expect(screen.getByText(/operating hours/i)).toBeVisible()
        );
    });

    it("renders Monday hours", async () => {
        await waitFor(() =>
            expect(screen.getByText("08:00 - 16:00")).toBeVisible()
        );
    });

    it("renders Saturday as Closed", async () => {
        await waitFor(() =>
            expect(screen.getByText("Closed")).toBeVisible()
        );
    });
}

function openConfirmationPage() {
    it("renders Appointment Confirmed heading", async () => {
        await waitFor(() =>
            expect(screen.getByText(/appointment confirmed/i)).toBeVisible()
        );
    });

    it("renders the booking status", async () => {
        await waitFor(() =>
            expect(screen.getByText(/booked/i)).toBeVisible()
        );
    });

    it("renders the booking reason", async () => {
        await waitFor(() =>
            expect(screen.getByText(/general checkup/i)).toBeVisible()
        );
    });

    it("renders the Back to Dashboard button", async () => {
        await waitFor(() =>
            expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeVisible()
        );
    });
}




//fill and submit
async function selectSlotAndReason() {
    const user = userEvent.setup();

    await waitFor(() =>
        expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
    );

    const slotCard = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
    await user.click(slotCard);

    const reasonTextarea = screen.getByPlaceholderText(/general checkup/i);
    await user.type(reasonTextarea, "General Checkup");

    return user;
}

async function fillAndSubmitBooking() {
    const user = await selectSlotAndReason();

    global.fetch.mockResolvedValueOnce({
        ok:   true,
        json: () => Promise.resolve({ appointment: mockBookedAppointment }),
    });

    const confirmButton = screen.getByRole("button", { name: /confirm booking/i });
    await user.click(confirmButton);

    return user;
}




//navigate to page ...
async function navigateToSlotsPage() {
    const user = userEvent.setup();
    seedMount();
    render(<BookAppointment />);
    await waitFor(() =>
        expect(screen.getByText(/available time slots/i)).toBeVisible()
    );
    return user;
}

async function navigateToConfirmationPage() {
    seedMount();
    render(<BookAppointment />);
    await fillAndSubmitBooking();
    return userEvent.setup();
}




beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    );
});


//tests(describes)
describe("Loading state", () => {
    beforeEach(() => {
        // Make profile resolution hang so loading persists
        mockQuery.maybeSingle.mockReturnValue(new Promise(() => {}));
        render(<BookAppointment />);
    });

    openLoadingState();
});


describe("Error state - not signed in", () => {
    it("shows error when no auth provider resolves", async () => {
        const { onAuthStateChanged } = await import("firebase/auth");
        onAuthStateChanged.mockImplementationOnce((_auth, cb) => {
            cb(null); // no Firebase user
            return vi.fn();
        });
        // supabase.auth.getUser already returns null user by default mock
        render(<BookAppointment />);
        await waitFor(() =>
            expect(screen.getByText(/must be signed in/i)).toBeVisible()
        );
    });
});


describe("Error state - profile not found", () => {
    it("shows error when profile is not found in database", async () => {
        mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        render(<BookAppointment />);
        await waitFor(() =>
            expect(screen.getByText(/patient profile not found/i)).toBeVisible()
        );
    });
});


describe("Error state - no slots available", () => {
    it("shows error when clinic has no slots", async () => {
        mockQuery.maybeSingle
            .mockResolvedValueOnce({ data: mockProfile,       error: null })
            .mockResolvedValueOnce({ data: mockClinicDetails, error: null });
        mockQuery.eq
            .mockReturnThis()
            .mockResolvedValueOnce({ data: [], error: null })
            .mockReturnThis()
            .mockResolvedValueOnce({ data: [], error: null });

        render(<BookAppointment />);
        await waitFor(() =>
            expect(screen.getByText(/no available slots/i)).toBeVisible()
        );
    });

    it("shows error when all slots are already booked by this patient", async () => {
        mockQuery.maybeSingle
            .mockResolvedValueOnce({ data: mockProfile,       error: null })
            .mockResolvedValueOnce({ data: mockClinicDetails, error: null });
        mockQuery.eq
            .mockReturnThis()
            .mockResolvedValueOnce({ data: [mockSlot], error: null })
            .mockReturnThis()
            .mockResolvedValueOnce({ data: [{ slot_id: "slot-1" }], error: null });

        render(<BookAppointment />);
        await waitFor(() =>
            expect(screen.getByText(/no available slots/i)).toBeVisible()
        );
    });
});


describe("Slots page - initial render", () => {
    beforeEach(async () => {
        await navigateToSlotsPage();
    });

    openSlotsPage();
});


describe("Clinic details section", () => {
    beforeEach(async () => {
        await navigateToSlotsPage();
    });

    openClinicDetailsSection();
});


describe("Slot selection", () => {
    beforeEach(async () => {
        await navigateToSlotsPage();
    });

    it("slot card gets selected class when clicked", async () => {
        const user = userEvent.setup();

        await waitFor(() =>
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
        );

        const slotCard = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
        await user.click(slotCard);

        expect(slotCard).toHaveClass("selected");
    });

    it("shows Selected indicator on the clicked slot", async () => {
        const user = userEvent.setup();

        await waitFor(() =>
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
        );

        const slotCard = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
        await user.click(slotCard);

        expect(screen.getByText(/selected/i)).toBeVisible();
    });

    it("selecting a different slot moves the selection", async () => {
        const user = userEvent.setup();

        await waitFor(() =>
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
        );

        const firstSlot  = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
        const secondSlot = screen.getAllByText(/10:00/i)[0].closest(".slot-card");

        await user.click(firstSlot);
        await user.click(secondSlot);

        expect(secondSlot).toHaveClass("selected");
        expect(firstSlot).not.toHaveClass("selected");
    });
});


describe("Reason input", () => {
    beforeEach(async () => {
        await navigateToSlotsPage();
    });

    it("typing in reason textarea updates the value", async () => {
        const user = userEvent.setup();
        const textarea = screen.getByPlaceholderText(/general checkup/i);
        await user.type(textarea, "Flu symptoms");
        expect(textarea).toHaveValue("Flu symptoms");
    });

    it("clicking a reason chip adds it to the textarea", async () => {
        const user = userEvent.setup();
        const chip = screen.getByRole("button", { name: "Flu Symptoms" });
        await user.click(chip);
        expect(screen.getByPlaceholderText(/general checkup/i)).toHaveValue("Flu Symptoms");
    });

    it("clicking an already-selected chip removes it", async () => {
        const user = userEvent.setup();
        const chip = screen.getByRole("button", { name: "Flu Symptoms" });
        await user.click(chip); // add
        await user.click(chip); // remove
        expect(screen.getByPlaceholderText(/general checkup/i)).toHaveValue("");
    });

    it("clicking multiple chips joins them with comma", async () => {
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Flu Symptoms" }));
        await user.click(screen.getByRole("button", { name: "Headache" }));
        expect(screen.getByPlaceholderText(/general checkup/i)).toHaveValue("Flu Symptoms, Headache");
    });

    it("active chip gets the active class", async () => {
        const user = userEvent.setup();
        const chip = screen.getByRole("button", { name: "Flu Symptoms" });
        await user.click(chip);
        expect(chip).toHaveClass("active");
    });
});


describe("Confirm Booking button state", () => {
    beforeEach(async () => {
        await navigateToSlotsPage();
    });

    it("is disabled when slot selected but no reason entered", async () => {
        const user = userEvent.setup();

        await waitFor(() =>
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
        );

        const slotCard = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
        await user.click(slotCard);

        expect(screen.getByRole("button", { name: /confirm booking/i })).toBeDisabled();
    });

    it("is disabled when reason entered but no slot selected", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/general checkup/i), "Headache");

        expect(screen.getByRole("button", { name: /confirm booking/i })).toBeDisabled();
    });

    it("is enabled when both a slot and reason are provided", async () => {
        const user = userEvent.setup();

        await waitFor(() =>
            expect(screen.getAllByText(/09:00/i).length).toBeGreaterThan(0)
        );

        const slotCard = screen.getAllByText(/09:00/i)[0].closest(".slot-card");
        await user.click(slotCard);
        await user.type(screen.getByPlaceholderText(/general checkup/i), "Headache");

        expect(screen.getByRole("button", { name: /confirm booking/i })).not.toBeDisabled();
    });
});


describe("Confirm Booking - successful submission", () => {
    it("calls the book API with correct payload", async () => {
        await navigateToSlotsPage();
        await selectSlotAndReason();

        global.fetch.mockResolvedValueOnce({
            ok:   true,
            json: () => Promise.resolve({ appointment: mockBookedAppointment }),
        });

        await userEvent.setup().click(screen.getByRole("button", { name: /confirm booking/i }));

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/appointments/book"),
                expect.objectContaining({
                    method: "POST",
                    body:   expect.stringContaining("patient-123"),
                })
            )
        );
    });

    it("shows loading status while booking is in progress", async () => {
        await navigateToSlotsPage();
        await selectSlotAndReason();

        // Never resolves — keeps the loading state visible
        global.fetch.mockReturnValueOnce(new Promise(() => {}));

        await userEvent.setup().click(screen.getByRole("button", { name: /confirm booking/i }));

        await waitFor(() =>
            expect(screen.getByText(/booking appointment/i)).toBeVisible()
        );
    });

    it("shows confirmation screen after successful booking", async () => {
        await navigateToConfirmationPage();

        await waitFor(() =>
            expect(screen.getByText(/appointment confirmed/i)).toBeVisible()
        );
    });

    it("fires send-confirmation request after successful booking", async () => {
        await navigateToSlotsPage();
        await selectSlotAndReason();

        global.fetch
            .mockResolvedValueOnce({
                ok:   true,
                json: () => Promise.resolve({ appointment: mockBookedAppointment }),
            })
            .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // send-confirmation

        await userEvent.setup().click(screen.getByRole("button", { name: /confirm booking/i }));

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("/appointments/send-confirmation"),
                expect.objectContaining({ method: "POST" })
            )
        );
    });
});


describe("Confirm Booking - confirmation page", () => {
    beforeEach(async () => {
        await navigateToConfirmationPage();
    });

    openConfirmationPage();
});


describe("Confirm Booking - API errors", () => {
    it("shows error message when booking API returns an error", async () => {
        await navigateToSlotsPage();
        await selectSlotAndReason();

        global.fetch.mockResolvedValueOnce({
            ok:   false,
            json: () => Promise.resolve({ error: "Slot already taken." }),
        });

        await userEvent.setup().click(screen.getByRole("button", { name: /confirm booking/i }));

        await waitFor(() =>
            expect(screen.getByText(/slot already taken/i)).toBeVisible()
        );
    });

    it("hides the slot list after successful booking", async () => {
        await navigateToConfirmationPage();

        await waitFor(() =>
            expect(screen.queryByText(/available time slots/i)).not.toBeInTheDocument()
        );
    });
});


describe("Back to search button", () => {
    it("calls navigate(-1) when Back to search is clicked", async () => {
        const user = await navigateToSlotsPage();
        await user.click(screen.getByRole("button", { name: /back to search/i }));
        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
});


describe("Back to Dashboard button", () => {
    it("navigates to /dashboard when clicked from confirmation page", async () => {
        const user = await navigateToConfirmationPage();

        await waitFor(() =>
            expect(screen.getByRole("button", { name: /back to dashboard/i })).toBeVisible()
        );

        await user.click(screen.getByRole("button", { name: /back to dashboard/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
});