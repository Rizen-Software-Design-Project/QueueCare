import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BookAppointment from "./BookAppointment";




const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    new URLSearchParams({
      id: "1",
      name: "Test Clinic",
    }),
  ],
}));


vi.mock("../firebase", () => ({
  auth: {
    currentUser: { uid: "firebase-user-1" },
  },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, callback) => {
    callback({ uid: "firebase-user-1" });
    return vi.fn();
  },
}));


const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("#lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: null },
        })
      ),
    },

    from: (...args) => mockFrom(...args),
  },
}));

// fetch
global.fetch = vi.fn();



const futureDate = "2099-12-31";

const mockSlot = {
  id: 10,
  facility_id: 1,
  slot_date: futureDate,
  slot_time: "09:00:00",
  duration_minutes: 30,
  total_capacity: 5,
  booked_count: 1,
};



beforeEach(() => {
  vi.clearAllMocks();

  mockFrom.mockImplementation((table) => {
    // profiles table
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 99,
                    email: "test@test.com",
                  },
                  error: null,
                }),
            }),
          }),
        }),
      };
    }

    // facilities table
    if (table === "facilities") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 1,
                  name: "Test Clinic",
                  facility_type: "Clinic",
                },
                error: null,
              }),
          }),
        }),
      };
    }

    // appointment_slots table
    if (table === "appointment_slots") {
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [mockSlot],
              error: null,
            }),
        }),
      };
    }

    // appointments table
    if (table === "appointments") {
      return {
        select: () => ({
          eq: () => ({
            eq: () =>
              Promise.resolve({
                data: [],
              }),
          }),
        }),
      };
    }
  });
});



describe("BookAppointment", () => {
  it("renders clinic name", async () => {
    render(<BookAppointment />);

    expect(await screen.findByText("Test Clinic")).toBeInTheDocument();
  });

  it("shows available slot", async () => {
    render(<BookAppointment />);

    expect(await screen.findByText(/09:00/i)).toBeInTheDocument();
  });

  it("allows selecting a slot", async () => {
    const user = userEvent.setup();

    render(<BookAppointment />);

    const slot = await screen.findByText(/09:00/i);

    await user.click(slot);

    expect(await screen.findByText(/selected/i)).toBeInTheDocument();
  });

  it("allows typing a reason", async () => {
    const user = userEvent.setup();

    render(<BookAppointment />);

    const textarea = await screen.findByPlaceholderText(
      /general checkup/i
    );

    await user.type(textarea, "Flu symptoms");

    expect(textarea).toHaveValue("Flu symptoms");
  });

  

  it("books appointment successfully", async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        appointment: {
          status: "booked",
          reason: "Flu symptoms",
        },
      }),
    });

    render(<BookAppointment />);

    const slot = await screen.findByText(/09:00/i);
    await user.click(slot);

    const textarea = screen.getByPlaceholderText(
      /general checkup/i
    );

    await user.type(textarea, "Flu symptoms");

    const button = screen.getByRole("button", {
      name: /confirm booking/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/appointment confirmed/i)
      ).toBeInTheDocument();
    });
  });
});