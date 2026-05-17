import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import {
    formatDate,
    formatTime,
    formatDateTime,
    normalizeAvailability,
    DAYS,
    Badge,
} from "./DashboardHelpers";

describe("formatDate", () => {
    it("returns em-dash for null/undefined", () => {
        expect(formatDate(null)).toBe("—");
        expect(formatDate(undefined)).toBe("—");
        expect(formatDate("")).toBe("—");
    });

    it("formats a valid date string", () => {
        const result = formatDate("2026-05-10");
        expect(result).toMatch(/10/);
        expect(result).toMatch(/May|2026/);
    });
});

describe("formatTime", () => {
    it("returns empty string for null/undefined", () => {
        expect(formatTime(null)).toBe("");
        expect(formatTime(undefined)).toBe("");
    });

    it("returns first 5 chars of time string", () => {
        expect(formatTime("09:30:00")).toBe("09:30");
        expect(formatTime("14:00")).toBe("14:00");
    });
});

describe("formatDateTime", () => {
    it("returns em-dash for null/undefined", () => {
        expect(formatDateTime(null)).toBe("—");
        expect(formatDateTime(undefined)).toBe("—");
    });

    it("formats a valid datetime string", () => {
        const result = formatDateTime("2026-05-10T09:30:00");
        expect(result).toMatch(/10|May|2026/);
    });
});

describe("normalizeAvailability", () => {
    it("returns default structure for empty availability", () => {
        const result = normalizeAvailability(null);
        DAYS.forEach((day) => {
            expect(result[day]).toEqual({ available: false, start: "", end: "" });
        });
    });

    it("uses provided values when available", () => {
        const input = { monday: { available: true, start: "08:00", end: "17:00" } };
        const result = normalizeAvailability(input);
        expect(result.monday).toEqual({ available: true, start: "08:00", end: "17:00" });
        expect(result.tuesday).toEqual({ available: false, start: "", end: "" });
    });

    it("covers all 7 days", () => {
        const result = normalizeAvailability({});
        expect(Object.keys(result)).toEqual(DAYS);
    });
});

describe("Badge", () => {
    it("renders status label inside a span", () => {
        render(<Badge status="booked" />);
        expect(screen.getByText("Booked")).toBeInTheDocument();
    });

    it("renders cancelled status", () => {
        render(<Badge status="cancelled" />);
        expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });

    it("renders complete status", () => {
        render(<Badge status="complete" />);
        expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("renders unknown status with fallback", () => {
        render(<Badge status="unknown_xyz" />);
        expect(screen.getByText("unknown_xyz")).toBeInTheDocument();
    });

    it("renders Unknown label when status is empty", () => {
        render(<Badge status="" />);
        expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
});
