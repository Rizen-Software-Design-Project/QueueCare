import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import Applications from "./Applications";


// THE COMMENTS ARE NECESSARY
//mocks
//opening pages
//fill and submit
//tests(describes)




//mocks
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  single: vi.fn(() => Promise.resolve({ data: { id: "profile-123" }, error: null })),
};

const mockStorageUpload = vi.fn(() => Promise.resolve({ error: null }));
const mockStorageGetPublicUrl = vi.fn(() => ({
  data: { publicUrl: "https://storage.example.com/cv.pdf" },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: vi.fn(() => mockQuery),
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      })),
    },
  }),
}));

global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
global.alert = vi.fn();


const defaultIdentity = {
  auth_provider: "supabase",
  provider_user_id: "user-abc-123",
  email: "jane@example.com",
  phone: "0821234567",
  name: "Jane",
  surname: "Dlamini",
};

const adminProfile = {
  id: "admin-profile-id",
  role: "admin",
  name: "Admin",
  surname: "User",
};

const pendingApplication = {
  id: "app-001",
  auth_provider: "supabase",
  provider_user_id: "user-abc-123",
  name: "Jane",
  surname: "Dlamini",
  email: "jane@example.com",
  phone_number: "0821234567",
  sex: "female",
  id_number: "9001011234567",
  dob: "1990-01-01",
  professional_id: "EMP001",
  license_number: null,
  motivation: "I want to help.",
  requested_role: "staff",
  clinic_id: "clinic-01",
  clinic_name: "City Health Clinic",
  cv_url: "https://storage.example.com/cv.pdf",
  status: "pending",
  submitted_at: "2024-01-01T10:00:00Z",
  reviewed_at: null,
};




//opening pages
function openApplyModePage() {
  it("Renders Staff Application heading", async () => {
    expect(screen.getByText(/Staff Application/i)).toBeVisible();
  });

  it("Renders First Name input", async () => {
    expect(screen.getByPlaceholderText("Jane")).toBeVisible();
  });

  it("Renders Surname input", async () => {
    expect(screen.getByPlaceholderText("Dlamini")).toBeVisible();
  });

  it("Renders Email input", async () => {
    const emailField = screen.getByPlaceholderText("jane@example.com");
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeVisible();
  });

  it("Renders Phone Number input", async () => {
    expect(screen.getByPlaceholderText("0821234567")).toBeVisible();
  });

  it("Renders gender buttons", async () => {
    ["Male", "Female", "Other"].forEach((gender) => {
      expect(screen.getByRole("button", { name: gender })).toBeVisible();
    });
  });

  it("Renders SA ID Number input", async () => {
    expect(screen.getByPlaceholderText("13 digit ID number")).toBeVisible();
  });

  it("Renders Employee Number input", async () => {
    expect(screen.getByPlaceholderText("Employee number")).toBeVisible();
  });

  it("Renders License Number input (optional)", async () => {
    expect(screen.getByPlaceholderText("Professional license")).toBeVisible();
  });

  it("Renders Clinic search input", async () => {
    expect(screen.getByPlaceholderText("Search clinic name")).toBeVisible();
  });

  it("Renders CV file upload input", async () => {
    const fileInput = document.querySelector("input[type='file']");
    expect(fileInput).toHaveAttribute("accept", ".pdf,.doc,.docx");
    expect(fileInput).toBeInTheDocument();
  });

  it("Renders Motivation textarea", async () => {
    expect(screen.getByPlaceholderText("Why are you applying for this role?")).toBeVisible();
  });

  it("Renders Submit Application button", async () => {
    expect(screen.getByRole("button", { name: "Submit Application" })).toBeVisible();
  });
}

function openReviewModePage() {
  it("Renders Role Applications heading", async () => {
    expect(screen.getByText(/Role Applications/i)).toBeVisible();
  });

  it("Renders Refresh button", async () => {
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeVisible();
  });
}

