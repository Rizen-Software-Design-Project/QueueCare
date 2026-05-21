import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AdminDashboard from "./AdminDashboard";
import userEvent from "@testing-library/user-event";


// mocks
// overview
// notifications
// profile


// mocks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);


vi.mock("./Applications.jsx", () => ({
    default: () => <section data-testid="applications-panel">Applications Panel</section>,
}));
vi.mock("./AdminClinics", () => ({
    default: () => <section data-testid="clinics-panel">Clinics Panel</section>,
}));
vi.mock("./AdminStaff.jsx", () => ({
    default: () => <section data-testid="staff-panel">Staff Panel</section>,
}));
vi.mock("./AnalyticsDashboardAdmin", () => ({
    default: () => <section data-testid="analytics-panel">Analytics Panel</section>,
}));
vi.mock("./ProfilePage.jsx", () => ({
    default: () => <section data-testid="profile-panel">Profile Panel</section>,
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


// overview
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

    it("Profile nav button renders Profile panel inline", async () => {
        const user = userEvent.setup();
        const btn = screen.getAllByRole("button", { name: /^profile$/i }).find((b) => b.closest(".db-nav"));
        await user.click(btn);
        expect(screen.getByTestId("profile-panel")).toBeVisible();
    });
});


// notifications
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


// profile
describe("Clicked Profile", () => {
    it("renders Profile panel inline when Profile nav button is clicked", async () => {
        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        await waitFor(() =>
            expect(screen.getByTestId("profile-panel")).toBeVisible()
        );
    });

    it("does not navigate away when Profile nav button is clicked", async () => {
        const user = userEvent.setup();
        render(<AdminDashboard profile={mockAdminProfile} />);
        const profileNav = screen.getAllByText(/profile/i).find((el) => el.closest(".db-nav"));
        await user.click(profileNav);
        expect(mockNavigate).not.toHaveBeenCalled();
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