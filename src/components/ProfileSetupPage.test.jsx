import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ProfileSetupPage from "./ProfileSetupPage";


// THE COMMENTS ARE NECESSARY
//mocks
//opening pages
//back button clicked
//navigate to page ...
//fill and submit
//tests(describes)


const MOTIVATION = "I need admin access to manage the clinic scheduling system effectively.";

//mocks
const mockMaybeSingle = vi.hoisted(() =>
    vi.fn(() => Promise.resolve({ data: null, error: null }))
);

const mockUpsert = vi.hoisted(() =>
    vi.fn(() => Promise.resolve({ error: null }))
);

const mockStorageUpload = vi.hoisted(() =>
    vi.fn(() => Promise.resolve({ error: null }))
);

const mockStorageGetPublicUrl = vi.hoisted(() =>
    vi.fn(() => ({ data: { publicUrl: "https://example.com/cv.pdf" } }))
);

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        upsert: mockUpsert,
        })),
        storage: {
        from: vi.fn(() => ({
            upload: mockStorageUpload,
            getPublicUrl: mockStorageGetPublicUrl,
        })),
        },
    },
}));


const mockNavigate = vi.hoisted(() => vi.fn());

const mockLocationState = vi.hoisted(() => ({
    current: {
        state: {
        identity: {
            auth_provider: "supabase",
            provider_user_id: "user-123",
            email: "",
            phone: "",
            name: "",
            surname: "",
        },
        selectedRole: "patient",
        },
    },
}));

vi.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocationState.current,
}));


vi.stubGlobal("crypto", {
    subtle: {
        digest: vi.fn(() =>
        Promise.resolve(new Uint8Array(32).buffer)
        ),
    },
});


vi.mock("./Applications", () => ({
    default: ({ onSubmitted, onBack }) => (
        <section>
        <section>Applications mock</section>
        <button onClick={onBack}>Back</button>
        <button onClick={onSubmitted}>Submit staff application</button>
        </section>
    ),
}));


global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
);





function renderAsPatient(overrides = {}) {
    mockLocationState.current = {
        state: {
        identity: {
            auth_provider: "supabase",
            provider_user_id: "user-123",
            email: "",
            phone: "",
            name: "",
            surname: "",
            ...overrides.identity,
        },
        selectedRole: "patient",
        },
    };
    render(<ProfileSetupPage />);
}

function renderAsAdmin() {
    mockLocationState.current = {
        state: {
        identity: {
            auth_provider: "supabase",
            provider_user_id: "user-admin-1",
            email: "admin@example.com",
            phone: "",
            name: "",
            surname: "",
        },
        selectedRole: "admin",
        },
    };
    render(<ProfileSetupPage />);
}

function renderAsStaff() {
    mockLocationState.current = {
        state: {
        identity: {
            auth_provider: "supabase",
            provider_user_id: "user-staff-1",
            email: "staff@example.com",
            phone: "",
            name: "",
            surname: "",
        },
        selectedRole: "staff",
        },
    };
    render(<ProfileSetupPage />);
}

function renderNoState() {
    mockLocationState.current = { state: null };
    render(<ProfileSetupPage />);
}


function submitProfile() {
    fireEvent.submit(screen.getByRole("button", { name: /save & continue/i }).closest("form"));
}

function submitAdmin() {
    fireEvent.submit(
        screen.getByRole("button", { name: /save & continue/i }).closest("form")
    );
}



//opening pages
function openProfileStep() {
    it("renders Complete your profile heading", () => {
        expect(screen.getByText(/complete your profile/i)).toBeVisible();
    });

    it("renders First name input", () => {
        expect(screen.getByPlaceholderText("Jane")).toBeVisible();
    });

    it("renders Surname input", () => {
        expect(screen.getByPlaceholderText("Dlamini")).toBeVisible();
    });

    it("renders Male gender pill", () => {
        expect(screen.getByRole("button", { name: /^male$/i })).toBeVisible();
    });

    it("renders Female gender pill", () => {
        expect(screen.getByRole("button", { name: /^female$/i })).toBeVisible();
    });

    it("renders Other gender pill", () => {
        expect(screen.getByRole("button", { name: /^other$/i })).toBeVisible();
    });

    it("renders SA ID Number input", () => {
        expect(screen.getByPlaceholderText("13 digits")).toBeVisible();
    });

    it("renders Save & continue button", () => {
        expect(screen.getByRole("button", { name: /save & continue/i })).toBeVisible();
    });
}

