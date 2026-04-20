import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ClinicSearch from "./Clinic_search";


//mocks
//clinic miocks
//helpers
//tests


//mocks
const mockFetch = vi.fn();
global.fetch = mockFetch;


class MockMap {
  constructor(element, options) {
    this.element = element;
    this.options = options;
    this.setCenter = vi.fn();
    this.setZoom = vi.fn();
    this.fitBounds = vi.fn();
  }
}

class MockLatLngBounds {
  constructor() {
    this.extend = vi.fn();
  }
}

class MockMarker {
  constructor(options) {
    this.options = options;
    this.setMap = vi.fn();
    this.addListener = vi.fn();
  }
}

class MockInfoWindow {
  constructor() {
    this.setContent = vi.fn();
    this.open = vi.fn();
  }
}

class MockSize {
  constructor(w, h) {
    this.width = w;
    this.height = h;
  }
}

const mockGoogleMaps = {
  maps: {
    Map: MockMap,
    LatLngBounds: MockLatLngBounds,
    Marker: MockMarker,
    InfoWindow: MockInfoWindow,
    Size: MockSize,
    SymbolPath: { CIRCLE: "circle" },
  },
};

window.google = mockGoogleMaps;


const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};
global.navigator.geolocation = mockGeolocation;


const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});



//clinic mocks
const mockClinics = [
  {
    id: "1",
    name: "Tygerberg Clinic",
    district: "Cape Winelands",
    province: "Western Cape",
    latitude: "-33.9386",
    longitude: "18.6296",
    distance: 5.2,
  },
  {
    id: "2",
    name: "Groote Schuur Hospital",
    district: "City of Cape Town",
    province: "Western Cape",
    latitude: "-33.9396",
    longitude: "18.6306",
    distance: 12.5,
  },
];




//helpers
async function waitForComponent() {
  await waitFor(() => {
    expect(screen.getByText(/South African Clinics/i)).toBeInTheDocument();
  }, { timeout: 3000 });
}



beforeEach(() => {
  mockFetch.mockReset();
  mockGeolocation.getCurrentPosition.mockReset();
  mockNavigate.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => [],
  });
});





//tests
describe("ClinicSearch - Initial Render", () => {
  beforeEach(async () => {
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Renders the main heading", async () => {
    expect(screen.getByText(/South African Clinics/i)).toBeVisible();
  });

  it("Renders Clinic name input field", async () => {
    const nameInput = screen.getByPlaceholderText(/e.g., Tygerberg/i);
    expect(nameInput).toBeVisible();
    expect(nameInput).toHaveAttribute("type", "text");
  });

  it("Renders Province dropdown", async () => {
    const provinceSelect = screen.getAllByRole("combobox")[0];
    expect(provinceSelect).toBeVisible();
  });

  it("Renders District dropdown", async () => {
    const districtSelect = screen.getAllByRole("combobox")[1];
    expect(districtSelect).toBeVisible();
  });

  it("Renders Apply filters button", async () => {
    expect(screen.getByRole("button", { name: /Apply filters/i })).toBeVisible();
  });

  it("Renders Clinics Near Me button", async () => {
    expect(screen.getByRole("button", { name: /Clinics Near Me/i })).toBeVisible();
  });

  it("Renders radius dropdown", async () => {
    const radiusSelect = screen.getAllByRole("combobox")[2];
    expect(radiusSelect).toBeVisible();
  });

  it("Renders map container", async () => {
    const mapDiv = document.getElementById("map");
    expect(mapDiv).toBeInTheDocument();
  });
});






describe("ClinicSearch, Filter interactions", () => {
  beforeEach(async () => {
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Updates name search when typing", async () => {
    const user = userEvent.setup();
    const nameInput = screen.getByPlaceholderText(/e.g., Tygerberg/i);
    
    await user.type(nameInput, "Tygerberg");
    
    expect(nameInput).toHaveValue("Tygerberg");
  });

  it("Updates province selection", async () => {
    const user = userEvent.setup();
    const provinceSelect = screen.getAllByRole("combobox")[0];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    
    expect(provinceSelect).toHaveValue("Western Cape");
  });

  it("Updates district selection", async () => {
    const user = userEvent.setup();
    const districtSelect = screen.getAllByRole("combobox")[1];
    
    await user.selectOptions(districtSelect, "Cape Winelands");
    
    expect(districtSelect).toHaveValue("Cape Winelands");
  });

  it("Updates radius selection", async () => {
    const user = userEvent.setup();
    const radiusSelect = screen.getAllByRole("combobox")[2];
    
    await user.selectOptions(radiusSelect, "25");
    
    expect(radiusSelect).toHaveValue("25");
  });
});






