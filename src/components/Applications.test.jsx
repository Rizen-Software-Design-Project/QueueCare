import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

const { mockFrom, mockSelect, mockEq, mockOrder, mockMaybeSingle, mockUpsert, mockUpdate, mockInsert, mockSingle, mockLimit, mockOr, mockQuery } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockOrder = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockUpsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockSingle = vi.fn();
  const mockLimit = vi.fn();
  const mockOr = vi.fn();

  const mockQuery = {
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    maybeSingle: mockMaybeSingle,
    upsert: mockUpsert,
    update: mockUpdate,
    insert: mockInsert,
    single: mockSingle,
    limit: mockLimit,
    or: mockOr,
  };

  // Make all chainable
  for (const fn of [mockSelect, mockEq, mockOrder, mockLimit, mockOr]) {
    fn.mockReturnValue(mockQuery);
  }
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockUpdate.mockReturnValue(mockQuery);
  mockInsert.mockReturnValue(mockQuery);

  const mockFrom = vi.fn(() => mockQuery);

  return { mockFrom, mockSelect, mockEq, mockOrder, mockMaybeSingle, mockUpsert, mockUpdate, mockInsert, mockSingle, mockLimit, mockOr, mockQuery };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import Applications from "./Applications";

const mockAdminProfile = {
  id: "admin-1",
  name: "Admin",
  surname: "User",
  email: "admin@test.com",
  role: "admin",
};

const mockApplications = [
  {
    id: 101,
    name: "Jane",
    surname: "Dlamini",
    email: "jane@test.com",
    phone_number: "0821234567",
    sex: "female",
    dob: "1990-05-15",
    id_number: "9005150000000",
    professional_id: "EMP001",
    license_number: "LIC123",
    clinic_id: 1,
    clinic_name: "City Clinic",
    cv_url: "https://example.com/cv",
    motivation: "I love healthcare",
    requested_role: "staff",
    status: "pending",
    auth_provider: "firebase",
    provider_user_id: "uid-jane",
    submitted_at: "2026-01-15T10:00:00Z",
    reviewed_at: null,
  },
  {
    id: 102,
    name: "Mark",
    surname: "Approved",
    email: "mark@test.com",
    requested_role: "staff",
    status: "approved",
    submitted_at: "2026-01-10T08:00:00Z",
    reviewed_at: "2026-01-11T09:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Reset chain returns
  for (const fn of [mockSelect, mockEq, mockOrder, mockLimit, mockOr]) {
    fn.mockReturnValue(mockQuery);
  }
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockUpdate.mockReturnValue(mockQuery);
  mockInsert.mockReturnValue(mockQuery);
  mockFrom.mockReturnValue(mockQuery);
});

describe("Applications - Review Mode", () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: mockApplications, error: null });
  });

  it("renders title and loading state initially", () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);
    expect(screen.getByText("Role Applications")).toBeInTheDocument();
    expect(screen.getByText("Loading applications…")).toBeInTheDocument();
  });

  it("renders application cards after loading", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Dlamini")).toBeInTheDocument();
    });
    expect(screen.getByText("Mark Approved")).toBeInTheDocument();
  });

  it("shows status badges for applications", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("pending")).toBeInTheDocument();
    });
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("shows Approve and Reject buttons for pending applications", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("does not show action buttons for non-pending applications", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Dlamini")).toBeInTheDocument();
    });
    // Only one pair of Approve/Reject buttons (for the pending one)
    const approveButtons = screen.getAllByText("Approve");
    expect(approveButtons).toHaveLength(1);
  });

  it("shows application details", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    });
    expect(screen.getByText("City Clinic")).toBeInTheDocument();
    expect(screen.getByText("I love healthcare")).toBeInTheDocument();
    expect(screen.getByText("View CV")).toBeInTheDocument();
  });

  it("shows Refresh button", async () => {
    render(<Applications profile={mockAdminProfile} mode="review" />);
    expect(screen.getByText("Refreshing…")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });
  });

  it("shows empty state when no applications", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("No applications found.")).toBeInTheDocument();
    });
  });

  it("shows error when loading fails", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: "Load failed" } });
    render(<Applications profile={mockAdminProfile} mode="review" />);

    await waitFor(() => {
      expect(screen.getByText("Load failed")).toBeInTheDocument();
    });
  });

  it("shows no profile message when profile is null", () => {
    render(<Applications profile={null} mode="review" />);
    expect(screen.getByText("No profile loaded.")).toBeInTheDocument();
  });
});

describe("Applications - Apply Mode", () => {
  const identity = {
    auth_provider: "firebase",
    provider_user_id: "uid-test",
    name: "Test",
    surname: "User",
    email: "test@example.com",
    phone: "0820000000",
  };

  it("renders application form", () => {
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);
    expect(screen.getByText("Staff Application")).toBeInTheDocument();
    expect(screen.getByText("Complete your application for staff access.")).toBeInTheDocument();
  });

  it("pre-fills form from identity", () => {
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);
    expect(screen.getByPlaceholderText("Jane")).toHaveValue("Test");
    expect(screen.getByPlaceholderText("Dlamini")).toHaveValue("User");
    expect(screen.getByPlaceholderText("jane@example.com")).toHaveValue("test@example.com");
    expect(screen.getByPlaceholderText("0821234567")).toHaveValue("0820000000");
  });

  it("renders all form fields", () => {
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);
    expect(screen.getByPlaceholderText("13 digit ID number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Employee number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Professional license")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search clinic name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Paste your CV link")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Why are you applying for this role?")).toBeInTheDocument();
  });

  it("renders gender buttons", () => {
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("shows submit button", () => {
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);
    expect(screen.getByText("Submit Application")).toBeInTheDocument();
  });

  it("shows Back button when onBack is provided", () => {
    const onBack = vi.fn();
    render(<Applications mode="apply" identity={identity} selectedRole="staff" onBack={onBack} />);
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("calls onBack when Back button clicked", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<Applications mode="apply" identity={identity} selectedRole="staff" onBack={onBack} />);
    await user.click(screen.getByText("← Back"));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows error when submitting empty required fields", async () => {
    const user = userEvent.setup();
    const emptyIdentity = { auth_provider: "firebase", provider_user_id: "uid" };
    render(<Applications mode="apply" identity={emptyIdentity} selectedRole="staff" />);

    await user.click(screen.getByText("Submit Application"));

    await waitFor(() => {
      expect(screen.getByText("Enter your first name.")).toBeInTheDocument();
    });
  });

  it("validates SA ID number", async () => {
    const user = userEvent.setup();
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);

    // Fill required fields
    await user.click(screen.getByText("Female"));

    const idInput = screen.getByPlaceholderText("13 digit ID number");
    await user.type(idInput, "0000000000000");

    const empInput = screen.getByPlaceholderText("Employee number");
    await user.type(empInput, "EMP001");

    await user.click(screen.getByText("Submit Application"));

    await waitFor(() => {
      expect(screen.getByText("The SA ID number does not contain a valid date of birth.")).toBeInTheDocument();
    });
  });

  it("selects gender when clicking a gender button", async () => {
    const user = userEvent.setup();
    render(<Applications mode="apply" identity={identity} selectedRole="staff" />);

    await user.click(screen.getByText("Male"));
    // The button should now be "active" - we verify form state works by checking it doesn't show gender error on submit
    // (it will show a different error since other fields aren't filled)
    await user.click(screen.getByText("Submit Application"));

    await waitFor(() => {
      // Should NOT show "Please select a gender." since we selected one
      expect(screen.queryByText("Please select a gender.")).not.toBeInTheDocument();
    });
  });
});