function openApplicationCard() {
  it("Renders applicant name", async () => {
    expect(screen.getByText(/Jane Dlamini/i)).toBeVisible();
  });

  it("Renders requested role", async () => {
    expect(screen.getByText("staff")).toBeVisible();
  });

  it("Renders Approve button", async () => {
    expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
  });

  it("Renders Reject button", async () => {
    expect(screen.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  it("Renders pending status badge", async () => {
    expect(screen.getByText(/pending/i)).toBeVisible();
  });
}




//fill and submit
async function fillSubmitApplyForm() {
  const user = userEvent.setup();

  const nameField    = screen.getByPlaceholderText("Jane");
  const surnameField = screen.getByPlaceholderText("Dlamini");
  const emailField   = screen.getByPlaceholderText("jane@example.com");
  const phoneField   = screen.getByPlaceholderText("0821234567");
  const genderButton = screen.getByRole("button", { name: "Female" });
  const idField      = screen.getByPlaceholderText("13 digit ID number");
  const empField     = screen.getByPlaceholderText("Employee number");
  const clinicField  = screen.getByPlaceholderText("Search clinic name");

  await user.clear(nameField);
  await user.type(nameField, "Jane");

  await user.clear(surnameField);
  await user.type(surnameField, "Dlamini");

  await user.clear(emailField);
  await user.type(emailField, "jane@example.com");

  await user.clear(phoneField);
  await user.type(phoneField, "0821234567");

  await user.click(genderButton);

  await user.clear(idField);
  await user.type(idField, "9001011234567");

  await user.clear(empField);
  await user.type(empField, "EMP001");

  await user.type(clinicField, "City");

  await waitFor(() => {
    expect(screen.getByText(/City Health Clinic/i)).toBeVisible();
  });

  await user.click(screen.getByText(/City Health Clinic/i));

  const fileInput = document.querySelector("input[type='file']");
  const file = new File(["cv content"], "cv.pdf", { type: "application/pdf" });
  await user.upload(fileInput, file);

  const submitButton = screen.getByRole("button", { name: "Submit Application" });
  await user.click(submitButton);
}




//navigate to page ...
async function navigateToApplyMode() {
  const user = userEvent.setup();
  const onSubmitted = vi.fn();
  const onBack = vi.fn();

  mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  mockQuery.or.mockReturnThis();
  mockQuery.limit.mockResolvedValue({
    data: [{ id: "clinic-01", name: "City Health Clinic", district: "Central", province: "Gauteng" }],
    error: null,
  });

  render(
    <Applications
      mode="apply"
      identity={defaultIdentity}
      selectedRole="staff"
      onSubmitted={onSubmitted}
      onBack={onBack}
    />
  );

  return { user, onSubmitted, onBack };
}

async function navigateToReviewMode(applications = [pendingApplication]) {
  const user = userEvent.setup();
  const onRoleUpdated = vi.fn();

  mockQuery.order.mockResolvedValue({ data: applications, error: null });

  render(
    <Applications
      mode="review"
      profile={adminProfile}
      onRoleUpdated={onRoleUpdated}
    />
  );

  await waitFor(() => {
    expect(screen.queryByText(/Loading applications/i)).not.toBeInTheDocument();
  });

  return { user, onRoleUpdated };
}




beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true }));
  global.alert = vi.fn();
});


//tests(describes)
describe("Apply mode - initial render", () => {
  beforeEach(async () => {
    await navigateToApplyMode();
  });

  openApplyModePage();
});


describe("Apply mode - pre-fills fields from identity", () => {
  beforeEach(async () => {
    await navigateToApplyMode();
  });

  it("Pre-fills name from identity", async () => {
    expect(screen.getByPlaceholderText("Jane")).toHaveValue("Jane");
  });

  it("Pre-fills surname from identity", async () => {
    expect(screen.getByPlaceholderText("Dlamini")).toHaveValue("Dlamini");
  });

  it("Pre-fills email from identity", async () => {
    expect(screen.getByPlaceholderText("jane@example.com")).toHaveValue("jane@example.com");
  });

  it("Pre-fills phone from identity", async () => {
    expect(screen.getByPlaceholderText("0821234567")).toHaveValue("0821234567");
  });
});


describe("Apply mode - Back button clicked", () => {
  it("Calls onBack callback", async () => {
    const { user, onBack } = await navigateToApplyMode();

    const backButton = screen.getByRole("button", { name: /← Back/i });
    await user.click(backButton);

    expect(onBack).toHaveBeenCalled();
  });
});


