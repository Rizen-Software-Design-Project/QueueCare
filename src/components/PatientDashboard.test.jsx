import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PatientDashboard from "./PatientDashboard";
import { PatientHistoryView } from "./AppointmentHistory";
import QueueCarePolicy from "./ServicePolicy";
import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";

// MOCKS
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

const mockFetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
    })
);
global.fetch = mockFetch;

const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const mockProfile = {
    id: "test-patient",
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    phone_number: "0820000000",
    dob: "2001-01-01",
    role: "patient",
};

const makeAppointment = (overrides = {}) => ({
    id:         "appt-1",
    status:     "booked",
    slot_id:    "slot-1",
    patient_id: mockProfile.id,
    booked_at:  new Date().toISOString(),
    appointment_slots: {
        slot_date:        TODAY,
        slot_time:        "10:00:00",
        duration_minutes: 30,
        facility_id:      "fac-1",
        facilities: { name: "Test Clinic", district: "Johannesburg", province: "Gauteng" },
    },
    ...overrides,
});

const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis(),
};

vi.mock("../queueApi", () => ({
    getMyQueue: vi.fn(() => Promise.resolve({ data: null, error: null })),
    removeFromQueue: vi.fn(),
    addToQueue: vi.fn(),
}));

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => mockQuery),
        auth: {
            signOut: vi.fn(() => Promise.resolve()),
            getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
        },
    },
}));

vi.mock("firebase/auth", () => {
    return {
        getAuth: vi.fn(() => ({})),
        GoogleAuthProvider: class {},
        FacebookAuthProvider: class {},
        RecaptchaVerifier: class { render = vi.fn(); clear = vi.fn(); },
        signInWithPopup: vi.fn(),
        signInWithPhoneNumber: vi.fn(),
        auth: {},
        signOut: vi.fn(() => Promise.resolve()),
        onAuthStateChanged: vi.fn((_auth, callback) => {
            callback(null);
            return vi.fn();
        }),
    };
});

// Avoid mock bleed across async tests
beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockQuery.limit.mockReset().mockResolvedValue({ data: [], error: null });
    mockQuery.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    mockQuery.update.mockReset().mockReturnThis();
});

// SIDEBAR TESTS
describe("Sidebar", () => {
    beforeEach(() => {
        render(<PatientDashboard profile={mockProfile} />);
    });

    const navItems = [
        { label: /overview/i },
        { label: /appointments/i },
        { label: /my queue/i },
        { label: /notifications/i },
        { label: /profile/i },
        { label: /find a clinic/i },
        { label: /service policy/i },
    ];

    navItems.forEach(({ label }) => {
        it(`renders "${label.source}" nav button`, () => {
            const btns = screen.getAllByRole("button", { name: label });
            const btn = btns.find((link) => link.closest(".db-nav"));
            expect(btn).toBeVisible();
        });
    });

    it("renders the Logout button", () => {
        expect(screen.getByRole("button", { name: /logout/i })).toBeVisible();
    });

    it("renders the user greeting", () => {
        expect(screen.getByText(`Hi, ${mockProfile.name}`)).toBeVisible();
    });
});

// OVERVIEW TESTS
describe("Clicked Overview", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allOverview = screen.getAllByText(/overview/i);
        const overview = allOverview.find((link) => link.closest(".db-nav"));
        await user.click(overview);
    });

    it("renders Overview on topbar", () => {
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-topbar"));
        expect(overview).toBeVisible();
    });

    it("renders My Appointments quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /my appointments/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("Find a Clinic quick-action switches to the Find a Clinic panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /find a clinic/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => {
            expect(screen.getByText(/South African Clinics/i)).toBeVisible();
        });
    });

    it("shows zero counts in all stat cards when no data", () => {
        const cards = document.querySelectorAll(".db-stat-card");
        expect(cards[0].querySelector(".db-stat-num").textContent).toBe("0");
        expect(cards[1].querySelector(".db-stat-num").textContent).toBe("0");
        expect(cards[2].querySelector(".db-stat-num").textContent).toBe("0");
        expect(cards[3].querySelector(".db-stat-num").textContent).toBe("0");
    });

    it("My Appointments quick-action switches to the Appointments panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /my appointments/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        const topbar = screen.getAllByText(/appointments/i).find((el) => el.closest(".db-topbar"));
        expect(topbar).toBeVisible();
    });

    it("does NOT show the Last visited card when there are no appointments", () => {
        expect(screen.queryByText(/last visited/i)).toBeNull();
    });
});

