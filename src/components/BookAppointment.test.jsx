import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookAppointment from "./BookAppointment";

//  Mocks

let firebaseUserCallback = { uid: "firebase-user-1" };

vi.mock("../firebase", () => ({
  auth: { currentUser: { uid: "firebase-user-1" } },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, callback) => {
    callback(firebaseUserCallback);
    return vi.fn();
  },
}));

const mockFrom = vi.fn();

vi.mock("#lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
    },
    from: (...args) => mockFrom(...args),
  },
}));

global.fetch = vi.fn();

// Fixtures
const FUTURE_DATE = "2099-12-31";

const mockSlot = {
  id: 10,
  facility_id: 1,
  slot_date: FUTURE_DATE,
  slot_time: "09:00:00",
  duration_minutes: 30,
  total_capacity: 5,
  booked_count: 1,
};

const mockProfile = {
  id: 99,
  email: "test@test.com",
  first_name: "Jane",
  last_name: "Doe",
};

const mockFacility = {
  id: 1,
  name: "Test Clinic",
  facility_type: "Clinic",
  district: "Johannesburg",
  province: "Gauteng",
  is_active: true,
  services_offered: ["General Outpatient", "Maternity"],
  operating_hours: {
    monday:    { open: "08:00", close: "16:00" },
    tuesday:   { open: "08:00", close: "16:00" },
    wednesday: { open: "08:00", close: "16:00" },
    thursday:  { open: "08:00", close: "16:00" },
    friday:    { open: "08:00", close: "16:00" },
    saturday:  { closed: true },
    sunday:    { closed: true },
  },
};

// Default mock setup
function setupDefaultMocks({
  slots = [mockSlot],
  existingBookings = [],
  facility = mockFacility,
  profile = mockProfile,
} = {}) {
  mockFrom.mockImplementation((table) => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: profile, error: null }),
            }),
          }),
        }),
      };
    }

    if (table === "facilities") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: facility, error: null }),
          }),
        }),
      };
    }

    if (table === "appointment_slots") {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: slots, error: null }),
        }),
      };
    }

    if (table === "appointments") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: existingBookings }),
          }),
        }),
      };
    }
  });
}

// Shared callback mocks
let mockOnBack;
let mockOnDone;

// Render helpers
function renderComponent(clinicId = "1") {
  return render(
    <BookAppointment
      clinicId={clinicId}
      onBack={mockOnBack}
      onDone={mockOnDone}
    />
  );
}

async function renderAndWaitForSlots(clinicId = "1") {
  renderComponent(clinicId);
  return screen.findByText(/09:00/i);
}

async function selectSlotAndReason(user, reason = "Flu symptoms") {
  const slot = await screen.findByText(/09:00/i);
  await user.click(slot);
  const textarea = screen.getByPlaceholderText(/general checkup/i);
  await user.type(textarea, reason);
  return { textarea };
}

// beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  firebaseUserCallback = { uid: "firebase-user-1" };
  mockOnBack = vi.fn();
  mockOnDone = vi.fn();
  setupDefaultMocks();
});

// // Rendering & clinic info
// describe("Rendering & clinic info", () => {
  it("renders the clinic name from the database", async () => {
    renderComponent();
    expect(
      await screen.findByRole("heading", { level: 3, name: "Test Clinic" })
    ).toBeInTheDocument();
  });

  it("shows the initial loading message", () => {
    renderComponent();
    expect(screen.getByText(/loading available slots/i)).toBeInTheDocument();
  });

  it("displays clinic details section with facility type and location", async () => {
    renderComponent();
    expect(await screen.findByText(/Clinic · Johannesburg, Gauteng/i)).toBeInTheDocument();
  });

  it("renders services offered as tags", async () => {
    renderComponent();
    expect(await screen.findByText("General Outpatient")).toBeInTheDocument();
    expect(screen.getByText("Maternity")).toBeInTheDocument();
  });

  it("shows 'No services listed' when services array is empty", async () => {
    setupDefaultMocks({ facility: { ...mockFacility, services_offered: [] } });
    renderComponent();
    expect(await screen.findByText(/no services listed/i)).toBeInTheDocument();
  });

  it("renders operating hours for weekdays and marks weekends as closed", async () => {
    renderComponent();
    await screen.findByText("Monday");
    expect(screen.getByText("Monday")).toBeInTheDocument();
    const closedRows = screen.getAllByText("Closed");
    expect(closedRows.length).toBeGreaterThanOrEqual(2); // Saturday + Sunday
  });

  it("shows slot count in status message", async () => {
    renderComponent();
    expect(await screen.findByText(/1 slot\(s\) available/i)).toBeInTheDocument();
  });
});

