import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import WalkIn from "./Walkin";
import userEvent from "@testing-library/user-event";

/* ---------------- MOCKS ---------------- */

const mockNavigate = vi.fn();

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock("#lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQuery),
  },
}));

global.fetch = vi.fn();

/* ---------------- MOCK DATA ---------------- */

const TODAY = new Date().toISOString().split("T")[0];

const mockTodaySlot = {
  id: "slot-today",
  slot_date: TODAY,
  slot_time: "23:59:00", // always future-safe
  duration_minutes: 30,
  total_capacity: 5,
  booked_count: 2,
};

const mockFutureSlot = {
  id: "slot-future",
  slot_date: "2099-12-31",
  slot_time: "09:00:00",
  duration_minutes: 30,
  total_capacity: 5,
  booked_count: 1,
};

const mockPatientProfile = {
  id: "patient-id",
  name: "John",
  surname: "Doe",
  email: "john@example.com",
  phone_number: "0820000000",
};

/* ---------------- HELPERS ---------------- */


function seedSlots(slots = [mockTodaySlot, mockFutureSlot]) {
  mockQuery.select.mockReturnThis();
  mockQuery.eq.mockReturnThis();

  mockQuery.order
    .mockImplementationOnce(() => mockQuery)
    .mockResolvedValueOnce({
      data: slots,
      error: null,
    });

  // second fetchSlots() call
  mockQuery.order
    .mockImplementationOnce(() => mockQuery)
    .mockResolvedValueOnce({
      data: slots,
      error: null,
    });

  // third fetchSlots() call
  mockQuery.order
    .mockImplementationOnce(() => mockQuery)
    .mockResolvedValueOnce({
      data: slots,
      error: null,
    });
}
function renderComponent() {
  return render(
    <WalkIn
      facilityId="fac-1"
      facilityName="Soweto Clinic"
      onBack={mockNavigate}
    />
  );
}

async function searchForPatient(user, found = true) {
  mockQuery.maybeSingle.mockResolvedValueOnce({
    data: found ? mockPatientProfile : null,
    error: null,
  });

  await user.type(screen.getByPlaceholderText(/email or phone/i), "john@example.com");
  await user.click(screen.getByRole("button", { name: /find/i }));

  if (found) {
    await waitFor(() =>
      expect(screen.getByText(/confirm below/i)).toBeVisible()
    );
  }
}

/* ---------------- SETUP ---------------- */

beforeEach(() => {
  vi.clearAllMocks();
  seedSlots();
});

/* ---------------- BASIC RENDER ---------------- */

describe("Page structure", () => {
  it("renders heading and facility", async () => {
    renderComponent();

    expect(screen.getByText(/walk-in patients/i)).toBeVisible();
    expect(screen.getByText(/soweto clinic/i)).toBeVisible();
  });

  it("renders tabs", () => {
    renderComponent();

    expect(screen.getByRole("button", { name: /queue today/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /book future appointment/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /check in patient/i })).toBeVisible();
  });

  it("back button works", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(mockNavigate).toHaveBeenCalled();
  });
});

/* ---------------- SEARCH ---------------- */

describe("Patient search", () => {
  it("shows error if patient not found", async () => {
    const user = userEvent.setup();
    renderComponent();

    await searchForPatient(user, false);

    expect(screen.getByText(/no profile found/i)).toBeVisible();
  });

  it("shows profile when found", async () => {
    const user = userEvent.setup();
    renderComponent();

    await searchForPatient(user);

    expect(screen.getByText("John Doe")).toBeVisible();
    expect(screen.getByText(/john@example.com/i)).toBeVisible();
  });
});

/* ---------------- QUEUE TAB ---------------- */

describe("Queue Today", () => {
  it("is default tab", () => {
    renderComponent();
    expect(screen.getByText(/add them to today's live queue/i)).toBeVisible();
  });

  it("enables submit after slot select", async () => {
    const user = userEvent.setup();
    renderComponent();

    await searchForPatient(user);

    await user.selectOptions(screen.getByRole("combobox"), "slot-today");

    expect(
      screen.getByRole("button", { name: /add to today's queue/i })
    ).not.toBeDisabled();
  });

  it("submits successfully", async () => {
    const user = userEvent.setup();
    renderComponent();

    await searchForPatient(user);
    await user.selectOptions(screen.getByRole("combobox"), "slot-today");

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

    await waitFor(() =>
      expect(screen.getByText(/added to today's queue/i)).toBeVisible()
    );
  });
});

/* ---------------- BOOK TAB ---------------- */

describe("Book Future Appointment", () => {
  it("shows future slots only", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /book future appointment/i }));
    await searchForPatient(user);

    const options = screen.getAllByRole("option");
    expect(options.find(o => o.value === "slot-future")).toBeTruthy();
    expect(options.find(o => o.value === "slot-today")).toBeFalsy();
  });

  it("submits booking", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /book future appointment/i }));
    await searchForPatient(user);

    await user.selectOptions(screen.getByRole("combobox"), "slot-future");

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await user.click(screen.getByRole("button", { name: /book appointment/i }));

    await waitFor(() =>
      expect(screen.getByText(/appointment booked for john doe/i)).toBeVisible()
    );
  });
});

/* ---------------- CHECK-IN ---------------- */

describe("Check In", () => {
  async function setup() {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole("button", { name: /check in patient/i }));
    await searchForPatient(user);

    return user;
  }

  it("shows error if no appointment", async () => {
    const user = await setup();

    mockQuery.in.mockResolvedValueOnce({ data: [], error: null });

    await user.click(screen.getByRole("button", { name: /confirm check in/i }));

    await waitFor(() =>
      expect(screen.getByText(/no booked appointment/i)).toBeVisible()
    );
  });

  it("checks in successfully", async () => {
    const user = await setup();

    mockQuery.in.mockResolvedValueOnce({
      data: [{ id: "appt" }],
      error: null,
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await user.click(screen.getByRole("button", { name: /confirm check in/i }));

    await waitFor(() =>
      expect(screen.getByText(/checked in and added to the queue/i)).toBeVisible()
    );
  });
});

/* ---------------- TAB SWITCH ---------------- */

describe("Tab switching", () => {
  it("clears success message on tab change", async () => {
    const user = userEvent.setup();
    renderComponent();

    await searchForPatient(user);
    await user.selectOptions(screen.getByRole("combobox"), "slot-today");

    fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await user.click(screen.getByRole("button", { name: /add to today's queue/i }));

    await waitFor(() =>
      expect(screen.getByText(/added to today's queue/i)).toBeVisible()
    );

    await user.click(screen.getByRole("button", { name: /book future appointment/i }));

    expect(
      screen.queryByText(/added to today's queue/i)
    ).not.toBeInTheDocument();
  });
});