function openAdminOnboardingStep() {
    it("renders Admin verification heading", () => {
        expect(screen.getByText(/admin verification/i)).toBeVisible();
    });

    it("renders Employee / Admin ID input", () => {
        expect(screen.getByPlaceholderText(/employee id/i)).toBeVisible();
    });

    it("renders License Number input", () => {
        expect(screen.getByPlaceholderText(/license number/i)).toBeVisible();
    });

    it("renders Clinic / Department input", () => {
        expect(screen.getByPlaceholderText(/clinic or department/i)).toBeVisible();
    });

    it("renders Upload CV file input", () => {
        const fileInput = document.querySelector("input[type='file']");
        expect(fileInput).not.toBeNull();
    });

    it("renders Motivation textarea", () => {
        expect(screen.getByPlaceholderText(/explain why admin/i)).toBeVisible();
    });

    it("renders Submit admin application button", () => {
        expect(screen.getByRole("button", { name: /submit admin application/i })).toBeVisible();
    });

    it("renders Back button", () => {
        expect(screen.getByRole("button", { name: /^back$/i })).toBeVisible();
    });
}

function openStaffPendingStep() {
    it("renders Application submitted heading", () => {
        expect(screen.getByText(/application submitted/i)).toBeVisible();
    });

    it("renders the staff approval message", () => {
        expect(screen.getByText(/sent to the admin for approval/i)).toBeVisible();
    });

    it("renders Back to sign in button", () => {
        expect(screen.getByRole("button", { name: /back to sign in/i })).toBeVisible();
    });
}

function openAdminPendingStep() {
    it("renders Admin application submitted heading", () => {
        expect(screen.getByText(/admin application submitted/i)).toBeVisible();
    });

    it("renders the admin approval message", () => {
        expect(screen.getByText(/pending approval/i)).toBeVisible();
    });

    it("renders Back to sign in button", () => {
        expect(screen.getByRole("button", { name: /back to sign in/i })).toBeVisible();
    });
}




//back button clicked
async function backButtonClicked() {
    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: /^back$/i });
    await user.click(backButton);
}


//navigate to page ...
async function navigateToAdminOnboarding() {
    const user = userEvent.setup();
    renderAsAdmin();

    await fillSubmitProfileStep(user, { role: "admin" });

    await waitFor(() =>
        expect(screen.getByText(/admin verification/i)).toBeVisible()
    );
    return user;
}

async function navigateToStaffPending() {
    const user = userEvent.setup();
    renderAsStaff();
    await waitFor(() =>
        expect(screen.getByText(/applications mock/i)).toBeVisible()
    );
    const submitBtn = screen.getByRole("button", { name: /submit staff application/i });
    await user.click(submitBtn);
    await waitFor(() =>
        expect(screen.getByText(/application submitted/i)).toBeVisible()
    );
    return user;
}

async function navigateToAdminPending() {
    const user = await navigateToAdminOnboarding();
    await fillSubmitAdminOnboarding(user);
    await waitFor(() =>
        expect(screen.getByText(/admin application submitted/i)).toBeVisible()
    );
    return user;
}




//fill and submit
async function fillSubmitProfileStep(user, { role = "patient" } = {}) {
    await user.type(screen.getByPlaceholderText("Jane"),    "Alice");
    await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
    await user.click(screen.getByRole("button", { name: /^female$/i }));
    await user.type(screen.getByPlaceholderText("13 digits"), "9001015009087");

    await user.click(screen.getByRole("button", { name: /save & continue/i }));
}