// // Authentication & profile errors
// describe("Authentication & profile errors", () => {
  it("shows error when patient profile is not found", async () => {
    firebaseUserCallback = null;
    vi.mocked(
      (await import("#lib/supabase")).supabase.auth.getUser
    ).mockResolvedValueOnce({ data: { user: null } });

    mockFrom.mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "facilities") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockFacility, error: null }),
            }),
          }),
        };
      }
    });

    renderComponent();
    expect(
      await screen.findByText(/patient profile not found/i)
    ).toBeInTheDocument();
  });
});

// // Clinic ID validation — calls onBack for invalid / missing IDs
// describe("Clinic ID validation", () => {
  it("calls onBack when clinicId prop is undefined", async () => {
    render(<BookAppointment onBack={mockOnBack} onDone={mockOnDone} />);
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it("calls onBack when clinicId is non-numeric", async () => {
    renderComponent("abc");
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it("calls onBack when clinicId is negative", async () => {
    renderComponent("-5");
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it("calls onBack when clinic is not found in the database", async () => {
    mockFrom.mockImplementation((table) => {
      if (table === "facilities") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockProfile, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "appointment_slots") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [mockSlot], error: null }) }),
        };
      }
      if (table === "appointments") {
        return {
          select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [] }) }) }),
        };
      }
    });

    renderComponent();
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it("calls onBack when clinic is_active is false", async () => {
    setupDefaultMocks({ facility: { ...mockFacility, is_active: false } });
    renderComponent();
    await waitFor(() => {
      expect(mockOnBack).toHaveBeenCalled();
    });
  });
});

// // Slot filtering
// describe("Slot filtering", () => {
  it("hides slots that are in the past", async () => {
    const pastSlot = { ...mockSlot, id: 20, slot_date: "2000-01-01", slot_time: "09:00:00" };
    setupDefaultMocks({ slots: [pastSlot] });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("hides slots that are fully booked", async () => {
    const fullSlot = { ...mockSlot, id: 21, booked_count: 5, total_capacity: 5 };
    setupDefaultMocks({ slots: [fullSlot] });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("hides slots already booked by the patient", async () => {
    setupDefaultMocks({
      slots: [mockSlot],
      existingBookings: [{ slot_id: mockSlot.id }],
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("shows 'No available slots' when database returns empty array", async () => {
    setupDefaultMocks({ slots: [] });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("shows remaining capacity on slot card", async () => {
    renderComponent();
    // mockSlot: total_capacity 5, booked_count 1 → 4 spots left
    expect(await screen.findByText(/4 spots left/i)).toBeInTheDocument();
  });

  it("shows 1 spot (singular) when only one remains", async () => {
    setupDefaultMocks({
      slots: [{ ...mockSlot, total_capacity: 5, booked_count: 4 }],
    });
    renderComponent();
    expect(await screen.findByText(/1 spot left/i)).toBeInTheDocument();
  });
});

// // Slot selection
// describe("Slot selection", () => {
  it("shows 'Selected' indicator after clicking a slot", async () => {
    const user = userEvent.setup();
    await renderAndWaitForSlots();
    await user.click(screen.getByText(/09:00/i));
    expect(await screen.findByText(/selected/i)).toBeInTheDocument();
  });

  it("displays duration on slot card", async () => {
    renderComponent();
    expect(await screen.findByText(/30 min/i)).toBeInTheDocument();
  });
});

// // Reason input & suggestion chips
// describe("Reason input & suggestion chips", () => {
  it("allows typing a reason directly", async () => {
    const user = userEvent.setup();
    renderComponent();
    const textarea = await screen.findByPlaceholderText(/general checkup/i);
    await user.type(textarea, "Back pain");
    expect(textarea).toHaveValue("Back pain");
  });

  it("clicking a reason chip appends it to the textarea", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "General Checkup" });
    await user.click(chip);
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("General Checkup");
  });

  it("clicking the same chip twice removes it", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "General Checkup" });
    await user.click(chip); // add
    await user.click(chip); // remove
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("");
  });

  it("selecting multiple chips comma-separates them", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    await user.click(screen.getByRole("button", { name: "General Checkup" }));
    await user.click(screen.getByRole("button", { name: "Vaccination" }));
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("General Checkup, Vaccination");
  });

  it("active chip has 'active' class", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "Flu Symptoms" });
    await user.click(chip);
    expect(chip).toHaveClass("active");
  });

  it("deselected chip loses 'active' class", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "Flu Symptoms" });
    await user.click(chip);
    await user.click(chip);
    expect(chip).not.toHaveClass("active");
  });
});

