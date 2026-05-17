import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";

/* ✅ MOCK FIRST (before component import) */
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import QueueCarePolicy from "./ServicePolicy";

describe("QueueCarePolicy", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the main heading and intro text", () => {
    render(<QueueCarePolicy />);

    expect(
      screen.getByRole("heading", { name: /QueueCare Policies/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/This page outlines the terms and operational policies/i)
    ).toBeInTheDocument();
  });

  it("renders the legal information section", () => {
  render(<QueueCarePolicy />);

  const ectaTexts = screen.getAllByText(
    /Electronic Communications and Transactions Act/i
  );

  expect(ectaTexts.length).toBeGreaterThan(0);
});

  it("renders all major policy sections", () => {
    render(<QueueCarePolicy />);

    const sectionTitles = [
      /Institutional Ground Rules/i,
      /Data Stewardship & Protection/i,
      /Cancellations & Missed Windows/i,
      /Clinical Staff Operational Protocols/i,
      /Infrastructure & Server Integrity/i,
    ];

    sectionTitles.forEach((title) => {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    });
  });

  it("renders section labels and last updated text", () => {
    render(<QueueCarePolicy />);
    expect(screen.getAllByText(/Last updated:/i).length).toBeGreaterThan(0);
  });

  it("renders multiple policy items inside a section", () => {
    render(<QueueCarePolicy />);

    const section = screen
      .getByRole("heading", { name: /Institutional Ground Rules/i })
      .closest("section");

    expect(section).toBeInTheDocument();

    const headings = within(section).getAllByRole("heading", { level: 3 });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders specific policy content correctly", () => {
    render(<QueueCarePolicy />);

    expect(
      screen.getByText(/QueueCare operates under South African law/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Users may not manipulate bookings/i)
    ).toBeInTheDocument();
  });

  it("renders the footer with support information", () => {
    render(<QueueCarePolicy />);

    expect(
      screen.getByRole("heading", { name: /Support/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/support@queuecare.co.za/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/© 2026 QueueCare/i)
    ).toBeInTheDocument();
  });

  it("renders correct number of top-level policy sections", () => {
    render(<QueueCarePolicy />);

    const sections = document.querySelectorAll('section[style*="border"]');
    expect(sections.length).toBe(5);
  });

  it("does not crash when rendering", () => {
    expect(() => render(<QueueCarePolicy />)).not.toThrow();
  });

  /* ✅ FIXED BACK BUTTON TEST */
  it("navigates to dashboard when back button is clicked", async () => {
  const user = userEvent.setup();

  render(<QueueCarePolicy />);

  const button = screen.getByRole("button", { name: /back/i });
  await user.click(button);

  expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
});
});