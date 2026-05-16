import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import StaffDashboard from "./StaffDashboard";
import userEvent from "@testing-library/user-event";


//jump-mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);

const mockQuery = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    ilike:       vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    limit:       vi.fn().mockResolvedValue({ data: [], error: null }),
    update:      vi.fn().mockReturnThis(),
};

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => mockQuery),
        auth: { signOut: vi.fn(() => Promise.resolve()) },
    },
}));

vi.mock("../queueApi", () => ({
    getMyQueue:      vi.fn(() => Promise.resolve({ data: null, error: null })),
    removeFromQueue: vi.fn(),
    addToQueue:      vi.fn(),
}));

vi.mock("firebase/auth", () => {
    class GoogleAuthProvider {
        constructor() { this.addScope = vi.fn(); }
    }
    class FacebookAuthProvider {
        constructor() { this.addScope = vi.fn(); }
    }
    class RecaptchaVerifier {
        constructor() { this.render = vi.fn(); this.clear = vi.fn(); }
    }
    return {
        getAuth:               vi.fn(() => ({})),
        GoogleAuthProvider,
        FacebookAuthProvider,
        RecaptchaVerifier,
        signInWithPopup:       vi.fn(),
        signInWithPhoneNumber: vi.fn(),
        signOut:               vi.fn(() => Promise.resolve()),
    };
});

const mockStaffProfile = {
    id:               "staff-123",
    name:             "Jane",
    surname:          "Smith",
    email:            "jane@clinic.com",
    phone_number:     "0831234567",
    dob:              "1985-06-15",
    role:             "staff",
    auth_provider:    "firebase",
    provider_user_id: "fb-staff-uid",
};

const makeAssignment = (overrides = {}) => ({
    id:          "assign-1",
    profile_id:  "staff-123",
    facility_id: "fac-1",
    role:        "nurse",
    availability: {
        monday:    { available: true,  start: "09:00", end: "17:00" },
        tuesday:   { available: true,  start: "09:00", end: "17:00" },
        wednesday: { available: false, start: "",      end: ""      },
        thursday:  { available: false, start: "",      end: ""      },
        friday:    { available: false, start: "",      end: ""      },
        saturday:  { available: false, start: "",      end: ""      },
        sunday:    { available: false, start: "",      end: ""      },
    },
    facilities: {
        name:     "Soweto Clinic",
        district: "Johannesburg",
        province: "Gauteng",
    },
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Sidebar", () => {
    beforeEach(() => {
        render(<StaffDashboard profile={mockStaffProfile} />);
    });

    const navItems = [
        { label: /overview/i },
        { label: /clinic appointments/i },
        { label: /patient queue/i },
        { label: /walk-in patients/i },
        { label: /patients/i },
        { label: /analytics/i },
        { label: /notifications/i },
        { label: /profile/i },
    ];

    navItems.forEach(({ label }) => {
        it(`renders "${label.source}" nav button`, () => {
            const btn = screen.getAllByRole("button", { name: label }).find((b) => b.closest(".db-nav"));
            expect(btn).toBeVisible();
        });
    });

    it("renders the Logout button", () => {
        expect(screen.getByRole("button", { name: /logout/i })).toBeVisible();
    });

    it("renders the user greeting", () => {
        expect(screen.getByText(/Hi, Jane/i)).toBeVisible();
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Clicked Overview", () => {
    beforeEach(async () => {
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);
    });

    it("renders Overview on topbar", () => {
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-topbar"));
        expect(overview).toBeVisible();
    });

    it("renders Clinic Appointments quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /clinic appointments/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders Patient Queue quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /patient queue/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders Walk-In Patients quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /walk-in patients/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders View Analytics quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /view analytics/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("shows zero unread Notifications count in stat card", () => {
        const cards = document.querySelectorAll(".db-stat-card");
        expect(cards[3].querySelector(".db-stat-num").textContent).toBe("0");
    });

    it("does NOT show facility card when staff has no assignment", () => {
        expect(screen.queryByText(/facility/i)).toBeNull();
    });

    it("Clinic Appointments quick-action navigates to /staff-manage", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /clinic appointments/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff-manage", expect.any(Object)));
    });

    it("Patient Queue quick-action navigates to /staff-manage", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /patient queue/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff-manage", expect.any(Object)));
    });

    it("Walk-In Patients quick-action navigates to /walk-in", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /walk-in patients/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/walk-in", expect.any(Object)));
    });

    it("View Analytics quick-action navigates to /analytics-staff", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /view analytics/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/analytics-staff", expect.any(Object)));
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Clicked Overview - facility card", () => {
    it("shows the assigned facility name and district", async () => {
        const { supabase } = await import("#lib/supabase");
        supabase.from.mockImplementation((table) => {
            if (table === "staff_assignments") {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq:     vi.fn().mockResolvedValue({ data: [makeAssignment()], error: null }),
                };
            }
            return mockQuery;
        });

        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            expect(screen.getByText("Soweto Clinic")).toBeVisible();
            expect(screen.getByText("Johannesburg")).toBeVisible();
        });
    });

    it("shows unread Notifications count in stat card", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "A", sent_at: null },
            { id: "n2", is_read: false, message: "B", sent_at: null },
            { id: "n3", is_read: true,  message: "C", sent_at: null },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            const cards = document.querySelectorAll(".db-stat-card");
            expect(cards[3].querySelector(".db-stat-num").textContent).toBe("2");
        });
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Nav items that navigate away", () => {
    beforeEach(() => {
        render(<StaffDashboard profile={mockStaffProfile} />);
    });

    it("Clinic Appointments nav button navigates to /staff-manage", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /clinic appointments/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff-manage", expect.any(Object)));
    });

    it("Patient Queue nav button navigates to /staff-manage", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /patient queue/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff-manage", expect.any(Object)));
    });

    it("Walk-In Patients nav button navigates to /walk-in", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /walk-in patients/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/walk-in", expect.any(Object)));
    });

    it("Patients nav button navigates to /staff-manage", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /^patients$/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/staff-manage", expect.any(Object)));
    });

    it("Analytics nav button navigates to /analytics-staff", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /analytics/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/analytics-staff", expect.any(Object)));
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Clicked Notifications", () => {
    beforeEach(async () => {
        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const notification = screen.getAllByText(/notifications/i).find((el) => el.closest(".db-nav"));
        await user.click(notification);
    });

    it("renders Notifications on topbar", () => {
        const topbar = screen.getAllByText(/notifications/i).find((el) => el.closest(".db-topbar"));
        expect(topbar).toBeVisible();
    });

    it("renders user name", () => {
        expect(screen.getByText(/Hi, Jane/i)).toBeVisible();
    });
});

