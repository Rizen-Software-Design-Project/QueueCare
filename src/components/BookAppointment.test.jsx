import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookAppointment from "./BookAppointment";


//Mocks 

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams({ id: "1", name: "Test Clinic" });

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}));

let firebaseUserCallback = ({ uid: "firebase-user-1" });

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
    monday: { open: "08:00", close: "16:00" },
    tuesday: { open: "08:00", close: "16:00" },
    wednesday: { open: "08:00", close: "16:00" },
    thursday: { open: "08:00", close: "16:00" },
    friday: { open: "08:00", close: "16:00" },
    saturday: { closed: true },
    sunday: { closed: true },
  },
};



function setupDefaultMocks({ slots = [mockSlot], existingBookings = [], facility = mockFacility, profile = mockProfile } = {}) {
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

// Helpers


async function renderAndWaitForSlots() {
  render(<BookAppointment />);
  return screen.findByText(/09:00/i);
}

async function selectSlotAndReason(user, reason = "Flu symptoms") {
  const slot = await screen.findByText(/09:00/i);
  await user.click(slot);
  const textarea = screen.getByPlaceholderText(/general checkup/i);
  await user.type(textarea, reason);
  return { textarea };
}

//

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams({ id: "1", name: "Test Clinic" });
  firebaseUserCallback = { uid: "firebase-user-1" };
  setupDefaultMocks();
});


// Rendering & clinic info


describe("Rendering & clinic info", () => {
  it("renders the clinic name from the database", async () => {
    render(<BookAppointment />);
    expect(
      await screen.findByRole("heading", { level: 3, name: "Test Clinic" })
    ).toBeInTheDocument();
  });

  it("shows the initial loading message", () => {
    render(<BookAppointment />);
    expect(screen.getByText(/loading available slots/i)).toBeInTheDocument();
  });

  it("displays clinic details section with facility type and location", async () => {
    render(<BookAppointment />);
    expect(await screen.findByText(/Clinic · Johannesburg, Gauteng/i)).toBeInTheDocument();
  });

  it("renders services offered as tags", async () => {
    render(<BookAppointment />);
    expect(await screen.findByText("General Outpatient")).toBeInTheDocument();
    expect(screen.getByText("Maternity")).toBeInTheDocument();
  });

  it("shows 'No services listed' when services array is empty", async () => {
    setupDefaultMocks({ facility: { ...mockFacility, services_offered: [] } });
    render(<BookAppointment />);
    expect(await screen.findByText(/no services listed/i)).toBeInTheDocument();
  });

  it("renders operating hours for weekdays and marks weekends as closed", async () => {
    render(<BookAppointment />);
    await screen.findByText("Monday");
    expect(screen.getByText("Monday")).toBeInTheDocument();
    // Saturday is closed
    const saturdayRows = screen.getAllByText("Closed");
    expect(saturdayRows.length).toBeGreaterThanOrEqual(2); // sat + sun
  });

  it("shows slot count in status message", async () => {
    render(<BookAppointment />);
    expect(await screen.findByText(/1 slot\(s\) available/i)).toBeInTheDocument();
  });
});


// Authentication & profile errors


describe("Authentication & profile errors", () => {
  it("shows error when user is not authenticated", async () => {
    firebaseUserCallback = null;
    vi.mocked(
      (await import("#lib/supabase")).supabase.auth.getUser
    ).mockResolvedValueOnce({ data: { user: null } });

    vi.mock("firebase/auth", () => ({
      onAuthStateChanged: (_auth, callback) => {
        callback(null);
        return vi.fn();
      },
    }));

    setupDefaultMocks({ profile: null });
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
      // other tables remain default
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

    render(<BookAppointment />);
    expect(
      await screen.findByText(/patient profile not found/i)
    ).toBeInTheDocument();
  });
});


// Clinic ID validation & redirects


describe("Clinic ID validation", () => {
  it("redirects to /clinic-search when clinic ID is missing", async () => {
    mockSearchParams = new URLSearchParams({});
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });

  it("redirects to /clinic-search when clinic ID is non-numeric", async () => {
    mockSearchParams = new URLSearchParams({ id: "abc" });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });

  it("redirects to /clinic-search when clinic ID is a float", async () => {
    mockSearchParams = new URLSearchParams({ id: "1.5" });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });

  it("redirects to /clinic-search when clinic ID is negative", async () => {
    mockSearchParams = new URLSearchParams({ id: "-5" });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });

  it("redirects when clinic is not found in the database", async () => {
    // Set up all tables with defaults first, then override just facilities
    setupDefaultMocks();
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
      // Delegate all other tables to a fresh default handler inline
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
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });

  it("redirects when clinic is_active is false", async () => {
    setupDefaultMocks({ facility: { ...mockFacility, is_active: false } });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/clinic-search", { replace: true });
    });
  });
});


// Slot filtering


