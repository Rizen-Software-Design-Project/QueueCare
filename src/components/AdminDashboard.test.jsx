import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AdminDashboard from "./AdminDashboard";
import userEvent from "@testing-library/user-event";


//jump-mocks
//jump-overview
//jump-notifications
//jump-profile


//jump-mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);


vi.mock("./Applications.jsx", () => ({
    default: () => <div data-testid="applications-panel">Applications Panel</div>,
}));
vi.mock("./AdminClinics", () => ({
    default: () => <div data-testid="clinics-panel">Clinics Panel</div>,
}));
vi.mock("./AdminStaff.jsx", () => ({
    default: () => <div data-testid="staff-panel">Staff Panel</div>,
}));
vi.mock("./AnalyticsDashboardAdmin", () => ({
    default: () => <div data-testid="analytics-panel">Analytics Panel</div>,
}));

const mockQuery = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockResolvedValue({ data: [], error: null }),
    update:      vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => mockQuery),
        auth: { signOut: vi.fn(() => Promise.resolve()) },
    },
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

const mockAdminProfile = {
    id:               "admin-123",
    name:             "Alice",
    surname:          "Admin",
    email:            "alice@admin.com",
    phone_number:     "0841234567",
    dob:              "1980-03-20",
    role:             "admin",
    auth_provider:    "firebase",
    provider_user_id: "fb-admin-uid",
};

beforeEach(() => {
    vi.clearAllMocks();
});


describe("Sidebar", () => {
    beforeEach(() => {
        render(<AdminDashboard profile={mockAdminProfile} />);
    });

    const navItems = [
        { label: /overview/i },
        { label: /applications/i },
        { label: /staff management/i },
        { label: /clinics/i },
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
        expect(screen.getByText(/Hi, Alice/i)).toBeVisible();
    });
});


//jump-overview
describe("Clicked Overview", () => {
    beforeEach(async () => {
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);
    });

    it("renders Overview on topbar", () => {
        const topbar = screen.getAllByText(/overview/i).find((el) => el.closest(".db-topbar"));
        expect(topbar).toBeVisible();
    });

    it("renders View Applications quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /view applications/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders Manage Staff quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /manage staff/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders Manage Clinics quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /manage clinics/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("renders View Analytics quick-action button", () => {
        const btn = screen.getAllByRole("button", { name: /view analytics/i }).find((b) => b.closest(".db-card"));
        expect(btn).toBeVisible();
    });

    it("shows zero unread Notifications count in stat card", () => {
        const card = document.querySelector(".db-stat-card");
        expect(card.querySelector(".db-stat-num").textContent).toBe("0");
    });

    it("View Applications quick-action switches to Applications panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /view applications/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        expect(screen.getByTestId("applications-panel")).toBeVisible();
    });

    it("Manage Staff quick-action switches to Staff Management panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /manage staff/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        expect(screen.getByTestId("staff-panel")).toBeVisible();
    });

    it("Manage Clinics quick-action switches to Clinics panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /manage clinics/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        expect(screen.getByTestId("clinics-panel")).toBeVisible();
    });

    it("View Analytics quick-action switches to Analytics panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /view analytics/i }).find((b) => b.closest(".db-card"));
        await user.click(btn);
        expect(screen.getByTestId("analytics-panel")).toBeVisible();
    });
});


describe("Clicked Overview - stat card", () => {
    it("shows correct unread Notifications count", async () => {
        const mockNotifs = [
            { id: "n1", is_read: false, message: "A", sent_at: null },
            { id: "n2", is_read: false, message: "B", sent_at: null },
            { id: "n3", is_read: true,  message: "C", sent_at: null },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const overview = screen.getAllByText(/overview/i).find((el) => el.closest(".db-nav"));
        await user.click(overview);

        await waitFor(() => {
            const card = document.querySelector(".db-stat-card");
            expect(card.querySelector(".db-stat-num").textContent).toBe("2");
        });
    });
});


describe("Nav items that render sub-panels", () => {
    beforeEach(() => {
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });
        render(<AdminDashboard profile={mockAdminProfile} />);
    });

    it("Applications nav button renders Applications panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /^applications$/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        expect(screen.getByTestId("applications-panel")).toBeVisible();
    });

    it("Staff Management nav button renders Staff panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /staff management/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        expect(screen.getByTestId("staff-panel")).toBeVisible();
    });

    it("Clinics nav button renders Clinics panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /^clinics$/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        expect(screen.getByTestId("clinics-panel")).toBeVisible();
    });

    it("Analytics nav button renders Analytics panel", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /^analytics$/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        expect(screen.getByTestId("analytics-panel")).toBeVisible();
    });
});


//jump-notifications
describe("Clicked Notifications", () => {
    beforeEach(async () => {
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const notification = screen.getAllByText(/notifications/i).find((el) => el.closest(".db-nav"));
        await user.click(notification);
    });

    it("renders Notifications on topbar", () => {
        const topbar = screen.getAllByText(/notifications/i).find((el) => el.closest(".db-topbar"));
        expect(topbar).toBeVisible();
    });

    it("renders user name", () => {
        expect(screen.getByText(/Hi, Alice/i)).toBeVisible();
    });
});

describe("Notifications Panel - content", () => {
    async function renderAndOpenNotifications() {
        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
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
            { id: "n1", is_read: false, message: "New application submitted", sent_at: "2025-05-10T10:00:00Z" },
            { id: "n2", is_read: true,  message: "Staff member approved",     sent_at: "2025-05-09T09:00:00Z" },
        ];

        mockQuery.limit.mockResolvedValueOnce({ data: mockNotifs, error: null });

        await renderAndOpenNotifications();
        await waitFor(() => expect(screen.getByText("New application submitted")).toBeVisible());
        expect(screen.getByText("Staff member approved")).toBeVisible();
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


//jump-profile
describe("Clicked Profile", () => {
    it("navigates to /profile when Profile nav button is clicked", async () => {
        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        await waitFor(() =>
            expect(mockNavigate).toHaveBeenCalledWith("/profile", expect.any(Object))
        );
    });

    it("renders the user greeting", () => {
        render(<AdminDashboard profile={mockAdminProfile} />);
        expect(screen.getByText(/Hi, Alice/i)).toBeVisible();
    });
});



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
        mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });

        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);

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
});