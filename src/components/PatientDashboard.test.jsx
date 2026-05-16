import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PatientDashboard from "./PatientDashboard";
import userEvent from "@testing-library/user-event";


//jump-mocks
//jump-overview
//jump-appointments
//jump-notifications
//jump-profile



//jump-mocks
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

const TODAY = new Date().toISOString().split("T")[0];

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

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => mockQuery),
        auth: { signOut: vi.fn(() => Promise.resolve()) },
    },
}));

vi.mock("../queueApi", () => ({
    getMyQueue: vi.fn(() => Promise.resolve({ data: null, error: null })),
    removeFromQueue: vi.fn(),
    addToQueue: vi.fn(),
}));

vi.mock("firebase/auth", () => {
  class GoogleAuthProvider {
    constructor() {
      this.addScope = vi.fn();
    }
  }

  class FacebookAuthProvider {
    constructor() {
      this.addScope = vi.fn();
    }
  }

  class RecaptchaVerifier {
    constructor() {
      this.render = vi.fn();
      this.clear = vi.fn();
    }
  }

  return {
    getAuth: vi.fn(() => ({})),

    GoogleAuthProvider,
    FacebookAuthProvider,
    RecaptchaVerifier,

    signInWithPopup: vi.fn(),

    signInWithPhoneNumber: vi.fn(),

    auth: {},
    signOut: vi.fn(() => Promise.resolve()),
  };
});


const mockProfile = {
    id: "test-patient",
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    phone_number: "0820000000",
    dob: "2001-01-01",
    role: "patient",
};

beforeEach(() => {
    vi.clearAllMocks();
});

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
        { label: /settings/i },
    ];

    navItems.forEach(({ label }) => {
        it(`renders "${label.source}" nav button`, () => {
            const btns = screen.getAllByRole("button", {name: label});
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


//jump-overview
describe("Clicked Overview", () => {
    beforeEach(async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

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

    it("renders Find a Clinic quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /find a clinic/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
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

    it("Find a Clinic quick-action navigates to /clinic-search", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /find a clinic/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/clinic-search"));
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
            makeAppointment({ id: "a4", status: "booked",
            appointment_slots: { ...makeAppointment().appointment_slots, slot_date: "2000-01-01" } }),
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
        .mockResolvedValueOnce({ data: [
            makeAppointment({ id: "a1" }),
            makeAppointment({ id: "a2" }),
            makeAppointment({ id: "a3" }),
        ], error: null })
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
    it("shows Check In button when appointment is today and patient not yet in queue", async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [makeAppointment()], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => expect(screen.getByRole("button", { name: /check in/i })).toBeVisible());
    });

    it("does NOT show Check In button when no upcoming appointment", async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => expect(screen.queryByRole("button", { name: /check in/i })).toBeNull());
    });

    it("does NOT show Check In button when appointment is not today", async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [makeAppointment({
            appointment_slots: { ...makeAppointment().appointment_slots, slot_date: "2099-12-31" },
        })], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => expect(screen.queryByRole("button", { name: /check in/i })).toBeNull());
    });

    it("shows checked-in confirmation when patient is already in the queue", async () => {
        const { getMyQueue } = await import("../queueApi");
        getMyQueue.mockResolvedValue({ data: [{ id: "q1" }], position: 2, error: null });

        mockQuery.limit
        .mockResolvedValueOnce({ data: [makeAppointment()], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => expect(screen.getByText(/you're checked in — position #2/i)).toBeVisible());
    });

    it("shows 'check-in opens on the day' for a future appointment", async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [makeAppointment({
            appointment_slots: { ...makeAppointment().appointment_slots, slot_date: "2099-12-31" },
        })], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => expect(screen.getByText(/check-in opens on the day/i)).toBeVisible());
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

   it("Book Again navigates to the correct clinic page", async () => {
    const user = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("button", { name: /book again/i })).toBeVisible());
    await user.click(screen.getByRole("button", { name: /book again/i }));
    await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/clinic?id=fac-1")
    );
});

});


describe("Overview Panel", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allOverview = screen.getAllByText(/overview/i);
        const overview = allOverview.find((link) => link.closest(".db-nav"));
        await user.click(overview);
    });

    it("Opens Appointments Panel when My Appointments clicked", async () => {
        const user = userEvent.setup();
        const allMyAppointments = screen.getAllByRole("button", { name: /my appointments/i });
        const myAppointments = allMyAppointments.find((btn) => btn.closest(".db-card"));
        await user.click(myAppointments);
        
        const allAppointments = screen.getAllByText(/appointments/i);
        const appointment = allAppointments.find((link) => link.closest(".db-topbar"));
        expect(appointment).toBeVisible();
    });

    it("Opens Find my clinic Panel when Find a clinic clicked", async () => {
        const user = userEvent.setup();
        const allFindAClinic = screen.getAllByRole("button", { name: /find a clinic/i });
        const findAClinic = allFindAClinic.find((btn) => btn.closest(".db-card"));
        await user.click(findAClinic);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/clinic-search");
        });
    });
});







