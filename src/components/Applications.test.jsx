import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import Applications from "./Applications";

const mockIdentity = {
  auth_provider: "firebase",
  provider_user_id: "test123",
  name: "",
  surname: "",
  email: "",
  phone: ""
};

const mockProfile = {
  id: "profile-123",
  role: "admin",
  name: "Admin User"
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  })),
}));

describe("Applications, Apply Mode", () => {
  beforeEach(() => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
  });

  it("Renders Staff Application heading", () => {
    expect(screen.getByText("Staff Application")).toBeVisible();
  });

  it("Renders First Name input field", () => {
    const firstNameInput = screen.getByPlaceholderText("Jane");
    expect(firstNameInput).toBeVisible();
  });

  it("Renders Surname input field", () => {
    const surnameInput = screen.getByPlaceholderText("Dlamini");
    expect(surnameInput).toBeVisible();
  });

  it("Renders Email input field", () => {
    const emailInput = screen.getByPlaceholderText("jane@example.com");
    expect(emailInput).toBeVisible();
  });

  it("Renders Phone Number input field", () => {
    const phoneInput = screen.getByPlaceholderText("0821234567");
    expect(phoneInput).toBeVisible();
  });

  it("Renders gender buttons", () => {
    expect(screen.getByRole("button", { name: "Male" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Female" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Other" })).toBeVisible();
  });

  it("Renders SA ID Number input field", () => {
    const idInput = screen.getByPlaceholderText("13 digit ID number");
    expect(idInput).toBeVisible();
  });

  it("Renders Employee Number input field", () => {
    const empInput = screen.getByPlaceholderText("Employee number");
    expect(empInput).toBeVisible();
  });

  it("Renders License Number input field", () => {
    const licenseInput = screen.getByPlaceholderText("Professional license");
    expect(licenseInput).toBeVisible();
  });

  it("Renders Clinic search input", () => {
    const clinicInput = screen.getByPlaceholderText("Search clinic name");
    expect(clinicInput).toBeVisible();
  });

  it("Renders CV Link input field", () => {
    const cvInput = screen.getByPlaceholderText("Paste your CV link");
    expect(cvInput).toBeVisible();
  });

  it("Renders Motivation textarea", () => {
    const motivationTextarea = screen.getByPlaceholderText("Why are you applying for this role?");
    expect(motivationTextarea).toBeVisible();
  });

  it("Renders Submit Application button", () => {
    expect(screen.getByRole("button", { name: "Submit Application" })).toBeVisible();
  });
});

describe("Applications, Apply Mode - Form interactions", () => {
  beforeEach(() => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
  });

  it("Allows typing in First Name field", async () => {
    const user = userEvent.setup();
    const firstNameInput = screen.getByPlaceholderText("Jane");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "John");
    expect(firstNameInput).toHaveValue("John");
  });

  it("Allows typing in Surname field", async () => {
    const user = userEvent.setup();
    const surnameInput = screen.getByPlaceholderText("Dlamini");
    await user.clear(surnameInput);
    await user.type(surnameInput, "Doe");
    expect(surnameInput).toHaveValue("Doe");
  });

  it("Allows typing in Email field", async () => {
    const user = userEvent.setup();
    const emailInput = screen.getByPlaceholderText("jane@example.com");
    await user.clear(emailInput);
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");
  });

  it("Allows typing in Phone Number field", async () => {
    const user = userEvent.setup();
    const phoneInput = screen.getByPlaceholderText("0821234567");
    await user.clear(phoneInput);
    await user.type(phoneInput, "0820000000");
    expect(phoneInput).toHaveValue("0820000000");
  });

  it("Selects gender when clicked", async () => {
    const user = userEvent.setup();
    const maleButton = screen.getByRole("button", { name: "Male" });
    await user.click(maleButton);
    expect(maleButton).toHaveStyle({ background: "#111", color: "#fff" });
  });

  it("Allows typing in ID Number field", async () => {
    const user = userEvent.setup();
    const idInput = screen.getByPlaceholderText("13 digit ID number");
    await user.type(idInput, "9001011234567");
    expect(idInput).toHaveValue("9001011234567");
  });
});

describe("Applications, Apply Mode - Validation", () => {
  it("Shows error when submitting without required fields", async () => {
    const user = userEvent.setup();
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
    
    const submitButton = screen.getByRole("button", { name: "Submit Application" });
    await user.click(submitButton);
    
    expect(screen.getByText(/Enter your first name/i)).toBeVisible();
  });
});

describe("Applications, Apply Mode - Back button", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" onBack={mockOnBack} />);
  });

  it("Renders Back button when onBack is provided", () => {
    expect(screen.getByRole("button", { name: "← Back" })).toBeVisible();
  });

  it("Calls onBack when Back button is clicked", async () => {
    const user = userEvent.setup();
    const backButton = screen.getByRole("button", { name: "← Back" });
    await user.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });
});

describe("Applications, Review Mode", () => {
  beforeEach(async () => {
    render(<Applications mode="review" profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.queryByText("Loading applications…")).not.toBeInTheDocument();
    });
  });

  it("Renders Role Applications heading", () => {
    expect(screen.getByText("Role Applications")).toBeVisible();
  });

  it("Renders Refresh button", () => {
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
  });
});

describe("Applications, Review Mode - Empty state", () => {
  beforeEach(async () => {
    render(<Applications mode="review" profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.queryByText("Loading applications…")).not.toBeInTheDocument();
    });
  });

  it("Shows no applications message", () => {
    expect(screen.getByText("No applications found.")).toBeVisible();
  });
});

describe("Applications, Review Mode - Loading state", () => {
  it("Shows loading message initially", () => {
    render(<Applications mode="review" profile={mockProfile} />);
    expect(screen.getByText("Loading applications…")).toBeVisible();
  });
});

describe("Applications, Review Mode - No profile", () => {
  it("Shows no profile loaded message", () => {
    render(<Applications mode="review" profile={null} />);
    expect(screen.getByText("No profile loaded.")).toBeVisible();
  });
});

describe("Applications, Responsive design", () => {
  beforeEach(() => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
  });

  it("Has wrapper div", () => {
    const wrapper = document.querySelector("div[style*='width: 100%']");
    expect(wrapper).toBeInTheDocument();
  });
});

describe("Applications, Icon rendering", () => {
  beforeEach(async () => {
    render(<Applications mode="review" profile={mockProfile} />);
    await waitFor(() => {
      expect(screen.queryByText("Loading applications…")).not.toBeInTheDocument();
    });
  });

  it("Renders refresh button", () => {
    const refreshButton = screen.getByRole("button", { name: "Refresh" });
    expect(refreshButton).toBeInTheDocument();
  });
});

describe("Applications, Apply Mode - Clinic search", () => {
  beforeEach(() => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
  });

  it("Clinic search input accepts typing", async () => {
    const user = userEvent.setup();
    const clinicInput = screen.getByPlaceholderText("Search clinic name");
    await user.type(clinicInput, "Tygerberg");
    expect(clinicInput).toHaveValue("Tygerberg");
  });
});

describe("Applications, Apply Mode - Form submission", () => {
  it("Submit button is not disabled initially", async () => {
    render(<Applications mode="apply" identity={mockIdentity} selectedRole="staff" />);
    
    const submitButton = screen.getByRole("button", { name: "Submit Application" });
    expect(submitButton).not.toBeDisabled();
  });
});