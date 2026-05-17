// ProfilePage.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./ProfilePage";

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockUpdate = vi.fn().mockReturnThis();
const mockEq     = vi.fn().mockResolvedValue({ error: null });

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => ({
            update: mockUpdate,
            eq:     mockEq,
        })),
    },
}));

// ── react-router-dom mock ─────────────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => mockNavigate };
});

// ── Shared test profile ───────────────────────────────────────────────────────
const mockProfile = {
    id:           "profile-123",
    name:         "John",
    surname:      "Doe",
    email:        "john@example.com",
    phone_number: "0821234567",
    role:         "patient",
    dob:          "1990-01-01",
};
function renderProfile({ profile = mockProfile, ...rest } = {}) {
    return render(
        <MemoryRouter>
            <ProfilePage profile={profile} {...rest} />
        </MemoryRouter>
    );
}

// ── View mode ─────────────────────────────────────────────────────────────────
describe("ProfilePage – view mode", () => {
    beforeEach(() => renderProfile({ onBack: vi.fn() }));


    it("renders the My Profile heading", () => {
        expect(screen.getByRole("heading", { name: "My Profile" })).toBeVisible();
    });

    it("renders the Back button", () => {
        expect(screen.getByRole("button", { name: /back/i })).toBeVisible();
    });

    it("renders First Name field with correct value", () => {
        const input = screen.getByDisplayValue("John");
        expect(input).toBeDisabled();
    });

    it("renders Surname field with correct value", () => {
        const input = screen.getByDisplayValue("Doe");
        expect(input).toBeDisabled();
    });

    it("renders Phone field with correct value", () => {
        const input = screen.getByDisplayValue("0821234567");
        expect(input).toBeDisabled();
    });

    it("renders Email as static text", () => {
        expect(screen.getByText("john@example.com")).toBeVisible();
    });

    it("renders Role as static text", () => {
        expect(screen.getByText("patient")).toBeVisible();
    });

    it("renders the Edit Profile button", () => {
        expect(screen.getByRole("button", { name: "Edit Profile" })).toBeVisible();
    });

    it("does not show Save or Cancel in view mode", () => {
        expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    });
});

// ── Edit mode ─────────────────────────────────────────────────────────────────
describe("ProfilePage – edit mode", () => {
    beforeEach(async () => {
        renderProfile();
        await userEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    });

    it("shows Save and Cancel buttons after clicking Edit Profile", () => {
        expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    it("hides the Edit Profile button while editing", () => {
        expect(screen.queryByRole("button", { name: "Edit Profile" })).not.toBeInTheDocument();
    });

    it("allows typing in the First Name field", async () => {
        const input = screen.getByDisplayValue("John");
        await userEvent.clear(input);
        await userEvent.type(input, "Jane");
        expect(input).toHaveValue("Jane");
    });

    it("allows typing in the Surname field", async () => {
        const input = screen.getByDisplayValue("Doe");
        await userEvent.clear(input);
        await userEvent.type(input, "Smith");
        expect(input).toHaveValue("Smith");
    });

    it("allows typing in the Phone field", async () => {
        const input = screen.getByDisplayValue("0821234567");
        await userEvent.clear(input);
        await userEvent.type(input, "0119876543");
        expect(input).toHaveValue("0119876543");
    });

    it("renders a date input for Date of Birth", () => {
        const dateInput = screen.getByDisplayValue("1990-01-01");
        expect(dateInput).toHaveAttribute("type", "date");
        expect(dateInput).not.toBeDisabled();
    });
});

// ── Cancel ────────────────────────────────────────────────────────────────────
describe("ProfilePage – cancel edit", () => {
    beforeEach(async () => {
        renderProfile();
        await userEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    it("returns to view mode after Cancel", () => {
        expect(screen.getByRole("button", { name: "Edit Profile" })).toBeVisible();
        expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    });

    it("original values are still displayed after Cancel", () => {
        expect(screen.getByDisplayValue("John")).toBeDisabled();
        expect(screen.getByDisplayValue("Doe")).toBeDisabled();
    });
});

// ── Save ──────────────────────────────────────────────────────────────────────
describe("ProfilePage – save profile", () => {
    it("calls supabase update with the edited form values", async () => {
        renderProfile();
        await userEvent.click(screen.getByRole("button", { name: "Edit Profile" }));

        const nameInput = screen.getByDisplayValue("John");
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, "Jane");

        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ name: "Jane" })
            );
        });
    });

    it("returns to view mode after a successful save", async () => {
        renderProfile();
        await userEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Edit Profile" })).toBeVisible();
        });
    });
});

// ── Back navigation ───────────────────────────────────────────────────────────
describe("ProfilePage – back button", () => {
    it("calls onBack when Back is clicked", async () => {
        const mockOnBack = vi.fn();
        renderProfile({ onBack: mockOnBack }); // ← now correctly passed as prop
        await userEvent.click(screen.getByRole("button", { name: /← Back/i }));
        expect(mockOnBack).toHaveBeenCalled();
    });
});

// ── No profile (skeleton) ─────────────────────────────────────────────────────
describe("ProfilePage – no profile prop", () => {
    it("renders a skeleton loader when profile is null and no location state/localStorage", () => {
        // Ensure localStorage is empty
        localStorage.removeItem("userProfile");
        render(
            <MemoryRouter initialEntries={[{ pathname: "/profile", state: {} }]}>
                <ProfilePage />
            </MemoryRouter>
        );
        // Skeleton renders instead of fields
        expect(screen.queryByRole("heading", { name: "My Profile" })).not.toBeInTheDocument();
        expect(document.querySelector(".profile-skeleton")).toBeInTheDocument();
    });
});