//jump-appointments
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



// ────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS PANEL CONTENT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe("Appointments Panel - content", () => {
  // No helper function – each test sets its own mock, renders, clicks Appointments
  // and asserts. Uses same pattern as "Clicked Overview - stat counts".

  it("shows 'No appointments found' when list is empty", async () => {
    mockQuery.limit
      .mockResolvedValueOnce({ data: [], error: null }) // appointments
      .mockResolvedValueOnce({ data: [], error: null }) // queue
      .mockResolvedValueOnce({ data: [], error: null }); // notifications

    const user = userEvent.setup();
    render(<PatientDashboard profile={mockProfile} />);

    const appointmentsNav = screen.getAllByText(/appointments/i).find((btn) => btn.closest(".db-nav"));
    await user.click(appointmentsNav);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("No appointments found.")).toBeVisible();
  });

  it("shows Reschedule and Cancel buttons only for non‑terminal appointments", async () => {
    const mockApps = [
      makeAppointment({ id: "a1", status: "booked" }),    // non‑terminal
      makeAppointment({ id: "a2", status: "complete" }),  // terminal
      makeAppointment({ id: "a3", status: "cancelled" }), // terminal
    ];

    mockQuery.limit
      .mockResolvedValueOnce({ data: mockApps, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const user = userEvent.setup();
    render(<PatientDashboard profile={mockProfile} />);

    const appointmentsNav = screen.getAllByText(/appointments/i).find((btn) => btn.closest(".db-nav"));
    await user.click(appointmentsNav);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const rescheduleBtns = screen.getAllByRole("button", { name: "Reschedule" });
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    expect(rescheduleBtns).toHaveLength(1);
    expect(cancelBtns).toHaveLength(1);
  });

  it("opens the reschedule modal when Reschedule button is clicked", async () => {
    const mockApps = [makeAppointment({ id: "a1", status: "booked" })];
    mockQuery.limit
      .mockResolvedValueOnce({ data: mockApps, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const user = userEvent.setup();
    render(<PatientDashboard profile={mockProfile} />);

    const appointmentsNav = screen.getAllByText(/appointments/i).find((btn) => btn.closest(".db-nav"));
    await user.click(appointmentsNav);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const rescheduleBtn = screen.getByRole("button", { name: "Reschedule" });
    await user.click(rescheduleBtn);

    await waitFor(() => {
      expect(screen.getByText("Reschedule Appointment")).toBeVisible();
    });
  });

  it("cancels an appointment and updates the UI", async () => {
    const mockApps = [makeAppointment({ id: "a1", status: "booked" })];
    mockQuery.limit
      .mockResolvedValueOnce({ data: mockApps, error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const user = userEvent.setup();
    render(<PatientDashboard profile={mockProfile} />);

    const appointmentsNav = screen.getAllByText(/appointments/i).find((btn) => btn.closest(".db-nav"));
    await user.click(appointmentsNav);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Spy on window.confirm to return true (allow cancellation)
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => true);

    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByText("cancelled")).toBeVisible();
      expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Reschedule" })).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});




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







//jump-notifications
describe("Clicked Notifications", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allNotifications = screen.getAllByText(/notifications/i);
        const notification = allNotifications.find((link) => link.closest(".db-nav"));
        await user.click(notification);
    });

    it("Renders Notifications on topbar", () => {
        const allNotifications = screen.getAllByText(/notifications/i);
        const notification = allNotifications.find((link) => link.closest(".db-topbar"));
        expect(notification).toBeVisible();
    });

    it("Renders user name", () => {
        expect(screen.getByText(new RegExp(`Hi, ${mockProfile.name}`, "i"))).toBeVisible();
    });
});


describe("Notifications Panel - content", () => {
    async function renderAndOpenNotifications() {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const notificationsNav = screen.getAllByText(/notifications/i).find((btn) => btn.closest(".db-nav"));
        await user.click(notificationsNav);
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });
        return user;
    }

    it("shows 'No notifications.' when the list is empty", async () => {
        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null }) // appointments
        .mockResolvedValueOnce({ data: [], error: null }) // queue
        .mockResolvedValueOnce({ data: [], error: null }); // notifications

        await renderAndOpenNotifications();
        expect(screen.getByText("No notifications.")).toBeVisible();
        expect(screen.getByRole("button", { name: /mark all as read/i })).toBeVisible();
    });

    it("displays the correct unread count in the heading", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "Reminder", sent_at: null },
            { id: "n2", is_read: true,  message: "Update", sent_at: null },
            { id: "n3", is_read: false, message: "Alert", sent_at: null },
        ];

        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: mockNotifs, error: null });

        await renderAndOpenNotifications();
        expect(screen.getByText(/Notifications \(2 unread\)/i)).toBeVisible();
    });

    it("renders notification cards with message and 'New' badge for unread ones", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "Your appointment is tomorrow", sent_at: "2025-05-10T10:00:00Z" },
            { id: "n2", is_read: true,  message: "Profile updated", sent_at: "2025-05-09T09:00:00Z" },
        ];

        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: mockNotifs, error: null });

        await renderAndOpenNotifications();

        expect(screen.getByText("Your appointment is tomorrow")).toBeVisible();
        expect(screen.getByText("Profile updated")).toBeVisible();
        expect(screen.getByText("New")).toBeVisible();
        expect(screen.getAllByText("New")).toHaveLength(1);
    });

    it("marks all as read and updates the UI when 'Mark all as read' is clicked", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "A", sent_at: null },
            { id: "n2", is_read: false, message: "B", sent_at: null },
        ];

        mockQuery.limit
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: mockNotifs, error: null });

        const user = await renderAndOpenNotifications();

        expect(screen.getAllByText("New")).toHaveLength(2);
        expect(screen.getByText("Notifications (2 unread)")).toBeVisible();

        const markAllBtn = screen.getByRole("button", { name: /mark all as read/i });
        await user.click(markAllBtn);

        await waitFor(() => {
            expect(screen.queryByText("New")).not.toBeInTheDocument();
            expect(screen.getByText("Notifications (0 unread)")).toBeVisible();
        });
    });
});