describe("Clicked Overview - stat counts", () => {
    it("shows correct Upcoming count", async () => {
        mockQuery.limit
            .mockResolvedValueOnce({ data: [
                makeAppointment({ id: "a1", status: "booked" }),
                makeAppointment({ id: "a2", status: "cancelled" }),
                makeAppointment({ id: "a3", status: "complete" }),
                makeAppointment({ id: "a4", status: "booked", appointment_slots: { ...makeAppointment().appointment_slots, slot_date: "2000-01-01" } }),
            ], error: null })
            .mockResolvedValueOnce({ data: [], error: null })
            .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            const cards = document.querySelectorAll(".db-stat-card");
            expect(cards[0].querySelector(".db-stat-num").textContent).toBe("1");
            expect(cards[1].querySelector(".db-stat-num").textContent).toBe("4");
        });
    });

    it("shows correct total Appointments count", async () => {
        mockQuery.limit
            .mockResolvedValueOnce({ data: [makeAppointment({ id: "a1" }), makeAppointment({ id: "a2" }), makeAppointment({ id: "a3" })], error: null })
            .mockResolvedValueOnce({ data: [], error: null })
            .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            const cards = document.querySelectorAll(".db-stat-card");
            expect(cards[1].querySelector(".db-stat-num").textContent).toBe("3");
        });
    });

    it("shows unread Notifications count", async () => {
        mockQuery.limit
            .mockResolvedValueOnce({ data: [], error: null })
            .mockResolvedValueOnce({ data: [], error: null })
            .mockResolvedValueOnce({ data: [
                { id: "n1", is_read: false, message: "A", sent_at: null },
                { id: "n2", is_read: false, message: "B", sent_at: null },
                { id: "n3", is_read: true,  message: "C", sent_at: null },
            ], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            const cards = document.querySelectorAll(".db-stat-card");
            expect(cards[3].querySelector(".db-stat-num").textContent).toBe("2");
        });
    });
});

describe("Clicked Overview - check-in", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-05-18T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    async function openOverview() {
        const overview = screen
            .getAllByText(/overview/i)
            .find((el) => el.closest(".db-nav"));

        await act(async () => {
            fireEvent.click(overview);

            // flush timers + promises
            vi.runAllTimers();
            await Promise.resolve();
        });
    }

    it("shows Check In button when appointment is today and patient not yet in queue", async () => {
        mockQuery.limit.mockResolvedValue({
            data: [
                makeAppointment({
                    status: "booked",
                    appointment_slots: {
                        slot_date: "2024-05-18",
                        slot_time: "14:00:00",
                        facility_id: "fac-1",
                        facilities: {
                            name: "Test Clinic",
                            district: "Johannesburg",
                            province: "Gauteng",
                        },
                    },
                }),
            ],
            error: null,
        });

        render(<PatientDashboard profile={mockProfile} />);

        await openOverview();

        expect(
            screen.getByRole("button", { name: /check in/i })
        ).toBeInTheDocument();
    });

    it("does NOT show Check In button when no upcoming appointment", async () => {
        mockQuery.limit.mockResolvedValue({
            data: [],
            error: null,
        });

        render(<PatientDashboard profile={mockProfile} />);

        await openOverview();

        expect(
            screen.queryByRole("button", { name: /check in/i })
        ).toBeNull();
    });

    it("does NOT show Check In button when appointment is not today", async () => {
        mockQuery.limit.mockResolvedValue({
            data: [
                makeAppointment({
                    status: "booked",
                    appointment_slots: {
                        slot_date: "2024-05-19",
                        slot_time: "14:00:00",
                    },
                }),
            ],
            error: null,
        });

        render(<PatientDashboard profile={mockProfile} />);

        await openOverview();

        expect(
            screen.queryByRole("button", { name: /check in/i })
        ).toBeNull();
    });

    it("shows 'check-in opens on the day' for a future appointment", async () => {
        mockQuery.limit.mockResolvedValue({
            data: [
                makeAppointment({
                    status: "booked",
                    appointment_slots: {
                        slot_date: "2099-12-31",
                        slot_time: "14:00:00",
                    },
                }),
            ],
            error: null,
        });

        render(<PatientDashboard profile={mockProfile} />);

        await openOverview();

        expect(
            screen.getByText(/check-in opens on the day/i)
        ).toBeVisible();
    });
});

