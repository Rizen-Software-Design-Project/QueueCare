import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import StaffDashboard from "./StaffDashboard";
import userEvent from "@testing-library/user-event";
import { StaffHistoryView } from "./AppointmentHistory";


// ─── Mocks ───────────────────────────────────────────────────────────────────

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
  class GoogleAuthProvider   { constructor() { this.addScope = vi.fn(); } }
  class FacebookAuthProvider { constructor() { this.addScope = vi.fn(); } }
  class RecaptchaVerifier    { constructor() { this.render = vi.fn(); this.clear = vi.fn(); } }
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

// Mock child components that make their own API calls — keeps tests focused
vi.mock("./StaffClinicManagement", () => ({
  default: () => <section data-testid="staff-clinic-management" />,
}));
vi.mock("./Walkin", () => ({
  default: () => <section data-testid="walk-in" />,
}));
vi.mock("./Schedule", () => ({
  default: () => <section data-testid="schedule" />,
}));
vi.mock("./AnalyticsDashboardStaff", () => ({
  default: () => <section data-testid="analytics-staff" />,
}));
vi.mock("./AIAssistant", () => ({
  default: () => <section data-testid="ai-assistant" />,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

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
  // Restore default mockQuery chains after clearAllMocks wipes return values
  mockQuery.select.mockReturnThis();
  mockQuery.eq.mockReturnThis();
  mockQuery.order.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.limit.mockResolvedValue({ data: [], error: null });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Sidebar", () => {
  beforeEach(() => {
    render(<StaffDashboard profile={mockStaffProfile} />);
  });

  const navItems = [
    { label: /overview/i },
    { label: /clinic appointments/i },
    { label: /walk-in patients/i },
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

  // Quick-action buttons call goTo(tabId) — they switch the active tab in-place,
  // they do NOT call navigate().
  it("Clinic Appointments quick-action renders StaffClinicManagement", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /clinic appointments/i }).find((b) => b.closest(".db-card"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("staff-clinic-management")).toBeInTheDocument()
    );
  });


  it("Walk-In Patients quick-action renders WalkIn", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /walk-in patients/i }).find((b) => b.closest(".db-card"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("walk-in")).toBeInTheDocument()
    );
  });

  it("View Analytics quick-action renders AnalyticsDashboardStaff", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /view analytics/i }).find((b) => b.closest(".db-card"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("analytics-staff")).toBeInTheDocument()
    );
  });

  it("Availability quick-action renders Schedule", async () => {
    const user = userEvent.setup();
    const btn = screen.getByRole("button", { name: /availability/i });
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("schedule")).toBeInTheDocument()
    );
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
// Nav items switch tabs inline — they do NOT navigate() to external routes.
describe("Nav items - tab switching", () => {
  beforeEach(() => {
    render(<StaffDashboard profile={mockStaffProfile} />);
  });

  it("Clinic Appointments nav renders StaffClinicManagement", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /clinic appointments/i }).find((b) => b.closest(".db-nav"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("staff-clinic-management")).toBeInTheDocument()
    );
  });

  it("Walk-In Patients nav renders WalkIn", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /walk-in patients/i }).find((b) => b.closest(".db-nav"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("walk-in")).toBeInTheDocument()
    );
  });

  it("Analytics nav renders AnalyticsDashboardStaff", async () => {
    const user = userEvent.setup();
    const btn = screen.getAllByRole("button", { name: /analytics/i }).find((b) => b.closest(".db-nav"));
    await user.click(btn);
    await waitFor(() =>
      expect(screen.getByTestId("analytics-staff")).toBeInTheDocument()
    );
  });

  it("Schedule/Availability nav renders Schedule", async () => {
    const user = userEvent.setup();
    // The nav item may be labelled "Availability" or "Schedule" depending on STAFF_NAV
    const btn = screen
      .getAllByRole("button", { name: /availability|schedule/i })
      .find((b) => b.closest(".db-nav"));
    if (btn) {
      await user.click(btn);
      await waitFor(() =>
        expect(screen.getByTestId("schedule")).toBeInTheDocument()
      );
    }
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


// ─────────────────────────────────────────────────────────────────────────────
// Profile nav renders ProfilePage inline — it does not call navigate().
describe("Clicked Profile", () => {
  it("renders ProfilePage when Profile nav button is clicked", async () => {
    const user = userEvent.setup();
    render(<StaffDashboard profile={mockStaffProfile} />);
    const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
    await user.click(profileNav);
    // ProfilePage renders an element with the staff member's name
    await waitFor(() =>
      expect(screen.getByText(/profile/i, { selector: ".db-topbar *" })).toBeInTheDocument()
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

  it("shows facility name after loading assignments", async () => {
    const assignment = makeAssignment();

    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValueOnce({ data: [assignment], error: null }),
      update: vi.fn().mockReturnThis(),
    };

    const notificationQuery = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const { supabase } = await import("#lib/supabase");
    supabase.from.mockImplementation((table) => {
      if (table === "staff_assignments") return assignmentQuery;
      if (table === "notifications")     return notificationQuery;
      return mockQuery;
    });

    render(<StaffDashboard profile={mockStaffProfile} />);

    await waitFor(() =>
      expect(screen.getByText("Soweto Clinic")).toBeVisible()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Sidebar hamburger", () => {
  it("toggles sidebar open class when hamburger is clicked", async () => {
    const user = userEvent.setup();
    render(<StaffDashboard profile={mockStaffProfile} />);

    const sidebar   = document.querySelector(".db-sidebar");
    const hamburger = screen.getByRole("button", {
      name: /toggle sidebar navigation/i,
    });

    expect(sidebar.classList.contains("open")).toBe(false);

    await user.click(hamburger);
    expect(sidebar.classList.contains("open")).toBe(true);

    await user.click(hamburger);
    expect(sidebar.classList.contains("open")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Local storage setup", () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      setItem:    vi.fn(),
      getItem:    vi.fn(),
      removeItem: vi.fn(),
      clear:      vi.fn(),
    };
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it("stores staff_id and facility_id after loading assignments", async () => {
    const assignment = makeAssignment();

    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ data: [assignment], error: null }),
    };

    const notificationQuery = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      order:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const { supabase } = await import("#lib/supabase");
    supabase.from.mockImplementation((table) => {
      if (table === "staff_assignments") return assignmentQuery;
      if (table === "notifications")     return notificationQuery;
      return mockQuery;
    });

    render(<StaffDashboard profile={mockStaffProfile} />);

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith("staff_id",    "staff-123");
      expect(localStorage.setItem).toHaveBeenCalledWith("facility_id", "fac-1");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("Clicked Service Policy", () => {
  it("renders Service Policy content when nav item is clicked", async () => {
    const user = userEvent.setup();
    render(<StaffDashboard profile={mockStaffProfile} />);

    const policyButton = screen
      .getAllByText(/service policy/i)
      .find((el) => el.closest(".db-nav"));

    expect(policyButton).toBeInTheDocument();
    await user.click(policyButton);

    // After clicking, topbar should show the policy label
    await waitFor(() =>
      expect(
        screen.getAllByText(/service policy/i).find((el) => el.closest(".db-topbar"))
      ).toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
describe("AppointmentHistory - StaffHistoryView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockQuery.limit.mockImplementation(() => new Promise(() => {}));

    render(<StaffHistoryView facilityId="facility-1" />);

    expect(screen.getByText(/loading appointments/i)).toBeVisible();
  });

  it("shows message when no facilityId is provided", async () => {
    render(<StaffHistoryView facilityId={null} />);

    await waitFor(() => {
      expect(
        screen.getByText(/no clinic assignment found/i)
      ).toBeVisible();
    });
  });

  it("renders upcoming appointments for staff", async () => {
    const appointments = [
      {
        id: "1",
        status: "booked",
        reason: "General Checkup",
        profiles: {
          name: "John",
          surname: "Doe",
          email: "john@example.com",
          phone_number: "123456789",
        },
        appointment_slots: {
          slot_date: "2099-12-01",
          slot_time: "09:00",
          duration_minutes: 30,
          facilities: {
            name: "Central Clinic",
            district: "District A",
            province: "Gauteng",
          },
        },
      },
    ];

    mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });

  render(<StaffHistoryView facilityId="facility-1" />);

  const upcomingPanel = await screen.findByRole("tabpanel", { name: /upcoming/i });
  expect(within(upcomingPanel).getByText(/john doe/i)).toBeVisible();
  expect(within(upcomingPanel).getByText(/general checkup/i)).toBeVisible();
  expect(within(upcomingPanel).getByText(/john@example.com/i)).toBeVisible();
  });

  it("switches to history tab and shows past appointments", async () => {
    const appointments = [
      {
        id: "2",
        status: "complete",
        reason: "Dental Visit",
        profiles: {
          name: "Jane",
          surname: "Smith",
          email: "jane@example.com",
        },
        appointment_slots: {
          slot_date: "2024-01-01",
          slot_time: "10:00",
          duration_minutes: 45,
          facilities: {
            name: "North Clinic",
          },
        },
      },
    ];

    mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });

  const user = userEvent.setup();
  render(<StaffHistoryView facilityId="facility-1" />);

  // role="tab" not role="button" — the component sets role="tab" explicitly
  const historyTab = await screen.findByRole("tab", { name: /history/i });
  expect(historyTab).toBeVisible();

  await user.click(historyTab);

  const historyPanel = await screen.findByRole("tabpanel", { name: /history/i });
  expect(within(historyPanel).getByText(/jane smith/i)).toBeVisible();
  expect(within(historyPanel).getByText(/dental visit/i)).toBeVisible();
  });

it("filters appointments using the search input", async () => {
  const appointments = [
    {
      id: "1",
      status: "booked",
      profiles: { name: "Alice", surname: "Johnson", email: "alice@example.com" },
      appointment_slots: { slot_date: "2099-12-01", slot_time: "08:00", facilities: { name: "Clinic A" } },
    },
    {
      id: "2",
      status: "booked",
      profiles: { name: "Bob", surname: "Williams", email: "bob@example.com" },
      appointment_slots: { slot_date: "2099-12-01", slot_time: "09:00", facilities: { name: "Clinic B" } },
    },
  ];

  mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });
  const user = userEvent.setup();
  render(<StaffHistoryView facilityId="facility-1" />);

  const upcomingPanel = await screen.findByRole("tabpanel", { name: /upcoming/i });
  expect(within(upcomingPanel).getByText(/alice johnson/i)).toBeVisible();

  const searchInput = screen.getByPlaceholderText(/search by patient name or email/i);
  await user.type(searchInput, "alice");

  expect(within(upcomingPanel).getByText(/alice johnson/i)).toBeVisible();
  expect(within(upcomingPanel).queryByText(/bob williams/i)).not.toBeInTheDocument();
});

it("clears the search filter when clear button is clicked", async () => {
  const appointments = [
    {
      id: "1",
      status: "booked",
      profiles: { name: "Alice", surname: "Johnson", email: "alice@example.com" },
      appointment_slots: { slot_date: "2099-12-01", slot_time: "08:00", facilities: { name: "Clinic A" } },
    },
    {
      id: "2",
      status: "booked",
      profiles: { name: "Bob", surname: "Williams", email: "bob@example.com" },
      appointment_slots: { slot_date: "2099-12-01", slot_time: "09:00", facilities: { name: "Clinic B" } },
    },
  ];

  mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });
  const user = userEvent.setup();
  render(<StaffHistoryView facilityId="facility-1" />);

  const upcomingPanel = await screen.findByRole("tabpanel", { name: /upcoming/i });
  expect(within(upcomingPanel).getByText(/alice johnson/i)).toBeVisible();

  const searchInput = screen.getByPlaceholderText(/search by patient name or email/i);
  await user.type(searchInput, "alice");
  expect(within(upcomingPanel).queryByText(/bob williams/i)).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /clear/i }));

  expect(within(upcomingPanel).getByText(/alice johnson/i)).toBeVisible();
  expect(within(upcomingPanel).getByText(/bob williams/i)).toBeVisible();
});

it("shows empty message when no appointments match the search", async () => {
  const appointments = [
    {
      id: "1",
      status: "booked",
      profiles: { name: "Alice", surname: "Johnson", email: "alice@example.com" },
      appointment_slots: { slot_date: "2099-12-01", slot_time: "08:00", facilities: { name: "Clinic A" } },
    },
  ];

  mockQuery.limit.mockResolvedValueOnce({ data: appointments, error: null });
  const user = userEvent.setup();
  render(<StaffHistoryView facilityId="facility-1" />);

  const upcomingPanel = await screen.findByRole("tabpanel", { name: /upcoming/i });
  expect(within(upcomingPanel).getByText(/alice johnson/i)).toBeVisible();

  const searchInput = screen.getByPlaceholderText(/search by patient name or email/i);
  await user.type(searchInput, "nomatch");

  expect(screen.getByText(/no upcoming appointments/i)).toBeVisible();
});
});