// // Booking validation
// describe("Booking validation", () => {
  it("Confirm Booking button is disabled when no slot is selected", async () => {
    renderComponent();
    await screen.findByText(/09:00/i);
    const button = screen.getByRole("button", { name: /confirm booking/i });
    expect(button).toBeDisabled();
  });

  it("Confirm Booking is disabled without a reason", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(await screen.findByText(/09:00/i));
    const button = screen.getByRole("button", { name: /confirm booking/i });
    expect(button).toBeDisabled();
  });

  it("Confirm Booking is enabled once slot AND reason are both provided", async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(await screen.findByText(/09:00/i));
    await user.type(screen.getByPlaceholderText(/general checkup/i), "Checkup");
    expect(screen.getByRole("button", { name: /confirm booking/i })).not.toBeDisabled();
  });
});

// // Booking API
// describe("Booking API", () => {
  it("shows loading state while booking is in progress", async () => {
    const user = userEvent.setup();

    let resolveFetch;
    fetch.mockReturnValueOnce(
      new Promise((res) => { resolveFetch = res; })
    );

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(screen.getByText(/booking appointment/i)).toBeInTheDocument();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
      });
    });
  });

  it("shows confirmation screen on successful booking", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
    });

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/appointment confirmed/i)).toBeInTheDocument();
    });
  });

  it("shows booked status and reason on confirmation screen", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
    });

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/booked/i)).toBeInTheDocument();
      expect(screen.getByText(/flu symptoms/i)).toBeInTheDocument();
    });
  });

  it("hides slot list after a successful booking", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
    });

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.queryByText(/09:00/i)).not.toBeInTheDocument();
    });
  });

  it("shows error message when API returns a non-ok response", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Slot already taken" }),
    });

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/slot already taken/i)).toBeInTheDocument();
    });
  });

  it("shows generic error message when fetch throws a network error", async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValueOnce(new Error("Network error"));

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("fires confirmation email request after successful booking", async () => {
    const user = userEvent.setup();
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
      })
      .mockResolvedValueOnce({ ok: true }); // confirmation email

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/appointment confirmed/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const emailCall = fetch.mock.calls.find((args) =>
        args[0]?.includes("send-confirmation")
      );
      expect(emailCall).toBeDefined();
    });
  });
});

// // Navigation
// describe("Navigation", () => {
  it("back button calls onBack prop", async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText(/09:00/i);
    await user.click(screen.getByRole("button", { name: /back to search/i }));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("'Back to Dashboard' button calls onDone prop after booking", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
    });

    renderComponent();
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    const dashboardBtn = await screen.findByRole("button", {
      name: /back to dashboard/i,
    });
    await user.click(dashboardBtn);
    expect(mockOnDone).toHaveBeenCalled();
  });
});