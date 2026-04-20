import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import AdminStaff from "./AdminStaff";

const mockStaff = [
  {
    profile_id: 1,
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    phone_number: null,
    facility_name: "Tygerberg Clinic",
    staff_role: "doctor",
    facility_id: 1,
    assignment_id: 1
  },
  {
    profile_id: 2,
    name: "Jane",
    surname: "Smith",
    email: "jane@example.com",
    phone_number: null,
    facility_name: null,
    staff_role: null,
    facility_id: null,
    assignment_id: null
  }
];

const mockFacilities = [
  { id: 1, name: "Tygerberg Clinic" },
  { id: 2, name: "Groote Schuur Hospital" }
];

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn().mockImplementation((method) => {
      if (method === "get_staff_with_assignments") {
        return Promise.resolve({ data: mockStaff, error: null });
      }
      if (method === "assign_staff_to_facility") {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      if (method === "remove_staff_from_facility") {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockFacilities, error: null })
    })),
  })),
}));

beforeEach(() => {
  localStorage.setItem("userIdentity", JSON.stringify({
    auth_provider: "firebase",
    provider_user_id: "test123"
  }));
  vi.clearAllMocks();
});

describe("AdminClinics, Initial Render", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Renders Staff Management heading", () => {
    expect(screen.getByText("Staff Management")).toBeVisible();
  });

  it("Renders staff names", () => {
    expect(screen.getByText("John Doe")).toBeVisible();
    expect(screen.getByText("Jane Smith")).toBeVisible();
  });

  it("Shows assigned facility for assigned staff", () => {
    expect(screen.getByText("Tygerberg Clinic")).toBeVisible();
  });

  it("Shows Unassigned for unassigned staff", () => {
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
  });

  it("Shows role for assigned staff", () => {
    expect(screen.getByText("doctor")).toBeVisible();
  });
});

describe("AdminClinics, Buttons", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Displays Reassign button for assigned staff", () => {
    const reassignButtons = screen.getAllByText("🔄 Reassign");
    expect(reassignButtons.length).toBeGreaterThan(0);
  });

  it("Displays Remove button for assigned staff", () => {
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it("Displays Assign button for unassigned staff", () => {
    const assignButtons = screen.getAllByText("➕ Assign");
    expect(assignButtons.length).toBeGreaterThan(0);
  });
});

describe("AdminClinics, Modal functionality", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Opens assign modal when Assign button is clicked", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    expect(screen.getByText(/Assign Jane Smith/i)).toBeVisible();
  });

  it("Opens reassign modal when Reassign button is clicked", async () => {
    const user = userEvent.setup();
    const reassignButtons = screen.getAllByText("🔄 Reassign");
    await user.click(reassignButtons[0]);
    
    expect(screen.getByText(/Assign John Doe/i)).toBeVisible();
  });

  it("Closes modal when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);
    
    expect(screen.queryByText(/Assign Jane Smith/i)).not.toBeInTheDocument();
  });

  it("Displays facility options in dropdown", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const facilitySelect = selects[0];
    await user.click(facilitySelect);
    
    expect(screen.getByRole("option", { name: "Tygerberg Clinic" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Groote Schuur Hospital" })).toBeVisible();
  });

  it("Displays role options in dropdown", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[1];
    await user.click(roleSelect);
    
    expect(screen.getByRole("option", { name: "Doctor" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Nurse" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Receptionist" })).toBeVisible();
    expect(screen.getByRole("option", { name: "Admin" })).toBeVisible();
  });
});

describe("AdminClinics, Validation", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Shows error when saving without facility", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[1];
    await user.selectOptions(roleSelect, "doctor");
    
    const saveButton = screen.getByText("Save assignment");
    await user.click(saveButton);
    
    expect(screen.getByText("Select a facility and role.")).toBeVisible();
  });

  it("Shows error when saving without role", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const facilitySelect = selects[0];
    await user.selectOptions(facilitySelect, "1");
    
    const saveButton = screen.getByText("Save assignment");
    await user.click(saveButton);
    
    expect(screen.getByText("Select a facility and role.")).toBeVisible();
  });
});

describe("AdminClinics, Remove confirmation", () => {
  beforeEach(async () => {
    window.confirm = vi.fn(() => true);
    
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Shows confirm dialog when Remove button is clicked", async () => {
    const user = userEvent.setup();
    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
  });
});

describe("AdminClinics, Form field updates", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Facility select updates value when changed", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const facilitySelect = selects[0];
    await user.selectOptions(facilitySelect, "2");
    
    expect(facilitySelect).toHaveValue("2");
  });

  it("Role select updates value when changed", async () => {
    const user = userEvent.setup();
    const assignButtons = screen.getAllByText("➕ Assign");
    await user.click(assignButtons[0]);
    
    const selects = screen.getAllByRole("combobox");
    const roleSelect = selects[1];
    await user.selectOptions(roleSelect, "nurse");
    
    expect(roleSelect).toHaveValue("nurse");
  });
});

describe("AdminClinics, Loading state", () => {
  it("Shows loading state initially", () => {
    render(<AdminStaff />);
    expect(screen.getByText("Loading staff...")).toBeVisible();
  });
});

describe("AdminClinics, Responsive design", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Has staff-module wrapper class", () => {
    const moduleDiv = document.querySelector(".staff-module");
    expect(moduleDiv).toBeInTheDocument();
  });

  it("Has container class", () => {
    const container = document.querySelector(".container");
    expect(container).toBeInTheDocument();
  });
});

describe("AdminClinics, Icon rendering", () => {
  beforeEach(async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.queryByText("Loading staff...")).not.toBeInTheDocument();
    });
  });

  it("Renders users icon in heading", () => {
    const svg = document.querySelector(".title svg");
    expect(svg).toBeInTheDocument();
  });
});