describe("Apply mode - gender selection", () => {
  beforeEach(async () => {
    await navigateToApplyMode();
  });

  it("Selects Male gender", async () => {
    const user = userEvent.setup();
    const maleButton = screen.getByRole("button", { name: "Male" });
    await user.click(maleButton);
    expect(maleButton).toHaveClass("app-gender-btn--active");
  });

  it("Selects Female gender", async () => {
    const user = userEvent.setup();
    const femaleButton = screen.getByRole("button", { name: "Female" });
    await user.click(femaleButton);
    expect(femaleButton).toHaveClass("app-gender-btn--active");
  });

  it("Selects Other gender", async () => {
    const user = userEvent.setup();
    const otherButton = screen.getByRole("button", { name: "Other" });
    await user.click(otherButton);
    expect(otherButton).toHaveClass("app-gender-btn--active");
  });
});


describe("Apply mode - clinic search", () => {
  beforeEach(async () => {
    await navigateToApplyMode();
  });

  it("Shows clinic results when typing in clinic field", async () => {
    const user = userEvent.setup();
    const clinicField = screen.getByPlaceholderText("Search clinic name");
    await user.type(clinicField, "City");

    await waitFor(() => {
      expect(screen.getByText(/City Health Clinic/i)).toBeVisible();
    });
  });

  it("Selects a clinic from search results", async () => {
    const user = userEvent.setup();
    const clinicField = screen.getByPlaceholderText("Search clinic name");
    await user.type(clinicField, "City");

    await waitFor(() => {
      expect(screen.getByText(/City Health Clinic/i)).toBeVisible();
    });

    await user.click(screen.getByText(/City Health Clinic/i));

    await waitFor(() => {
      expect(screen.getByText(/City Health Clinic/i)).toBeVisible();
    });
  });
});


describe("Apply mode - form validation errors", () => {
  beforeEach(async () => {
    await navigateToApplyMode();
  });

  it("Shows error when name is too short", async () => {
    const user = userEvent.setup();

    const nameField = screen.getByPlaceholderText("Jane");
    await user.clear(nameField);
    await user.type(nameField, "J");

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/First name must be at least 2 characters/i)).toBeVisible();
    });
  });

  it("Shows error when email is invalid", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailField);
    await user.type(emailField, "not-an-email");

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/Enter a valid email address/i)).toBeVisible();
    });
  });

  it("Shows error when phone number is invalid", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailField);
    await user.type(emailField, "jane@example.com");

    const phoneField = screen.getByPlaceholderText("0821234567");
    await user.clear(phoneField);
    await user.type(phoneField, "12345");

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/Enter a valid South African phone number/i)).toBeVisible();
    });
  });

  it("Shows error when ID number is not 13 digits", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailField);
    await user.type(emailField, "jane@example.com");

    const phoneField = screen.getByPlaceholderText("0821234567");
    await user.clear(phoneField);
    await user.type(phoneField, "0821234567");

    const genderButton = screen.getByRole("button", { name: "Female" });
    await user.click(genderButton);

    const idField = screen.getByPlaceholderText("13 digit ID number");
    await user.clear(idField);
    await user.type(idField, "123456");

    const empField = screen.getByPlaceholderText("Employee number");
    await user.clear(empField);
    await user.type(empField, "EMP001");

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/SA ID number must be exactly 13 digits/i)).toBeVisible();
    });
  });

  it("Shows error when no CV is uploaded", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailField);
    await user.type(emailField, "jane@example.com");

    const phoneField = screen.getByPlaceholderText("0821234567");
    await user.clear(phoneField);
    await user.type(phoneField, "0821234567");

    const genderButton = screen.getByRole("button", { name: "Female" });
    await user.click(genderButton);

    const idField = screen.getByPlaceholderText("13 digit ID number");
    await user.clear(idField);
    await user.type(idField, "9001011234567");

    const empField = screen.getByPlaceholderText("Employee number");
    await user.clear(empField);
    await user.type(empField, "EMP001");

    const clinicField = screen.getByPlaceholderText("Search clinic name");
    await user.type(clinicField, "City");
    await waitFor(() => screen.getByText(/City Health Clinic/i));
    await user.click(screen.getByText(/City Health Clinic/i));

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/Please upload your CV document/i)).toBeVisible();
    });
  });

  it("Shows error when no clinic is selected", async () => {
    const user = userEvent.setup();

    const emailField = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailField);
    await user.type(emailField, "jane@example.com");

    const phoneField = screen.getByPlaceholderText("0821234567");
    await user.clear(phoneField);
    await user.type(phoneField, "0821234567");

    const genderButton = screen.getByRole("button", { name: "Female" });
    await user.click(genderButton);

    const idField = screen.getByPlaceholderText("13 digit ID number");
    await user.clear(idField);
    await user.type(idField, "9001011234567");

    const empField = screen.getByPlaceholderText("Employee number");
    await user.clear(empField);
    await user.type(empField, "EMP001");

    const fileInput = document.querySelector("input[type='file']");
    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" });
    await user.upload(fileInput, file);

    const form = document.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText(/Please choose the clinic you work at/i)).toBeVisible();
    });
  });
});