describe("Slot filtering", () => {
  it("hides slots that are in the past", async () => {
    const pastSlot = { ...mockSlot, id: 20, slot_date: "2000-01-01", slot_time: "09:00:00" };
    setupDefaultMocks({ slots: [pastSlot] });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("hides slots that are fully booked", async () => {
    const fullSlot = { ...mockSlot, id: 21, booked_count: 5, total_capacity: 5 };
    setupDefaultMocks({ slots: [fullSlot] });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("hides slots already booked by the patient", async () => {
    setupDefaultMocks({
      slots: [mockSlot],
      existingBookings: [{ slot_id: mockSlot.id }],
    });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("shows 'No available slots' when database returns empty array", async () => {
    setupDefaultMocks({ slots: [] });
    render(<BookAppointment />);
    await waitFor(() => {
      expect(screen.getByText(/no available slots/i)).toBeInTheDocument();
    });
  });

  it("shows remaining capacity on slot card", async () => {
    render(<BookAppointment />);
    // mockSlot has total_capacity 5, booked_count 1 → 4 spots left
    expect(await screen.findByText(/4 spots left/i)).toBeInTheDocument();
  });

  it("shows 1 spot (singular) when only one remains", async () => {
    setupDefaultMocks({
      slots: [{ ...mockSlot, total_capacity: 5, booked_count: 4 }],
    });
    render(<BookAppointment />);
    expect(await screen.findByText(/1 spot left/i)).toBeInTheDocument();
  });
});


// Slot selection


describe("Slot selection", () => {
  it("shows 'Selected' indicator after clicking a slot", async () => {
    const user = userEvent.setup();
    await renderAndWaitForSlots();
    await user.click(screen.getByText(/09:00/i));
    expect(await screen.findByText(/selected/i)).toBeInTheDocument();
  });

  it("displays duration on slot card", async () => {
    render(<BookAppointment />);
    expect(await screen.findByText(/30 min/i)).toBeInTheDocument();
  });
});


// Reason input & suggestion chips

describe("Reason input & suggestion chips", () => {
  it("allows typing a reason directly", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    const textarea = await screen.findByPlaceholderText(/general checkup/i);
    await user.type(textarea, "Back pain");
    expect(textarea).toHaveValue("Back pain");
  });

  it("clicking a reason chip appends it to the textarea", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i); // wait for slots
    const chip = screen.getByRole("button", { name: "General Checkup" });
    await user.click(chip);
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("General Checkup");
  });

  it("clicking the same chip twice removes it", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "General Checkup" });
    await user.click(chip); // add
    await user.click(chip); // remove
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("");
  });

  it("selecting multiple chips comma-separates them", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i);
    await user.click(screen.getByRole("button", { name: "General Checkup" }));
    await user.click(screen.getByRole("button", { name: "Vaccination" }));
    const textarea = screen.getByPlaceholderText(/general checkup/i);
    expect(textarea).toHaveValue("General Checkup, Vaccination");
  });

  it("active chip has 'active' class", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "Flu Symptoms" });
    await user.click(chip);
    expect(chip).toHaveClass("active");
  });

  it("deselected chip loses 'active' class", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i);
    const chip = screen.getByRole("button", { name: "Flu Symptoms" });
    await user.click(chip);
    await user.click(chip);
    expect(chip).not.toHaveClass("active");
  });
});


// Booking validation errors

describe("Booking validation", () => {
  it("shows error when Confirm Booking clicked without a slot", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    // The button is disabled when no slot selected, so we test the disabled state instead
    await screen.findByText(/09:00/i);
    const button = screen.getByRole("button", { name: /confirm booking/i });
    expect(button).toBeDisabled();
  });

  it("Confirm Booking is disabled without a reason", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await user.click(await screen.findByText(/09:00/i));
    const button = screen.getByRole("button", { name: /confirm booking/i });
    expect(button).toBeDisabled();
  });

  it("Confirm Booking is enabled once slot AND reason are both provided", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await user.click(await screen.findByText(/09:00/i));
    await user.type(screen.getByPlaceholderText(/general checkup/i), "Checkup");
    expect(screen.getByRole("button", { name: /confirm booking/i })).not.toBeDisabled();
  });
});


// Booking API interactions

describe("Booking API", () => {
  it("shows loading state while booking is in progress", async () => {
    const user = userEvent.setup();

    let resolveFetch;
    fetch.mockReturnValueOnce(
      new Promise((res) => { resolveFetch = res; })
    );

    render(<BookAppointment />);
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    expect(screen.getByText(/booking appointment/i)).toBeInTheDocument();

    // Resolve the pending fetch inside act so React can flush the resulting
    // state updates before the test exits — prevents the act() warning.
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

    render(<BookAppointment />);
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

    render(<BookAppointment />);
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

    render(<BookAppointment />);
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

    render(<BookAppointment />);
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/slot already taken/i)).toBeInTheDocument();
    });
  });

  it("shows generic error message when fetch throws a network error", async () => {
    const user = userEvent.setup();
    fetch.mockRejectedValueOnce(new Error("Network error"));

    render(<BookAppointment />);
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

    render(<BookAppointment />);
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    await waitFor(() => {
      expect(screen.getByText(/appointment confirmed/i)).toBeInTheDocument();
    });

    // Confirmation email is fire-and-forget; wait a tick then verify it was called
    await waitFor(() => {
      const emailCall = fetch.mock.calls.find((args) =>
        args[0]?.includes("send-confirmation")
      );
      expect(emailCall).toBeDefined();
    });
  });
});

// Navigation


describe("Navigation", () => {
  it("back button calls navigate(-1)", async () => {
    const user = userEvent.setup();
    render(<BookAppointment />);
    await screen.findByText(/09:00/i);
    await user.click(screen.getByRole("button", { name: /back to search/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("'Back to Dashboard' button navigates to /dashboard after booking", async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ appointment: { status: "booked", reason: "Flu symptoms" } }),
    });

    render(<BookAppointment />);
    await selectSlotAndReason(user);
    await user.click(screen.getByRole("button", { name: /confirm booking/i }));

    const dashboardBtn = await screen.findByRole("button", {
      name: /back to dashboard/i,
    });
    await user.click(dashboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });
});