//jump-profile
describe("Clicked Profile", () => {
    it("navigates to /profile when Profile nav button is clicked", async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith("/profile", expect.any(Object))
        );
    });

    it("renders the user greeting", () => {
        render(<PatientDashboard profile={mockProfile} />);
        expect(screen.getByText(/Hi, John/i)).toBeVisible();
    });
});





describe("Clicked Service Policy", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allPolicy = screen.getAllByText(/service policy/i);
        const policy = allPolicy.find((link) => link.closest(".db-nav"));
        await user.click(policy);
    });

    it("Renders Service Policy on topbar", () => {
        const allPolicy = screen.getAllByText(/service policy/i);
        const policy = allPolicy.find((link) => link.closest(".db-topbar"));
        expect(policy).toBeVisible();
    });

    it("Renders user name", () => {
        expect(screen.getByText(new RegExp(`Hi, ${mockProfile.name}`, "i"))).toBeVisible();
    });
});

describe("Clicked Settings", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<PatientDashboard profile={mockProfile} />);
        const allSettings = screen.getAllByText(/settings/i);
        const setting = allSettings.find((link) => link.closest(".db-nav"));
        await user.click(setting);
    });

    it("Renders Settings on topbar", () => {
        const allSettings = screen.getAllByText(/settings/i);
        const setting = allSettings.find((link) => link.closest(".db-topbar"));
        expect(setting).toBeVisible();
    });

    it("Renders user name", () => {
        expect(screen.getByText(new RegExp(`Hi, ${mockProfile.name}`, "i"))).toBeVisible();
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

        await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        const logoutButton = screen.getByRole("button", { name: /logout/i });
        expect(logoutButton).toBeInTheDocument();

        await user.click(logoutButton);

        const { supabase } = await import("#lib/supabase");
        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

        const { signOut } = await import("firebase/auth");
        expect(signOut).toHaveBeenCalledTimes(1);

        expect(localStorage.removeItem).toHaveBeenCalledWith("userIdentity");

        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
});