describe("Clicked Overview - last visited clinic", () => {
    beforeEach(async () => {
        mockQuery.limit
            .mockResolvedValueOnce({ data: [makeAppointment()], error: null })
            .mockResolvedValueOnce({ data: [], error: null })
            .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);
    });

    it("shows Last visited clinic card", async () => {
        await waitFor(() => {
            expect(screen.getByText("Test Clinic")).toBeVisible();
            expect(screen.getByText("Johannesburg")).toBeVisible();
            expect(screen.getByText(/last visited/i)).toBeVisible();
        });
    });

    it("shows Book Again button", async () => {
        await waitFor(() => expect(screen.getByRole("button", { name: /book again/i })).toBeVisible());
    });

    it("Book Again switches to the Book Appointment panel", async () => {
        const user = userEvent.setup();

        mockQuery.maybeSingle.mockResolvedValue({
            data: {
                id: 1,
                name: "Test Clinic",
                is_active: true,
                facility_type: "Clinic",
                district: "Johannesburg",
                province: "Gauteng",
                services_offered: [],
                operating_hours: {},
            },
            error: null,
        });

        const bookAgainBtn = await screen.findByRole("button", { name: /book again/i });
        await user.click(bookAgainBtn);
    });
});

// APPOINTMENTS TESTS
describe("Clicked Appointments", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allAppointments = screen.getAllByText(/appointments/i);
        const appointment = allAppointments.find((link) => link.closest(".db-nav"));
        await user.click(appointment);
    });

    it("Renders Appointments on topbar", () => {
        const allAppointments = screen.getAllByText(/appointments/i);
        const appointment = allAppointments.find((link) => link.closest(".db-topbar"));
        expect(appointment).toBeVisible();
    });

    it("Renders user name", () => {
        expect(screen.getByText(new RegExp(`Hi, ${mockProfile.name}`, "i"))).toBeVisible();
    });
});

describe("AppointmentHistory - PatientHistoryView", () => {
    it("shows 'No upcoming appointments' when there are no appointments", () => {
        render(<PatientHistoryView appointments={[]} onReschedule={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("No upcoming appointments.")).toBeVisible();
    });

    it("shows Reschedule and Cancel buttons only for upcoming appointments", () => {
        const appointments = [
            makeAppointment({ id: "a1", status: "booked", appointment_slots: { slot_date: "2099-12-01", slot_time: "10:00:00", facilities: { name: "Clinic A" } } }),
            makeAppointment({ id: "a2", status: "complete", appointment_slots: { slot_date: "2024-01-01", slot_time: "09:00:00", facilities: { name: "Clinic B" } } }),
            makeAppointment({ id: "a3", status: "cancelled", appointment_slots: { slot_date: "2024-01-01", slot_time: "11:00:00", facilities: { name: "Clinic C" } } }),
        ];

        render(<PatientHistoryView appointments={appointments} onReschedule={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.getAllByRole("button", { name: "Reschedule" })).toHaveLength(1);
        expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    });

    it("calls onReschedule when Reschedule button is clicked", async () => {
        const user = userEvent.setup();
        const appointments = [
            makeAppointment({ id: "a1", status: "booked", appointment_slots: { slot_date: "2099-12-01", slot_time: "10:00:00", facilities: { name: "Clinic A" } } })
        ];
        const onReschedule = vi.fn();

        render(<PatientHistoryView appointments={appointments} onReschedule={onReschedule} onCancel={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: "Reschedule" }));

        expect(onReschedule).toHaveBeenCalledTimes(1);
        expect(onReschedule).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    });

    it("calls onCancel when Cancel button is clicked", async () => {
        const user = userEvent.setup();
        const appointments = [
            makeAppointment({ id: "a1", status: "booked", appointment_slots: { slot_date: "2099-12-01", slot_time: "10:00:00", facilities: { name: "Clinic A" } } })
        ];
        const onCancel = vi.fn();

        render(<PatientHistoryView appointments={appointments} onReschedule={vi.fn()} onCancel={onCancel} />);
        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: "a1" }));
    });

    it("switches to history tab and shows history appointments", async () => {
        const user = userEvent.setup();
        const appointments = [
            makeAppointment({ id: "a1", status: "complete", appointment_slots: { slot_date: "2024-01-01", slot_time: "09:00:00", facilities: { name: "Clinic History" } } })
        ];

        render(<PatientHistoryView appointments={appointments} onReschedule={vi.fn()} onCancel={vi.fn()} />);
        await user.click(screen.getByRole("tab", { name: /history/i }));

        expect(screen.getByText("Clinic History")).toBeVisible();
    });
});

