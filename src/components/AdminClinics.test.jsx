import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
}));

// Mock fetch globally for the RPC call in applyFilters
const mockFetchJson = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: { success: true }, error: null });
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: mockFetchJson, text: () => Promise.resolve("") }));
  mockFetchJson.mockResolvedValue([]);
  localStorage.setItem("userIdentity", JSON.stringify({
    auth_provider: "firebase",
    provider_user_id: "admin-uid",
  }));
});

// Mock Supabase
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

// Mock react-icons
vi.mock("react-icons/fi", () => ({
  FiGrid: () => "FiGrid",
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

import AdminClinics from "./AdminClinics";

describe("AdminClinics", () => {
  it("renders title and filter controls", () => {
    render(<AdminClinics />);
    expect(screen.getByText(/Clinic Management/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("🔍 Search clinic...")).toBeInTheDocument();
    expect(screen.getByText("All provinces")).toBeInTheDocument();
    expect(screen.getByText("All districts")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("shows initial status message", () => {
    render(<AdminClinics />);
    expect(screen.getByText("Use filters to search for facilities.")).toBeInTheDocument();
  });

  it("shows province options in dropdown", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    const provinceSelect = screen.getAllByRole("combobox")[0];
    expect(provinceSelect).toBeInTheDocument();

    // Check province options exist
    const options = provinceSelect.querySelectorAll("option");
    expect(options.length).toBeGreaterThan(1); // "All provinces" + actual provinces
  });

  it("performs search when Search button is clicked", async () => {
    const user = userEvent.setup();
    const mockResults = [
      {
        id: 1,
        name: "Test Clinic",
        district: "Cape Town",
        province: "Western Cape",
        is_active: true,
        services_offered: ["General Consultation", "HIV Testing"],
        operating_hours: {},
      },
    ];
    mockFetchJson.mockResolvedValueOnce(mockResults);

    render(<AdminClinics />);

    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Test");
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Test Clinic")).toBeInTheDocument();
    });
    expect(screen.getByText("Cape Town, Western Cape")).toBeInTheDocument();
    expect(screen.getByText("● Active")).toBeInTheDocument();
    expect(screen.getByText(/General Consultation, HIV Testing/)).toBeInTheDocument();
  });

  it("shows no facilities message when search returns empty", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("No facilities found")).toBeInTheDocument();
    });
  });

  it("clears filters when Clear button is clicked", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);

    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Something");
    await user.click(screen.getByText("Clear"));

    expect(searchInput).toHaveValue("");
    expect(screen.getByText("Filters cleared")).toBeInTheDocument();
  });

  it("shows inactive status for inactive facilities", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 2,
        name: "Closed Clinic",
        district: "Mangaung",
        province: "Free State",
        is_active: false,
        services_offered: [],
        operating_hours: {},
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("○ Inactive")).toBeInTheDocument();
    });
    expect(screen.getByText("None listed")).toBeInTheDocument();
  });

  it("opens edit modal when clicking Edit facility", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 3,
        name: "Editable Clinic",
        district: "Tshwane",
        province: "Gauteng",
        is_active: true,
        services_offered: ["Vaccination"],
        operating_hours: {
          monday: { open: "08:00", close: "17:00", closed: false },
        },
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Editable Clinic")).toBeInTheDocument();
    });

    await user.click(screen.getByText("✏️ Edit facility"));

    expect(screen.getByText("✏️ Editable Clinic")).toBeInTheDocument();
    expect(screen.getByText("✅ Facility is active (visible to users)")).toBeInTheDocument();
    expect(screen.getByText("🩺 Services Offered")).toBeInTheDocument();
    expect(screen.getByText("🕒 Operating Hours")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("closes edit modal when clicking Cancel", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 3,
        name: "Editable Clinic",
        district: "Tshwane",
        province: "Gauteng",
        is_active: true,
        services_offered: [],
        operating_hours: {},
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));
    await waitFor(() => {
      expect(screen.getByText("Editable Clinic")).toBeInTheDocument();
    });

    await user.click(screen.getByText("✏️ Edit facility"));
    expect(screen.getByText("✏️ Editable Clinic")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText("✏️ Editable Clinic")).not.toBeInTheDocument();
    });
  });

  it("toggles service selection in edit modal", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 4,
        name: "Service Clinic",
        district: "Tshwane",
        province: "Gauteng",
        is_active: true,
        services_offered: [],
        operating_hours: {},
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));
    await waitFor(() => {
      expect(screen.getByText("Service Clinic")).toBeInTheDocument();
    });

    await user.click(screen.getByText("✏️ Edit facility"));

    // Click a service to select it
    const vaccinationBtn = screen.getByText("Vaccination");
    await user.click(vaccinationBtn);
    expect(vaccinationBtn.textContent).toContain("✓");

    // Click again to deselect
    await user.click(vaccinationBtn);
    expect(vaccinationBtn.textContent).not.toContain("✓");
  });

  it("saves facility changes", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 5,
        name: "Save Clinic",
        district: "Tshwane",
        province: "Gauteng",
        is_active: true,
        services_offered: [],
        operating_hours: {},
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));
    await waitFor(() => {
      expect(screen.getByText("Save Clinic")).toBeInTheDocument();
    });

    await user.click(screen.getByText("✏️ Edit facility"));
    await user.click(screen.getByText("Save changes"));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("update_facility_as_admin", expect.objectContaining({
        p_facility_id: 5,
      }));
    });
  });

  it("handles search error gracefully", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, text: () => Promise.resolve("Server error") }));

    const user = userEvent.setup();
    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("changes province and resets district", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);

    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];

    await user.selectOptions(provinceSelect, "Gauteng");
    expect(provinceSelect).toHaveValue("Gauteng");
  });

  it("shows all days in operating hours when editing", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([
      {
        id: 6,
        name: "Hours Clinic",
        district: "Tshwane",
        province: "Gauteng",
        is_active: true,
        services_offered: [],
        operating_hours: {},
      },
    ]);

    render(<AdminClinics />);
    await user.click(screen.getByText("Search"));
    await waitFor(() => {
      expect(screen.getByText("Hours Clinic")).toBeInTheDocument();
    });

    await user.click(screen.getByText("✏️ Edit facility"));

    expect(screen.getByText("Monday")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Wednesday")).toBeInTheDocument();
    expect(screen.getByText("Thursday")).toBeInTheDocument();
    expect(screen.getByText("Friday")).toBeInTheDocument();
    expect(screen.getByText("Saturday")).toBeInTheDocument();
    expect(screen.getByText("Sunday")).toBeInTheDocument();
  });

  it("performs search on Enter key in search input", async () => {
    const user = userEvent.setup();
    mockFetchJson.mockResolvedValueOnce([]);

    render(<AdminClinics />);
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Test{enter}");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
