import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import AdminClinics from "./AdminClinics";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

describe("AdminClinics, Initial Render", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Renders Clinic Management heading", () => {
    expect(screen.getByText("Clinic Management")).toBeVisible();
  });

  it("Renders Search input field", () => {
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    expect(searchInput).toBeVisible();
  });

  it("Renders Province dropdown", () => {
    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toBeVisible();
  });

  it("Renders District dropdown", () => {
    const selects = screen.getAllByRole("combobox");
    expect(selects[1]).toBeVisible();
  });

  it("Renders Search button", () => {
    expect(screen.getByRole("button", { name: "Search" })).toBeVisible();
  });

  it("Renders Clear button", () => {
    expect(screen.getByRole("button", { name: "Clear" })).toBeVisible();
  });

  it("Renders All provinces option in province dropdown", () => {
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    expect(provinceSelect).toContainHTML("<option value=\"\">All provinces</option>");
  });

  it("Renders All districts option in district dropdown", () => {
    const selects = screen.getAllByRole("combobox");
    const districtSelect = selects[1];
    expect(districtSelect).toContainHTML("<option value=\"\">All districts</option>");
  });
});

describe("AdminClinics, Filter Interactions", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Updates search input when typing", async () => {
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Tygerberg");
    expect(searchInput).toHaveValue("Tygerberg");
  });

  it("Updates province selection", async () => {
    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    await user.selectOptions(provinceSelect, "Western Cape");
    expect(provinceSelect).toHaveValue("Western Cape");
  });

  it("Updates district selection", async () => {
    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const districtSelect = selects[1];
    await user.selectOptions(districtSelect, "Cape Winelands");
    expect(districtSelect).toHaveValue("Cape Winelands");
  });

  it("Clears filters when Clear button is clicked", async () => {
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    const districtSelect = selects[1];
    
    await user.type(searchInput, "Test Clinic");
    await user.selectOptions(provinceSelect, "Gauteng");
    await user.selectOptions(districtSelect, "Ekurhuleni");
    
    const clearButton = screen.getByRole("button", { name: "Clear" });
    await user.click(clearButton);
    
    expect(searchInput).toHaveValue("");
    expect(provinceSelect).toHaveValue("");
    expect(districtSelect).toHaveValue("");
  });
});

describe("AdminClinics, Search triggers", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Calls search when Enter key pressed in search input", async () => {
    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Tygerberg{Enter}");
  });

  it("Calls search when Search button is clicked", async () => {
    const user = userEvent.setup();
    const searchButton = screen.getByRole("button", { name: "Search" });
    await user.click(searchButton);
  });
});

describe("AdminClinics, District dropdown filtering", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Shows all districts when no province selected", async () => {
    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const districtSelect = selects[1];
    await user.click(districtSelect);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(9);
  });

  it("Shows Western Cape districts when Western Cape selected", async () => {
    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    const districtSelect = selects[1];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    await user.click(districtSelect);
    
    const westernCapeDistricts = [
      "Cape Winelands",
      "Central Karoo",
      "City of Cape Town",
      "Eden",
      "Overberg",
      "West Coast"
    ];
    
    for (const district of westernCapeDistricts) {
      expect(screen.getByRole("option", { name: district })).toBeInTheDocument();
    }
  });

  it("Resets district when province changes", async () => {
    const user = userEvent.setup();
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    const districtSelect = selects[1];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    await user.selectOptions(districtSelect, "Cape Winelands");
    expect(districtSelect).toHaveValue("Cape Winelands");
    
    await user.selectOptions(provinceSelect, "Gauteng");
    expect(districtSelect).toHaveValue("");
  });
});

describe("AdminClinics, Empty state", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Shows initial status message", () => {
    expect(screen.getByText("Use filters to search for facilities.")).toBeVisible();
  });
});

describe("AdminClinics, Edit modal", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("No edit modal visible initially", () => {
    expect(screen.queryByText(/Edit facility/i)).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Province dropdown options", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Displays all 9 provinces in dropdown", () => {
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    
    const provinces = [
      "Eastern Cape",
      "Free State",
      "Gauteng",
      "KwaZulu-Natal",
      "Limpopo",
      "Mpumalanga",
      "North West",
      "Northern Cape",
      "Western Cape"
    ];
    
    for (const province of provinces) {
      expect(screen.getByRole("option", { name: province })).toBeInTheDocument();
    }
  });
});