describe("Apply mode - successful submission", () => {
  it("Calls Supabase upsert on valid submit", async () => {
    await navigateToApplyMode();
    await fillSubmitApplyForm();

    await waitFor(() => {
      expect(mockQuery.upsert).toHaveBeenCalled();
    });
  });

  it("Calls onSubmitted callback after successful submission", async () => {
    const { onSubmitted } = await navigateToApplyMode();
    await fillSubmitApplyForm();

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalled();
    });
  });

  it("Uploads CV to Supabase storage on submit", async () => {
    await navigateToApplyMode();
    await fillSubmitApplyForm();

    await waitFor(() => {
      expect(mockStorageUpload).toHaveBeenCalled();
    });
  });

  it("Sends email notification after successful submission", async () => {
    await navigateToApplyMode();
    await fillSubmitApplyForm();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notify/application/send-email"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});


describe("Review mode - no profile loaded", () => {
  it("Shows fallback message when profile is null", async () => {
    render(<Applications mode="review" profile={null} />);
    expect(screen.getByText(/No profile loaded/i)).toBeVisible();
  });
});


describe("Review mode - loading applications", () => {
  beforeEach(async () => {
    await navigateToReviewMode();
  });

  openReviewModePage();
});


describe("Review mode - application card renders", () => {
  beforeEach(async () => {
    await navigateToReviewMode([pendingApplication]);
  });

  openApplicationCard();
});


describe("Review mode - empty applications list", () => {
  it("Shows no applications message when list is empty", async () => {
    await navigateToReviewMode([]);

    await waitFor(() => {
      expect(screen.getByText(/No applications found/i)).toBeVisible();
    });
  });
});


describe("Review mode - Refresh button clicked", () => {
  it("Re-fetches applications from Supabase", async () => {
    const { user } = await navigateToReviewMode();

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockQuery.order).toHaveBeenCalledTimes(2);
    });
  });
});


describe("Review mode - Approve button clicked", () => {
  it("Updates application status to approved in Supabase", async () => {
    mockQuery.maybeSingle.mockResolvedValue({ data: { id: "profile-123" }, error: null });
    mockQuery.update.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    });

    const { user } = await navigateToReviewMode([pendingApplication]);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  it("Sends approval email notification", async () => {
    mockQuery.maybeSingle.mockResolvedValue({ data: { id: "profile-123" }, error: null });
    mockQuery.update.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    });

    const { user } = await navigateToReviewMode([pendingApplication]);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notify/application/send-email"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("approved"),
        })
      );
    });
  });
});


describe("Review mode - Reject button clicked", () => {
  it("Updates application status to rejected in Supabase", async () => {
    mockQuery.update.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    });

    const { user } = await navigateToReviewMode([pendingApplication]);

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  it("Sends rejection email notification", async () => {
    mockQuery.update.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    });

    const { user } = await navigateToReviewMode([pendingApplication]);

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/notify/application/send-email"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("rejected"),
        })
      );
    });
  });
});


describe("Review mode - approved/rejected applications hide action buttons", () => {
  it("Does not render Approve/Reject buttons for an approved application", async () => {
    await navigateToReviewMode([{ ...pendingApplication, status: "approved" }]);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });

  it("Does not render Approve/Reject buttons for a rejected application", async () => {
    await navigateToReviewMode([{ ...pendingApplication, status: "rejected" }]);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });
});


describe("Review mode - CV link renders", () => {
  it("Renders a link to the CV document", async () => {
    await navigateToReviewMode([pendingApplication]);

    await waitFor(() => {
      const cvLink = screen.getByRole("link", { name: /View submitted CV/i });
      expect(cvLink).toBeVisible();
      expect(cvLink).toHaveAttribute("href", "https://storage.example.com/cv.pdf");
    });
  });
});