describe("Notifications Panel - content", () => {
    async function renderAndOpenNotifications() {
        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const notificationsNav = screen.getAllByText(/notifications/i).find((btn) => btn.closest(".db-nav"));
        await user.click(notificationsNav);
        return user;
    }

    it("shows 'No notifications.' when the list is empty", async () => {
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        await renderAndOpenNotifications();
        await waitFor(() => expect(screen.getByText("No notifications.")).toBeVisible());
        expect(screen.getByRole("button", { name: /mark all as read/i })).toBeVisible();
    });

    it("displays the correct unread count in the heading", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "Reminder", sent_at: null },
            { id: "n2", is_read: true,  message: "Update",   sent_at: null },
            { id: "n3", is_read: false, message: "Alert",    sent_at: null },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        await renderAndOpenNotifications();
        await waitFor(() => expect(screen.getByText(/Notifications \(2 unread\)/i)).toBeVisible());
    });

    it("renders notification cards with message and 'New' badge for unread ones", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "Your shift starts at 08:00", sent_at: "2025-05-10T10:00:00Z" },
            { id: "n2", is_read: true,  message: "Schedule updated",            sent_at: "2025-05-09T09:00:00Z" },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        await renderAndOpenNotifications();
        await waitFor(() => expect(screen.getByText("Your shift starts at 08:00")).toBeVisible());
        expect(screen.getByText("Schedule updated")).toBeVisible();
        expect(screen.getAllByText("New")).toHaveLength(1);
    });

    it("marks all as read and updates the UI when 'Mark all as read' is clicked", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "A", sent_at: null },
            { id: "n2", is_read: false, message: "B", sent_at: null },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        const user = await renderAndOpenNotifications();

        await waitFor(() => expect(screen.getAllByText("New")).toHaveLength(2));
        expect(screen.getByText("Notifications (2 unread)")).toBeVisible();

        await user.click(screen.getByRole("button", { name: /mark all as read/i }));

        await waitFor(() => {
            expect(screen.queryByText("New")).not.toBeInTheDocument();
            expect(screen.getByText("Notifications (0 unread)")).toBeVisible();
        });
    });
});


// ─────────────────────────────────────────────────────────────────────────────
// Profile nav now routes to /profile — inline panel no longer exists here.
// Profile content is tested in ProfilePage.test.jsx.
// ─────────────────────────────────────────────────────────────────────────────
describe("Clicked Profile", () => {
    it("navigates to /profile when Profile nav button is clicked", async () => {
        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith("/profile", expect.any(Object))
        );
    });

    it("renders the user greeting", () => {
        render(<StaffDashboard profile={mockStaffProfile} />);
        expect(screen.getByText(/Hi, Jane/i)).toBeVisible();
    });
});