async function fillSubmitAdminOnboarding(user) {
    await user.type(screen.getByPlaceholderText(/employee id/i),        "EMP-001");
    await user.type(screen.getByPlaceholderText(/license number/i),     "LIC-123");
    await user.type(screen.getByPlaceholderText(/clinic or department/i), "Admin Dept");
    await user.type(
        screen.getByPlaceholderText(/explain why admin/i),
        "I need admin access to manage the clinic scheduling system effectively."
    );

    // Attach a mock CV file
    const fileInput = document.querySelector("input[type='file']");
    const mockFile  = new File(["cv content"], "cv.pdf", { type: "application/pdf" });
    await user.upload(fileInput, mockFile);

    await user.click(screen.getByRole("button", { name: /submit admin application/i }));
}




beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/cv.pdf" } });
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    // Reset to patient by default
    mockLocationState.current = {
        state: {
        identity: {
            auth_provider:    "supabase",
            provider_user_id: "user-123",
            email:            "",
            phone:            "",
            name:             "",
            surname:          "",
        },
        selectedRole: "patient",
        },
    };
});




//tests(describes)
describe("ProfileStep - initial render (patient)", () => {
    beforeEach(() => {
        renderAsPatient();
    });

    openProfileStep();

    it.skip("renders Queuecare logo name", () => {
        expect(screen.getByText(/Queuecare/i)).toBeVisible();
    });
});


describe("ProfileStep - shows optional email/phone when identity has none", () => {
    beforeEach(() => {
        renderAsPatient({ identity: { email: "", phone: "" } });
    });

    it("shows optional Email field when identity has no email", () => {
        expect(screen.getByPlaceholderText("jane@example.com")).toBeVisible();
    });

    it("shows optional Phone field when identity has no phone", () => {
        expect(screen.getByPlaceholderText("0821234567")).toBeVisible();
    });
});


describe("ProfileStep - hides optional fields when identity already has them", () => {
    beforeEach(() => {
        renderAsPatient({
        identity: { email: "existing@example.com", phone: "0821234567" },
        });
    });

    it("does not show email field when identity already has email", () => {
        expect(screen.queryByPlaceholderText("jane@example.com")).not.toBeInTheDocument();
    });

    it("does not show phone field when identity already has phone", () => {
        expect(screen.queryByPlaceholderText("0821234567")).not.toBeInTheDocument();
    });
});


describe("ProfileStep - redirects when no state", () => {
    it("navigates to /signin when identity is missing", () => {
        renderNoState();
        expect(mockNavigate).toHaveBeenCalledWith("/signin", { replace: true });
    });
});


describe("ProfileStep - gender pill selection", () => {
    beforeEach(() => {
        renderAsPatient();
    });

    it("Male pill gets active class when clicked", async () => {
        const user = userEvent.setup();
        const maleBtn = screen.getByRole("button", { name: /^male$/i });
        await user.click(maleBtn);
        expect(maleBtn).toHaveClass("psp-pill--active");
    });

    it("Female pill gets active class when clicked", async () => {
        const user = userEvent.setup();
        const femaleBtn = screen.getByRole("button", { name: /^female$/i });
        await user.click(femaleBtn);
        expect(femaleBtn).toHaveClass("psp-pill--active");
    });

    it("only one pill is active at a time", async () => {
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: /^male$/i }));
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        expect(screen.getByRole("button", { name: /^male$/i   })).not.toHaveClass("psp-pill--active");
        expect(screen.getByRole("button", { name: /^female$/i })).toHaveClass("psp-pill--active");
    });
});