describe("ClinicSearch, Search functionality", () => {
  beforeEach(async () => {
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Calls search API when Apply filters button is clicked", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockClinics,
    });

    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/rest/v1/rpc/search_clinics");
    });
  });

  it("Calls search API when Enter key pressed in name input", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockClinics,
    });

    const nameInput = screen.getByPlaceholderText(/e.g., Tygerberg/i);
    await user.type(nameInput, "Tygerberg{Enter}");

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("Displays clinics after successful search", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockClinics,
    });

    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Tygerberg Clinic")).toBeVisible();
      expect(screen.getByText("Groote Schuur Hospital")).toBeVisible();
    });
  });

  it("Shows 'No clinics found' message when search returns empty", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/No clinics found/i)).toBeVisible();
    });
  });

  it("Shows error message when search fails", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Server error",
    });

    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Search failed/i)).toBeVisible();
    });
  });
});






describe("ClinicSearch, Nearby clinics", () => {
  beforeEach(async () => {
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Requests geolocation when Clinics Near Me is clicked", async () => {
    const user = userEvent.setup();
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({ coords: { latitude: -33.9386, longitude: 18.6296 } })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockClinics,
    });

    const nearbyButton = screen.getByRole("button", { name: /Clinics Near Me/i });
    await user.click(nearbyButton);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it("Calls nearby_clinics RPC after getting location", async () => {
    const user = userEvent.setup();
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({ coords: { latitude: -33.9386, longitude: 18.6296 } })
    );
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockClinics,
    });

    const nearbyButton = screen.getByRole("button", { name: /Clinics Near Me/i });
    await user.click(nearbyButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/rest/v1/rpc/nearby_clinics");
    });
  });

  it("Shows error when geolocation permission denied", async () => {
    const user = userEvent.setup();
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_, error) =>
      error({ code: 1, message: "Permission denied" })
    );

    const nearbyButton = screen.getByRole("button", { name: /Clinics Near Me/i });
    await user.click(nearbyButton);

    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeVisible();
    });
  });
});





describe("ClinicSearch, Booking navigation", () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockClinics,
    });
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Navigates to booking page when Book now button is clicked", async () => {
    const user = userEvent.setup();
    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Tygerberg Clinic")).toBeVisible();
    });

    const bookButtons = screen.getAllByRole("button", { name: /Book now/i });
    await user.click(bookButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/clinic?id=1&name=Tygerberg%20Clinic")
    );
  });

  it("Encodes clinic name in URL", async () => {
    const user = userEvent.setup();
    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Groote Schuur Hospital")).toBeVisible();
    });

    const bookButtons = screen.getAllByRole("button", { name: /Book now/i });
    await user.click(bookButtons[1]);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/clinic?id=2&name=Groote%20Schuur%20Hospital")
    );
  });
});






describe("ClinicSearch, District dropdown", () => {
  beforeEach(async () => {
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Shows all districts when no province selected", async () => {
    const user = userEvent.setup();
    const districtSelect = screen.getAllByRole("combobox")[1];
    
    await user.click(districtSelect);
    
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(9);
  });

  it("Filters districts by selected province", async () => {
    const user = userEvent.setup();
    const provinceSelect = screen.getAllByRole("combobox")[0];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    
    const districtSelect = screen.getAllByRole("combobox")[1];
    await user.click(districtSelect);
    
    const westernCapeDistricts = [
      "Cape Winelands",
      "Central Karoo", 
      "City of Cape Town",
      "Eden",
      "Overberg",
      "West Coast",
    ];
    
    for (const district of westernCapeDistricts) {
      expect(screen.getByRole("option", { name: district })).toBeInTheDocument();
    }
  });

  it("Resets district when province changes", async () => {
    const user = userEvent.setup();
    const provinceSelect = screen.getAllByRole("combobox")[0];
    const districtSelect = screen.getAllByRole("combobox")[1];
    
    await user.selectOptions(provinceSelect, "Western Cape");
    await user.selectOptions(districtSelect, "Cape Winelands");
    expect(districtSelect).toHaveValue("Cape Winelands");
    
    await user.selectOptions(provinceSelect, "Gauteng");
    expect(districtSelect).toHaveValue("");
  });
});





describe("ClinicSearch, Distance display", () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockClinics,
    });
    render(<ClinicSearch />);
    await waitForComponent();
  });

  it("Displays clinics after search", async () => {
    const user = userEvent.setup();
    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText("Tygerberg Clinic")).toBeVisible();
      expect(screen.getByText("Groote Schuur Hospital")).toBeVisible();
    });
  });

  it("Shows 'Distance unknown' when distance not available", async () => {
    const user = userEvent.setup();
    const clinicsWithoutDistance = [
      { ...mockClinics[0], distance: null },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => clinicsWithoutDistance,
    });

    const applyButton = screen.getByRole("button", { name: /Apply filters/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Distance unknown/)).toBeVisible();
    });
  });
});