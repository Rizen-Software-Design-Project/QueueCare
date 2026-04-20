import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

const { mockRpc, mockSelect, mockOrder, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
  })),
}));

vi.mock("react-icons/fi", () => ({
  FiGrid: () => "FiGrid",
  FiUsers: () => "FiUsers",
  FiRefreshCw: () => "FiRefreshCw",
  FiTrash2: () => "FiTrash2",
  FiCreditCard: () => "FiCreditCard",
  FiMap: () => "FiMap",
  FiSearch: () => "FiSearch",
  FiClock: () => "FiClock",
  FiCalendar: () => "FiCalendar",
  FiHash: () => "FiHash",
  FiBell: () => "FiBell",
  FiUser: () => "FiUser",
  FiSettings: () => "FiSettings",
  FiFileText: () => "FiFileText",
  FiLogOut: () => "FiLogOut",
  FiMapPin: () => "FiMapPin",
}));

vi.mock("react-icons/fa", () => ({
  FaHospital: () => "FaHospital",
}));

import AdminStaff from "./AdminStaff";

const mockStaff = [
  {
    profile_id: "p1",
    name: "Alice",
    surname: "Smith",
    email: "alice@test.com",
    phone_number: "0821111111",
    facility_id: 1,
    facility_name: "City Clinic",
    staff_role: "nurse",
  },
  {
    profile_id: "p2",
    name: "Bob",
    surname: "Jones",
    email: "bob@test.com",
    phone_number: null,
    facility_id: null,
    facility_name: null,
    staff_role: null,
  },
];

const mockFacilities = [
  { id: 1, name: "City Clinic" },
  { id: 2, name: "Town Hospital" },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("userIdentity", JSON.stringify({
    auth_provider: "firebase",
    provider_user_id: "admin-uid",
  }));

  mockOrder.mockResolvedValue({ data: mockFacilities, error: null });
  mockSelect.mockReturnValue({ order: mockOrder });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockRpc.mockImplementation((fnName) => {
    if (fnName === "get_staff_with_assignments") {
      return Promise.resolve({ data: mockStaff, error: null });
    }
    if (fnName === "assign_staff_to_facility") {
      return Promise.resolve({ data: { success: true }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
});

describe("AdminStaff", () => {
  it("renders title and staff cards after loading", async () => {
    render(<AdminStaff />);
    expect(screen.getByText("Loading staff...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows contact info for staff members", async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    });
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });

  it("shows assigned facility for assigned staff", async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText(/City Clinic/)).toBeInTheDocument();
    });
    expect(screen.getByText(/nurse/i)).toBeInTheDocument();
  });

  it("shows Unassigned for staff without facility", async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("Unassigned")).toBeInTheDocument();
    });
  });

  it("shows Reassign button for assigned staff and Assign for unassigned", async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("🔄 Reassign")).toBeInTheDocument();
    });
    expect(screen.getByText("➕ Assign")).toBeInTheDocument();
  });

  it("shows Remove button only for assigned staff", async () => {
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });
    const removeButtons = screen.getAllByText(/Remove/);
    expect(removeButtons).toHaveLength(1);
  });

  it("opens assign modal when clicking Assign button", async () => {
    const user = userEvent.setup();
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("➕ Assign")).toBeInTheDocument();
    });

    await user.click(screen.getByText("➕ Assign"));
    expect(screen.getByText("Assign Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Select a facility...")).toBeInTheDocument();
    expect(screen.getByText("Select a role...")).toBeInTheDocument();
  });

  it("opens reassign modal with pre-filled values", async () => {
    const user = userEvent.setup();
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("🔄 Reassign")).toBeInTheDocument();
    });

    await user.click(screen.getByText("🔄 Reassign"));
    expect(screen.getByText("Assign Alice Smith")).toBeInTheDocument();
  });

  it("closes modal when clicking Cancel", async () => {
    const user = userEvent.setup();
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("➕ Assign")).toBeInTheDocument();
    });

    await user.click(screen.getByText("➕ Assign"));
    expect(screen.getByText("Assign Bob Jones")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText("Assign Bob Jones")).not.toBeInTheDocument();
    });
  });

  it("shows error when saving without facility and role", async () => {
    const user = userEvent.setup();
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("➕ Assign")).toBeInTheDocument();
    });

    await user.click(screen.getByText("➕ Assign"));
    await user.click(screen.getByText("Save assignment"));

    await waitFor(() => {
      expect(screen.getByText("Select a facility and role.")).toBeInTheDocument();
    });
  });

  it("saves assignment successfully", async () => {
    const user = userEvent.setup();
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("➕ Assign")).toBeInTheDocument();
    });

    await user.click(screen.getByText("➕ Assign"));

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "1");
    await user.selectOptions(selects[1], "doctor");

    await user.click(screen.getByText("Save assignment"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("assign_staff_to_facility", expect.objectContaining({
        p_profile_id: "p2",
        p_facility_id: 1,
        p_role: "doctor",
      }));
    });
  });

  it("handles load error gracefully", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "Network error" } });
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows no staff message when list is empty", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    render(<AdminStaff />);
    await waitFor(() => {
      expect(screen.getByText("No staff members found.")).toBeInTheDocument();
    });
  });
});