describe("ProfileStep - ID number validation", () => {
    beforeEach(() => {
        renderAsPatient();
    });

    it("shows error when ID is shorter than 13 digits", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Jane"), "Alice");
        await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        await user.type(screen.getByPlaceholderText("13 digits"), "123456");
        await user.click(screen.getByRole("button", { name: /save & continue/i }));
        await waitFor(() =>
        expect(screen.getByText(/13 digits/i)).toBeVisible()
        );
    });

    it("strips non-digit characters from the ID input", async () => {
        const user = userEvent.setup();
        const idInput = screen.getByPlaceholderText("13 digits");
        await user.type(idInput, "abc9001015009087");
        expect(idInput).toHaveValue("9001015009087");
    });

    it("shows error when ID has invalid date of birth", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Jane"), "Alice");
        await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        // Month 99 — invalid DOB
        await user.type(screen.getByPlaceholderText("13 digits"), "9099995009087");
        await user.click(screen.getByRole("button", { name: /save & continue/i }));
        await waitFor(() =>
        expect(screen.getByText(/valid date of birth/i)).toBeVisible()
        );
    });

    it("shows error when ID owner would be under 13", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Jane"), "Alice");
        await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        await user.type(screen.getByPlaceholderText("13 digits"), "1501015009087");
        await user.click(screen.getByRole("button", { name: /save & continue/i }));
        await waitFor(() =>
        expect(screen.getByText(/at least 13 years old/i)).toBeVisible()
        );
    });
});


describe("ProfileStep - optional email/phone validation", () => {
    beforeEach(() => {
        renderAsPatient({ identity: { email: "", phone: "" } });
    });

    it("shows error when an invalid SA phone is entered", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Jane"), "Alice");
        await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        await user.type(screen.getByPlaceholderText("13 digits"),  "9001015009087");
        await user.type(screen.getByPlaceholderText("0821234567"), "12345");
        await user.click(screen.getByRole("button", { name: /save & continue/i }));
        await waitFor(() =>
        expect(screen.getByText(/valid south african phone/i)).toBeVisible()
        );
    });
});


describe("ProfileStep - duplicate ID check", () => {
    it("shows error when ID belongs to a different account", async () => {
        mockMaybeSingle.mockResolvedValueOnce({
        data: {
            id: "other-profile",
            auth_provider: "supabase",
            provider_user_id: "different-user",
        },
        error: null,
        });

        renderAsPatient();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user);

        await waitFor(() =>
        expect(screen.getByText(/account with this id number already exists/i)).toBeVisible()
        );
    });

    it("does not block when the ID belongs to the same account", async () => {
        mockMaybeSingle.mockResolvedValueOnce({
        data: {
            id: "same-profile",
            auth_provider:    "supabase",
            provider_user_id: "user-123",
        },
        error: null,
        });

        renderAsPatient();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user);

        await waitFor(() =>
        expect(screen.queryByText(/account with this id number already exists/i)).not.toBeInTheDocument()
        );
    });
});


describe("ProfileStep - duplicate phone check", () => {
    it("shows error when phone belongs to a different account", async () => {
        mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
            data: {
            auth_provider:    "supabase",
            provider_user_id: "different-user",
            },
            error: null,
        });

        renderAsPatient({ identity: { email: "", phone: "" } });
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText("Jane"), "Alice");
        await user.type(screen.getByPlaceholderText("Dlamini"), "Nkosi");
        await user.click(screen.getByRole("button", { name: /^female$/i }));
        await user.type(screen.getByPlaceholderText("13 digits"),  "9001015009087");
        await user.type(screen.getByPlaceholderText("0821234567"), "0821234567");
        await user.click(screen.getByRole("button", { name: /save & continue/i }));

        await waitFor(() =>
        expect(screen.getByText(/account with this phone number already exists/i)).toBeVisible()
        );
    });
});


describe("ProfileStep - successful patient submission", () => {
    it("calls Supabase upsert with correct role", async () => {
        renderAsPatient();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user);

        await waitFor(() =>
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({ role: "patient" }),
            expect.any(Object)
        )
        );
    });

    it("navigates to /dashboard on success", async () => {
        renderAsPatient();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user);

        await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
        );
    });

    it("shows error when upsert fails", async () => {
        mockUpsert.mockResolvedValueOnce({ error: { message: "DB write failed" } });
        renderAsPatient();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user);

        await waitFor(() =>
        expect(screen.getByText(/DB write failed/i)).toBeVisible()
        );
    });
});



