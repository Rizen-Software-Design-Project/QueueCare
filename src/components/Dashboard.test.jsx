import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mockOnAuthStateChanged = vi.hoisted(() => vi.fn());
const mockSupabaseFrom       = vi.hoisted(() => vi.fn());
const mockSupabaseGetUser    = vi.hoisted(() => vi.fn());
const mockNavigate           = vi.hoisted(() => vi.fn());

vi.mock("firebase/auth", () => ({
    onAuthStateChanged: mockOnAuthStateChanged,
    getAuth:  vi.fn(() => ({})),
    signOut:  vi.fn(() => Promise.resolve()),
}));

vi.mock("../firebase", () => ({
    auth: { currentUser: null },
}));

vi.mock("#lib/supabase", () => ({
    supabase: {
        auth: { getUser: mockSupabaseGetUser },
        from:  mockSupabaseFrom,
    },
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("./PatientDashboard", () => ({
    default: ({ profile }) => <section data-testid="patient-dashboard">{profile.role}</section>,
}));
vi.mock("./StaffDashboard", () => ({
    default: ({ profile }) => <section data-testid="staff-dashboard">{profile.role}</section>,
}));
vi.mock("./AdminDashboard", () => ({
    default: ({ profile }) => <section data-testid="admin-dashboard">{profile.role}</section>,
}));

import Dashboard from "./Dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fireAuthChange(firebaseUser) {
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
        cb(firebaseUser);
        return vi.fn();
    });
}

function makeQueryMock(data) {
    return {
        select:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        order:       vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data }),
    };
}

async function renderDashboard() {
    render(
        <MemoryRouter>
            <Dashboard />
        </MemoryRouter>
    );
    await waitFor(() =>
        expect(screen.queryByText(/loading your dashboard/i)).not.toBeInTheDocument()
    );
}

// ── Global reset ──────────────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSupabaseGetUser.mockResolvedValue({ data: { user: null } });
    // default: profiles query returns null so Dashboard navigates to /signin
    mockSupabaseFrom.mockReturnValue({
        select:      vi.fn().mockReturnThis(),
        eq:          vi.fn().mockReturnThis(),
        order:       vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loading state
// ─────────────────────────────────────────────────────────────────────────────
describe("Dashboard loading state", () => {
    it("shows the loading spinner before auth resolves", () => {
        // Never call the callback so loading stays true
        mockOnAuthStateChanged.mockReturnValue(vi.fn());

        render(
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        );

        expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
        expect(document.querySelector(".db-spinner")).toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated
// ─────────────────────────────────────────────────────────────────────────────
describe("Dashboard unauthenticated user", () => {
    it("redirects to /signin when no Firebase or Supabase session exists", async () => {
        fireAuthChange(null);
        mockSupabaseGetUser.mockResolvedValue({ data: { user: null } });

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/signin", { replace: true });
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Firebase authenticated user
// ─────────────────────────────────────────────────────────────────────────────
describe("Dashboard – Firebase authenticated user", () => {
    const firebaseUser = { uid: "fb-uid-123" };

    it("stores Firebase identity in localStorage after auth", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "patient", auth_provider: "firebase", provider_user_id: "fb-uid-123" })
        );

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem("userIdentity"));
            expect(stored).toEqual({ auth_provider: "firebase", provider_user_id: "fb-uid-123" });
        });
    });

    it("renders PatientDashboard for role: patient", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "patient", auth_provider: "firebase", provider_user_id: "fb-uid-123" })
        );

        await renderDashboard();

        expect(screen.getByTestId("patient-dashboard")).toBeInTheDocument();
    });

    it("renders StaffDashboard for role: staff", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "staff", auth_provider: "firebase", provider_user_id: "fb-uid-123" })
        );

        await renderDashboard();

        expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    it("renders AdminDashboard for role: admin", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "admin", auth_provider: "firebase", provider_user_id: "fb-uid-123" })
        );

        await renderDashboard();

        expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });

    it("shows unknown role message for an unrecognised role", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "lost", auth_provider: "firebase", provider_user_id: "fb-uid-123" })
        );

        await renderDashboard();

        expect(screen.getByText(/unknown role: lost/i)).toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Supabase authenticated user (no Firebase session)
// ─────────────────────────────────────────────────────────────────────────────
describe("Dashboard – Supabase authenticated user", () => {
    const supabaseUser = { id: "sb-uid-456" };

    beforeEach(() => {
        fireAuthChange(null);
        mockSupabaseGetUser.mockResolvedValue({ data: { user: supabaseUser } });
    });

    it("stores Supabase identity in localStorage after auth", async () => {
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "patient", auth_provider: "supabase", provider_user_id: "sb-uid-456" })
        );

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem("userIdentity"));
            expect(stored).toEqual({ auth_provider: "supabase", provider_user_id: "sb-uid-456" });
        });
    });

    it("renders PatientDashboard for role: patient", async () => {
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "patient", auth_provider: "supabase", provider_user_id: "sb-uid-456" })
        );

        await renderDashboard();

        expect(screen.getByTestId("patient-dashboard")).toBeInTheDocument();
    });

    it("renders StaffDashboard for role: staff", async () => {
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "staff", auth_provider: "supabase", provider_user_id: "sb-uid-456" })
        );

        await renderDashboard();

        expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    it("renders AdminDashboard for role: admin", async () => {
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "admin", auth_provider: "supabase", provider_user_id: "sb-uid-456" })
        );

        await renderDashboard();

        expect(screen.getByTestId("admin-dashboard")).toBeInTheDocument();
    });

    it("shows unknown role message for an unrecognised role", async () => {
        mockSupabaseFrom.mockReturnValue(
            makeQueryMock({ role: "lost", auth_provider: "supabase", provider_user_id: "sb-uid-456" })
        );

        await renderDashboard();

        expect(screen.getByText(/unknown role: lost/i)).toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Profile not found — role_applications fallback
// ─────────────────────────────────────────────────────────────────────────────
describe("Dashboard – profile not found (role_applications fallback)", () => {
    const firebaseUser = { uid: "fb-uid-789" };

    it("redirects with pending message when application is pending", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom
            .mockReturnValueOnce(makeQueryMock(null))
            .mockReturnValueOnce(makeQueryMock({ requested_role: "staff", status: "pending" }));

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/signin", {
                replace: true,
                state: { pendingMessage: "Your staff application is still pending approval." },
            });
        });
    });

    it("redirects with rejection message when application was rejected", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom
            .mockReturnValueOnce(makeQueryMock(null))
            .mockReturnValueOnce(makeQueryMock({ requested_role: "admin", status: "rejected" }));

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/signin", {
                replace: true,
                state: { pendingMessage: "Your admin application was rejected." },
            });
        });
    });

    it("redirects without state message when no application exists", async () => {
        fireAuthChange(firebaseUser);
        mockSupabaseFrom
            .mockReturnValueOnce(makeQueryMock(null))
            .mockReturnValueOnce(makeQueryMock(null));

        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/signin", {
                replace: true,
                state: undefined,
            });
        });
    });
});