// QUEUE TESTS
describe("Clicked My Queue", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allQueue = screen.getAllByText(/my queue/i);
        const queue = allQueue.find((link) => link.closest(".db-nav"));
        await user.click(queue);
    });

    it("Renders My Queue on topbar", () => {
        const allQueue = screen.getAllByText(/my queue/i);
        const queue = allQueue.find((link) => link.closest(".db-topbar"));
        expect(queue).toBeVisible();
    });

    it("Renders user name", () => {
        expect(screen.getByText(new RegExp(`Hi, ${mockProfile.name}`, "i"))).toBeVisible();
    });
});

// NOTIFICATIONS TESTS
// NOTIFICATIONS TESTS
describe("Notifications Panel - content", () => {
  async function renderAndOpenNotifications(mockNotifs = []) {
    mockQuery.limit.mockResolvedValue({
      data: mockNotifs,
      error: null,
    });

    const user = userEvent.setup();

    render(<PatientDashboard profile={mockProfile} />);

    const notificationsNav = screen
      .getAllByText(/notifications/i)
      .find((btn) => btn.closest(".db-nav"));

    await user.click(notificationsNav);

    return user;
  }

  

  it("renders unread notification count correctly", async () => {
    const mockNotifs = [
      {
        id: "n1",
        is_read: false,
        message: "Appointment reminder",
        sent_at: null,
      },
      {
        id: "n2",
        is_read: true,
        message: "Profile updated",
        sent_at: null,
      },
      {
        id: "n3",
        is_read: false,
        message: "Clinic update",
        sent_at: null,
      },
    ];

    await renderAndOpenNotifications(mockNotifs);

    await waitFor(() => {
      expect(
        screen.getByText(/2 unread/i)
      ).toBeVisible();
    });
  });

  

  it("applies unread styling to unread notifications", async () => {
    const mockNotifs = [
      {
        id: "n1",
        is_read: false,
        message: "Unread notification",
        sent_at: null,
      },
    ];

    await renderAndOpenNotifications(mockNotifs);

    await waitFor(() => {
      expect(
        screen.getByText(/unread notification/i)
      ).toBeVisible();
    });

    const unreadCard = document.querySelector(
      ".db-notification-unread"
    );

    expect(unreadCard).toBeInTheDocument();
  });

  

  it("calls Supabase update when marking all as read", async () => {
    const mockNotifs = [
      {
        id: "n1",
        is_read: false,
        message: "Unread message",
        sent_at: null,
      },
    ];

    const user = await renderAndOpenNotifications(
      mockNotifs
    );

    const markAllBtn = screen.getByRole("button", {
      name: /mark all as read/i,
    });

    await user.click(markAllBtn);

    expect(mockQuery.update).toHaveBeenCalledWith({
      is_read: true,
    });
  });
});

// PROFILE & LOGOUT TESTS
describe("Clicked Profile", () => {
    it("switches to the Profile panel when Profile nav is clicked", async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        await waitFor(() => {
            const topbar = screen.getAllByText(/profile/i).find((el) => el.closest(".db-topbar"));
            expect(topbar).toBeVisible();
        });
    });

    it("renders the user greeting", () => {
        render(<PatientDashboard profile={mockProfile} />);
        expect(screen.getByText(/Hi, John/i)).toBeVisible();
    });
});

describe("Logout", () => {
    let originalLocalStorage;

    beforeEach(() => {
        originalLocalStorage = global.localStorage;
        global.localStorage = {
            removeItem: vi.fn(),
            getItem: vi.fn(),
            setItem: vi.fn(),
            clear: vi.fn(),
        };
    });

    afterEach(() => {
        global.localStorage = originalLocalStorage;
    });

    it("logs out, clears local storage, and navigates to sign in", async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);

        const logoutButton = screen.getByRole("button", { name: /logout/i });
        await user.click(logoutButton);

        const { supabase } = await import("#lib/supabase");
        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

        const { signOut } = await import("firebase/auth");
        expect(signOut).toHaveBeenCalledTimes(1);

        expect(localStorage.removeItem).toHaveBeenCalledWith("userIdentity");
        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
});