describe("ProfileStep - admin role advances to admin onboarding", () => {
    it("renders AdminOnboardingStep after valid profile submission", async () => {
        renderAsAdmin();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user, { role: "admin" });

        await waitFor(() =>
        expect(screen.getByText(/admin verification/i)).toBeVisible()
        );
    });

    it("does NOT call upsert for admin role at profile step", async () => {
        renderAsAdmin();
        const user = userEvent.setup();
        await fillSubmitProfileStep(user, { role: "admin" });

        await waitFor(() =>
        expect(screen.getByText(/admin verification/i)).toBeVisible()
        );
        expect(mockUpsert).not.toHaveBeenCalled();
    });
});


describe("AdminOnboardingStep - initial render", () => {
    beforeEach(async () => {
        await navigateToAdminOnboarding();
    });

    openAdminOnboardingStep();
});


describe("AdminOnboardingStep - back button clicked", () => {
    beforeEach(async () => {
        await navigateToAdminOnboarding();
        await backButtonClicked();
    });

    openProfileStep();
});



describe("AdminOnboardingStep - license number validation", () => {
    beforeEach(async () => {
        await navigateToAdminOnboarding();
    });

    it("shows error when license number is provided but too short", async () => {
        const { fireEvent } = await import("@testing-library/react");
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/employee id/i), "EMP-001");
        await user.type(screen.getByPlaceholderText(/license number/i), "AB");
        await user.type(screen.getByPlaceholderText(/explain why admin/i), "%s".replace("%s", MOTIVATION));
        const fileInput = document.querySelector("input[type='file']");
        const cv = new File(["cv"], "cv.pdf", { type: "application/pdf" });
        fireEvent.change(fileInput, { target: { files: [cv] } });
        await user.click(screen.getByRole("button", { name: /submit admin application/i }));
        await waitFor(() =>
        expect(screen.getByText(/license number must be at least 3/i)).toBeVisible()
        );
    });

    it("shows error when license number has invalid characters", async () => {
        const { fireEvent } = await import("@testing-library/react");
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/employee id/i), "EMP-001");
        await user.type(screen.getByPlaceholderText(/license number/i), "LIC 123!");
        await user.type(screen.getByPlaceholderText(/explain why admin/i), "%s".replace("%s", MOTIVATION));
        const fileInput = document.querySelector("input[type='file']");
        const cv = new File(["cv"], "cv.pdf", { type: "application/pdf" });
        fireEvent.change(fileInput, { target: { files: [cv] } });
        await user.click(screen.getByRole("button", { name: /submit admin application/i }));
        await waitFor(() =>
        expect(screen.getByText(/license number contains invalid/i)).toBeVisible()
        );
    });
});



describe("AdminOnboardingStep - CV validation", () => {
    beforeEach(async () => {
        await navigateToAdminOnboarding();
    });

    it("shows error when no CV file is uploaded", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/employee id/i), "EMP-001");
        await user.type(
        screen.getByPlaceholderText(/explain why admin/i),
        "I need admin access to manage the clinic scheduling system effectively."
        );
        await user.click(screen.getByRole("button", { name: /submit admin application/i }));
        await waitFor(() =>
        expect(screen.getByText(/please upload your cv/i)).toBeVisible()
        );
    });

    it("shows error when CV is wrong file type", async () => {
        const { fireEvent } = await import("@testing-library/react");
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/employee id/i), "EMP-001");
        await user.type(
        screen.getByPlaceholderText(/explain why admin/i),
        "I need admin access to manage the clinic scheduling system effectively."
        );

        const fileInput = document.querySelector("input[type='file']");
        const badFile   = new File(["bad"], "cv.exe", { type: "application/octet-stream" });
        fireEvent.change(fileInput, { target: { files: [badFile] } });

        await user.click(screen.getByRole("button", { name: /submit admin application/i }));
        await waitFor(() =>
        expect(screen.getByText(/pdf, doc, or docx/i)).toBeVisible()
        );
    });

    it("shows error when CV exceeds 2 MB", async () => {
        const user = userEvent.setup();
        await user.type(screen.getByPlaceholderText(/employee id/i), "EMP-001");
        await user.type(
        screen.getByPlaceholderText(/explain why admin/i),
        "I need admin access to manage the clinic scheduling system effectively."
        );

        const { fireEvent } = await import("@testing-library/react");
        const fileInput = document.querySelector("input[type='file']");
        const bigFile   = new File(["x".repeat(3)], "cv.pdf", { type: "application/pdf" });
        Object.defineProperty(bigFile, "size", { value: 3 * 1024 * 1024 });
        fireEvent.change(fileInput, { target: { files: [bigFile] } });

        await user.click(screen.getByRole("button", { name: /submit admin application/i }));
        await waitFor(() =>
        expect(screen.getByText(/smaller than 2mb/i)).toBeVisible()
        );
    });

    it("shows selected file name after upload", async () => {
        const user      = userEvent.setup();
        const fileInput = document.querySelector("input[type='file']");
        const mockFile  = new File(["cv"], "my-resume.pdf", { type: "application/pdf" });
        await user.upload(fileInput, mockFile);

        expect(screen.getByText(/my-resume\.pdf/i)).toBeVisible();
    });
});