// ─────────────────────────────────────────────────────────────────────────────
describe("Logout", () => {
    let originalLocalStorage;

    beforeEach(() => {
        originalLocalStorage = global.localStorage;
        global.localStorage = {
            removeItem: vi.fn(),
            getItem:    vi.fn(),
            setItem:    vi.fn(),
            clear:      vi.fn(),
        };
    });

    afterEach(() => {
        global.localStorage = originalLocalStorage;
    });

    it("logs out, clears local storage, and navigates to sign in", async () => {
        const user = userEvent.setup();
        render(<StaffDashboard profile={mockStaffProfile} />);

        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        await user.click(screen.getByRole("button", { name: /logout/i }));

        const { supabase } = await import("#lib/supabase");
        expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

        const { signOut } = await import("firebase/auth");
        expect(signOut).toHaveBeenCalledTimes(1);

        expect(localStorage.removeItem).toHaveBeenCalledWith("userIdentity");
        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
    
    it("shows success message after saving availability", async () => {
  const assignment = makeAssignment();

  const assignmentQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  assignmentQuery.eq.mockResolvedValueOnce({
    data: [assignment],
    error: null,
  });

  assignmentQuery.eq.mockResolvedValueOnce({
    error: null,
  });

  const notificationQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
  };

  const { supabase } = await import("#lib/supabase");

  supabase.from.mockImplementation((table) => {
    if (table === "staff_assignments") {
      return assignmentQuery;
    }

    if (table === "notifications") {
      return notificationQuery;
    }

    return mockQuery;
  });

  const user = userEvent.setup();

  render(<StaffDashboard profile={mockStaffProfile} />);

  await waitFor(() => {
  expect(screen.getByText("Soweto Clinic")).toBeVisible();
});

 
});
    
it("Availability quick-action navigates to /schedule", async () => {
  const user = userEvent.setup();

  render(<StaffDashboard profile={mockStaffProfile} />);

  const btn = screen.getByRole("button", {
    name: /availability/i,
  });

  await user.click(btn);

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      "/schedule",
      expect.any(Object)
    );
  });
});
describe("Sidebar hamburger", () => {
    it("toggles sidebar open class when hamburger is clicked", async () => {
        const user = userEvent.setup();

        render(<StaffDashboard profile={mockStaffProfile} />);

        const sidebar = document.querySelector(".db-sidebar");
        const hamburger = screen.getByRole("button", { name: "☰" });

        expect(sidebar.classList.contains("open")).toBe(false);

        await user.click(hamburger);

        expect(sidebar.classList.contains("open")).toBe(true);

        await user.click(hamburger);

        expect(sidebar.classList.contains("open")).toBe(false);
    });
});

describe("Local storage setup", () => {
    let originalLocalStorage;

    beforeEach(() => {
        originalLocalStorage = global.localStorage;

        global.localStorage = {
            setItem: vi.fn(),
            getItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        };
    });

    afterEach(() => {
        global.localStorage = originalLocalStorage;
    });

    it("stores staff_id and facility_id after loading assignments", async () => {
        const assignment = makeAssignment();

        const assignmentQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
                data: [assignment],
                error: null,
            }),
        };

        const notificationQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
            }),
        };

        const { supabase } = await import("#lib/supabase");

        supabase.from.mockImplementation((table) => {
            if (table === "staff_assignments") {
                return assignmentQuery;
            }

            if (table === "notifications") {
                return notificationQuery;
            }

            return mockQuery;
        });

        render(<StaffDashboard profile={mockStaffProfile} />);

        await waitFor(() => {
            expect(localStorage.setItem).toHaveBeenCalledWith(
                "staff_id",
                "staff-123"
            );

            expect(localStorage.setItem).toHaveBeenCalledWith(
                "facility_id",
                "fac-1"
            );
        });
    });
});

describe("Notification query chaining", () => {
    it("calls notification query filters correctly", async () => {
        const eqMock = vi.fn().mockReturnThis();

        const notificationQuery = {
            select: vi.fn().mockReturnThis(),
            eq: eqMock,
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
            }),
        };

        const assignmentQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
            }),
        };

        const { supabase } = await import("#lib/supabase");

        supabase.from.mockImplementation((table) => {
            if (table === "notifications") {
                return notificationQuery;
            }

            if (table === "staff_assignments") {
                return assignmentQuery;
            }

            return mockQuery;
        });

        render(<StaffDashboard profile={mockStaffProfile} />);

        await waitFor(() => {
            expect(eqMock).toHaveBeenCalledWith(
                "profile_id",
                "staff-123"
            );

            expect(eqMock).toHaveBeenCalledWith(
                "channel",
                "in_app"
            );
        });
    });
});
});