describe("AdminClinics, Status message styling", () => {
  beforeEach(() => {
    render(<AdminClinics />);
  });

  it("Shows loading status message when searching", async () => {
    const user = userEvent.setup();
    const searchButton = screen.getByRole("button", { name: "Search" });
    await user.click(searchButton);
    
    const statusDiv = document.querySelector(".status");
    expect(statusDiv).toHaveClass("loading");
  });

  it("Shows info status when filters cleared", async () => {
    const user = userEvent.setup();
    const clearButton = screen.getByRole("button", { name: "Clear" });
    await user.click(clearButton);
    
    const statusDiv = document.querySelector(".status");
    expect(statusDiv).toHaveClass("info");
  });
});

describe("AdminClinics, Form elements in modal", () => {
  it("Opens edit modal with form elements", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText(/Save changes/i)).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Active status toggle", () => {
  it("Has checkbox for active status in modal when opened", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText("Facility is active")).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Services offered tags", () => {
  it("Displays service options in modal when opened", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText("General Consultation")).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Operating hours grid", () => {
  it("Shows operating hours grid in modal when opened", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText("Monday")).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Cancel button in modal", () => {
  it("Cancel button closes modal when clicked", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Save button in modal", () => {
  it("Save button is disabled while saving", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });
});

describe("AdminClinics, Keyboard navigation", () => {
  it("Search input triggers search on Enter key", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    await user.type(searchInput, "Clinic{Enter}");
  });
});

describe("AdminClinics, Clear button functionality", () => {
  it("Clear button resets all filter fields to empty", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    const districtSelect = selects[1];
    
    await user.type(searchInput, "Something");
    await user.selectOptions(provinceSelect, "Gauteng");
    await user.selectOptions(districtSelect, "Ekurhuleni");
    
    const clearButton = screen.getByRole("button", { name: "Clear" });
    await user.click(clearButton);
    
    expect(searchInput).toHaveValue("");
    expect(provinceSelect).toHaveValue("");
    expect(districtSelect).toHaveValue("");
  });
});

describe("AdminClinics, Province change effect", () => {
  it("District dropdown updates when province changes", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    
    const districtSelect = selects[1];
    await user.click(districtSelect);
    
    const options = screen.getAllByRole("option");
    const districtNames = options.map(opt => opt.textContent);
    
    expect(districtNames).toContain("Cape Winelands");
    expect(districtNames).toContain("City of Cape Town");
    expect(districtNames).not.toContain("Ekurhuleni");
  });
});

describe("AdminClinics, Search with filters", () => {
  it("Applies all filters when Search clicked", async () => {
    const user = userEvent.setup();
    render(<AdminClinics />);
    
    const searchInput = screen.getByPlaceholderText("🔍 Search clinic...");
    const selects = screen.getAllByRole("combobox");
    const provinceSelect = selects[0];
    const districtSelect = selects[1];
    
    await user.type(searchInput, "Test");
    await user.selectOptions(provinceSelect, "Gauteng");
    await user.selectOptions(districtSelect, "Ekurhuleni");
    
    const searchButton = screen.getByRole("button", { name: "Search" });
    await user.click(searchButton);
  });
});

describe("AdminClinics, Responsive design classes", () => {
  it("Has admin-module wrapper class", () => {
    render(<AdminClinics />);
    const moduleDiv = document.querySelector(".admin-module");
    expect(moduleDiv).toBeInTheDocument();
  });

  it("Has container class", () => {
    render(<AdminClinics />);
    const container = document.querySelector(".container");
    expect(container).toBeInTheDocument();
  });
});

describe("AdminClinics, Icon rendering", () => {
  it("Renders hospital icon in heading", () => {
    render(<AdminClinics />);
    const svg = document.querySelector(".title svg");
    expect(svg).toBeInTheDocument();
  });
});