describe("AdminOnboardingStep - successful submission", () => {
    it("calls Supabase storage upload", async () => {
        await navigateToAdminPending();
        expect(mockStorageUpload).toHaveBeenCalled();
    });

    it("calls Supabase upsert on role_applications", async () => {
        await navigateToAdminPending();
        expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
            requested_role: "admin",
            status:         "pending",
            professional_id: "EMP-001",
        }),
        expect.any(Object)
        );
    });

    it("advances to admin-pending step after submission", async () => {
        await navigateToAdminPending();
        expect(screen.getByText(/admin application submitted/i)).toBeVisible();
    });

    it("fires notification email after submission", async () => {
        await navigateToAdminPending();
        await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/notify/application/send-email"),
            expect.objectContaining({ method: "POST" })
        )
        );
    });

    it("shows error when storage upload fails", async () => {
        mockStorageUpload.mockResolvedValueOnce({ error: { message: "Upload failed" } });
        const user = await navigateToAdminOnboarding();
        await fillSubmitAdminOnboarding(user);

        await waitFor(() =>
        expect(screen.getByText(/upload failed/i)).toBeVisible()
        );
    });

    it("shows error when role_applications upsert fails", async () => {
        mockUpsert.mockResolvedValueOnce({ error: { message: "DB insert error" } });
        const user = await navigateToAdminOnboarding();
        await fillSubmitAdminOnboarding(user);

        await waitFor(() =>
        expect(screen.getByText(/db insert error/i)).toBeVisible()
        );
    });
});


describe("Admin pending step - render", () => {
    beforeEach(async () => {
        await navigateToAdminPending();
    });

    openAdminPendingStep();
});


describe("Admin pending step - Back to sign in clicked", () => {
    it("navigates to /signin", async () => {
        await navigateToAdminPending();
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: /back to sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
});


describe("Staff flow - renders Applications component immediately", () => {
    it("shows the Applications mock when role is staff", () => {
        renderAsStaff();
        expect(screen.getByText(/applications mock/i)).toBeVisible();
    });

    it("does NOT show the profile step for staff", () => {
        renderAsStaff();
        expect(screen.queryByText(/complete your profile/i)).not.toBeInTheDocument();
    });
});


describe("Staff flow - submit application", () => {
    beforeEach(async () => {
        await navigateToStaffPending();
    });

    openStaffPendingStep();
});


describe("Staff flow - back button from Applications", () => {
    it("navigates to /signin when back is clicked in Applications", async () => {
        renderAsStaff();
        const user = userEvent.setup();
        const backBtn = screen.getByRole("button", { name: /^back$/i });
        await user.click(backBtn);
        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
});


describe("Staff pending step - Back to sign in clicked", () => {
    it("navigates to /signin", async () => {
        await navigateToStaffPending();
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: /back to sign in/i }));
        expect(mockNavigate).toHaveBeenCalledWith("/signin");
    });
});