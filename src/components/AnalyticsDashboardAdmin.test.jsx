import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import AnalyticsDashboardAdmin from "./AnalyticsDashboardAdmin";


//mocks
//opening pages
//navigate to page...,
//tests(describes)


//mocks
const mockExportCSV = vi.fn();
const mockExportPDF = vi.fn();

vi.mock("#utils/exportUtils", () => ({
    exportCSV: (...args) => mockExportCSV(...args),
    exportPDF: (...args) => mockExportPDF(...args),
}));

vi.mock("./AIAssistant", () => ({
    default: () => null,
}));


const defaultWaitData = [
    {
        hour_of_day: 9,
        avg_wait_minutes: 12,
        min_wait_minutes: 5,
        max_wait_minutes: 25,
        total_served: 30,
    },
    {
        hour_of_day: 14,
        avg_wait_minutes: 20,
        min_wait_minutes: 8,
        max_wait_minutes: 40,
        total_served: 50,
    },
];

const mockUseWaitTimes    = vi.fn(() => ({ data: defaultWaitData, loading: false }));
const mockUseNoShowRates  = vi.fn(() => ({ data: [], loading: false }));
const mockUseCustomView   = vi.fn(() => ({ data: [], loading: false }));
const mockUseFacilities   = vi.fn(() => [
    { id: 1, name: "Soweto Clinic" },
    { id: 2, name: "Cape Town CHC" },
]);

vi.mock("#hooks/useAnalytics", () => ({
    useWaitTimes:   (...args) => mockUseWaitTimes(...args),
    useNoShowRates: (...args) => mockUseNoShowRates(...args),
    useCustomView:  (...args) => mockUseCustomView(...args),
    useFacilities:  ()        => mockUseFacilities(),
}));

const defaultNoShowData = [
    {
        date: "2024-06-02",
        no_show_rate_pct: "28.0",
        no_shows: "7",
        total_appointments: "25",
    },
    {
        date: "2024-06-01",
        no_show_rate_pct: "30.0",
        no_shows: "3",
        total_appointments: "10",
    },
];

const lowNoShowData = [
    {
        date: "2024-06-02",
        no_show_rate_pct: "5.0",
        no_shows: "1",
        total_appointments: "20",
    },
    {
        date: "2024-06-01",
        no_show_rate_pct: "6.7",
        no_shows: "2",
        total_appointments: "30",
    },
];

const defaultCustomData = [
  {
    id: "appt-cv-1",
    booked_at: "2024-06-01T08:30:00Z",
    patient_name: "Jane",
    patient_surname: "Dlamini",
    patient_email: "jane@example.com",
    patient_phone:  null,
    facility_name: "Soweto Clinic",
    appointment_type: "scheduled",
    status: "complete",
    queue_status: "completed",
    wait_minutes: 10,
    service_minutes: 15,
  },
  {
    id: "appt-cv-2",
    booked_at: "2024-06-02T09:00:00Z",
    patient_name: "John",
    patient_surname: "Mokoena",
    patient_email: null,
    patient_phone: "0831234567",
    facility_name: "Cape Town CHC",
    appointment_type: "walk_in",
    status: "no_show",
    queue_status: null,
    wait_minutes: null,
    service_minutes: null,
  },
];




// All three tab panels are always in the DOM (hidden attr toggles visibility).
// Use getByRole("tabpanel", { hidden: false }) or query within the visible panel.
function getVisiblePanel() {
    const panels = document.querySelectorAll('[role="tabpanel"]');
    return [...panels].find((p) => !p.hidden);
}

function queryInVisiblePanel(role, options) {
    const panel = getVisiblePanel();
    if (!panel) return null;
    return panel.querySelector(`[role="${role}"]`);
}


//opening pages
function openAnalyticsHeader() {
    it("renders the Analytics heading", () => {
        expect(screen.getByRole("heading", { name: /^analytics$/i })).toBeVisible();
    });

    it("renders the patient flow subheading", () => {
        expect(
            screen.getByText(/patient flow and appointment performance across your facilities/i)
        ).toBeVisible();
    });

    it("renders all three tab buttons", () => {
        expect(screen.getByRole("tab", { name: /wait times/i    })).toBeVisible();
        expect(screen.getByRole("tab", { name: /no-show rates/i })).toBeVisible();
        expect(screen.getByRole("tab", { name: /custom view/i   })).toBeVisible();
    });

    it("Wait Times tab is active by default", () => {
        expect(screen.getByRole("tab", { name: /wait times/i })).toHaveClass("bg-teal-500");
    });
}

function openWaitTimesTab() {
    it("renders the Overall Avg Wait stat card", () => {
        expect(screen.getByText(/overall avg wait/i)).toBeVisible();
    });

    it("renders the Peak Hour stat card", () => {
        expect(screen.getByText(/peak hour/i)).toBeVisible();
    });

    it("renders the Total Served stat card", () => {
        expect(screen.getByText(/total served/i)).toBeVisible();
    });

    it("renders the chart heading", () => {
        expect(screen.getByText(/average wait time by hour of day/i)).toBeVisible();
    });

    it("renders the facility filter dropdown", () => {
        const panel = getVisiblePanel();
        expect(panel.querySelector("select")).toBeVisible();
    });

    it("renders the CSV export button", () => {
        const panel = getVisiblePanel();
        expect(panel.querySelector("button[disabled]")).toBeNull();
        expect(screen.getAllByRole("button", { name: /csv/i })[0]).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getAllByRole("button", { name: /pdf/i })[0]).toBeVisible();
    });
}

function openWaitTimesLoadingState() {
    it("shows '…' in stat cards while loading", () => {
        const ellipses = screen.getAllByText("…");
        expect(ellipses.length).toBeGreaterThanOrEqual(3);
    });

    it("export buttons are disabled while loading", () => {
        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });
}

function openNoShowTab() {
    it("renders the Overall No-Show Rate stat card label", () => {
        expect(screen.getByText(/overall no-show rate/i)).toBeVisible();
    });

    it("renders the Total No-Shows stat card label", () => {
        expect(screen.getByText(/total no-shows/i)).toBeVisible();
    });

    it("renders the Total Appointments stat card label", () => {
        expect(screen.getByText(/total appointments/i)).toBeVisible();
    });

    it("renders the Days Analysed stat card label", () => {
        expect(screen.getByText(/days analysed/i)).toBeVisible();
    });

    it("renders the chart heading", () => {
        expect(screen.getByText(/no-show rate over time/i)).toBeVisible();
    });

    it("renders the facility filter dropdown", () => {
        const panel = getVisiblePanel();
        expect(panel.querySelector("select")).toBeVisible();
    });

    it("renders two date range inputs", () => {
        const panel = getVisiblePanel();
        const dateInputs = panel.querySelectorAll("input[type='date']");
        expect(dateInputs).toHaveLength(2);
    });

    it("renders the CSV export button", () => {
        expect(screen.getAllByRole("button", { name: /csv/i })[0]).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getAllByRole("button", { name: /pdf/i })[0]).toBeVisible();
    });
}

function openNoShowLoadingState() {
    it("shows '…' in all four stat cards while loading", () => {
        const ellipses = screen.getAllByText("…");
        expect(ellipses.length).toBeGreaterThanOrEqual(4);
    });

    it("export buttons are disabled while loading", () => {
        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });

    it("does not show the high no-show warning while loading", () => {
        const panel = getVisiblePanel();
        expect(panel.textContent).not.toMatch(/no-show rate is above 20%/i);
    });
}

function openCustomViewTab() {
    it("renders the Appointments table heading", () => {
        expect(screen.getByText(/^appointments$/i)).toBeVisible();
    });

    it("renders the records count", () => {
        const panel = getVisiblePanel();
        expect(panel.textContent).toMatch(/records/i);
    });

    it("renders the facility filter dropdown", () => {
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        expect(combos.length).toBeGreaterThanOrEqual(1);
    });

    it("renders the Status filter dropdown", () => {
        expect(screen.getByRole("option", { name: /all statuses/i })).toBeInTheDocument();
    });

    it("renders the Type filter dropdown", () => {
        expect(screen.getByRole("option", { name: /all types/i })).toBeInTheDocument();
    });

    it("renders two date range inputs", () => {
        const panel = getVisiblePanel();
        const dateInputs = panel.querySelectorAll("input[type='date']");
        expect(dateInputs).toHaveLength(2);
    });

    it("renders the CSV export button", () => {
        expect(screen.getAllByRole("button", { name: /csv/i })[0]).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getAllByRole("button", { name: /pdf/i })[0]).toBeVisible();
    });
}

function openCustomViewTableHeaders() {
    const EXPECTED_HEADERS = [
        "Booked At", "Patient", "Contact", "Facility", "Type", "Status", "Queue", "Wait", "Service",
    ];

    EXPECTED_HEADERS.forEach(header => {
        it(`renders "${header}" column header`, () => {
            const panel = getVisiblePanel();
            const th = [...panel.querySelectorAll("th")].find((t) => t.textContent.trim() === header);
            expect(th).toBeVisible();
        });
    });
}

function openCustomViewLoadingState() {
    it("shows 'Loading…' records label while loading", () => {
        expect(screen.getByText("Loading…")).toBeVisible();
    });

    it("export buttons are disabled while loading", () => {
        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });
}

function openCustomViewEmptyState() {
    it("shows the empty message when no appointments match", () => {
        expect(screen.getByText(/no appointments match your filters/i)).toBeVisible();
    });

    it("export buttons are disabled when data is empty", () => {
        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });
}


//navigate to pag
async function navigateToWaitTimesTab() {
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await waitFor(() =>
        expect(screen.getByText(/overall avg wait/i)).toBeVisible()
    );
    return user;
}

async function navigateToWaitTimesLoading() {
    mockUseWaitTimes.mockReturnValueOnce({ data: [], loading: true });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    return user;
}

async function navigateToNoShowTab() {
    mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await user.click(screen.getByRole("tab", { name: /no-show rates/i }));
    await waitFor(() =>
        expect(screen.getByText(/overall no-show rate/i)).toBeVisible()
    );
    return user;
}

async function navigateToNoShowLoading() {
    mockUseNoShowRates.mockReturnValue({ data: [], loading: true });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await user.click(screen.getByRole("tab", { name: /no-show rates/i }));
    await waitFor(() =>
        expect(screen.getByText(/overall no-show rate/i)).toBeVisible()
    );
    return user;
}

async function navigateToCustomViewTab() {
    mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await user.click(screen.getByRole("tab", { name: /custom view/i }));
    await waitFor(() =>
        expect(screen.getByText(/^appointments$/i)).toBeVisible()
    );
    return user;
}

async function navigateToCustomViewEmpty() {
    mockUseCustomView.mockReturnValue({ data: [], loading: false });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await user.click(screen.getByRole("tab", { name: /custom view/i }));
    await waitFor(() =>
        expect(screen.getByText(/^appointments$/i)).toBeVisible()
    );
    return user;
}

async function navigateToCustomViewLoading() {
    mockUseCustomView.mockReturnValue({ data: [], loading: true });
    const user = userEvent.setup();
    render(<AnalyticsDashboardAdmin />);
    await user.click(screen.getByRole("tab", { name: /custom view/i }));
    await waitFor(() =>
        expect(screen.getByText(/^appointments$/i)).toBeVisible()
    );
    return user;
}


beforeEach(() => {
    vi.clearAllMocks();
    mockUseWaitTimes.mockReturnValue({ data: defaultWaitData, loading: false });
    mockUseNoShowRates.mockReturnValue({ data: [], loading: false });
    mockUseCustomView.mockReturnValue({ data: [], loading: false });
    mockUseFacilities.mockReturnValue([
        { id: 1, name: "Soweto Clinic" },
        { id: 2, name: "Cape Town CHC" },
    ]);
});


//tests(describes)
describe("Analytics page - header", () => {
    beforeEach(async () => {
        await navigateToWaitTimesTab();
    });

    openAnalyticsHeader();
});


describe("Wait Times tab - initial render", () => {
    beforeEach(async () => {
        await navigateToWaitTimesTab();
    });

    openWaitTimesTab();
});


describe("Wait Times tab - loading state", () => {
    beforeEach(async () => {
        await navigateToWaitTimesLoading();
    });

    openWaitTimesLoadingState();
});


describe("Wait Times tab - computed stat values", () => {
    beforeEach(async () => {
        await navigateToWaitTimesTab();
    });

    it("shows correctly weighted average wait time", () => {
        expect(screen.getByText("17.0 min")).toBeVisible();
    });

    it("shows correct total served count", () => {
        expect(screen.getByText("80")).toBeVisible();
    });

    it("shows the peak hour (hour with highest avg wait)", () => {
        expect(screen.getByText("2 pm")).toBeVisible();
    });

    it("shows peak hour sub-label with its avg wait", () => {
        expect(screen.getByText(/20 min avg/i)).toBeVisible();
    });
});


describe("Wait Times tab - empty data", () => {
    it("shows — for Overall Avg Wait when there is no data", async () => {
        mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
        await navigateToWaitTimesTab();

        expect(screen.getByText("— min")).toBeVisible();
    });

    it("shows — for Peak Hour when there is no data", async () => {
        mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
        await navigateToWaitTimesTab();

        const peakCard = screen.getByText(/peak hour/i).closest("section");
        expect(peakCard).toHaveTextContent("—");
    });

    it("shows 0 for Total Served when there is no data", async () => {
    mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
    await navigateToWaitTimesTab();

    const panel = getVisiblePanel();
    const zeros = [...panel.querySelectorAll("p")].filter((p) => p.textContent === "0");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
});

    it("export buttons are disabled when data is empty", async () => {
        mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
        await navigateToWaitTimesTab();

        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });
});


describe("Wait Times tab - single row data", () => {
    it("shows the single row's avg wait as the overall average", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{
                hour_of_day: 9, avg_wait_minutes: 15,
                min_wait_minutes: 5, max_wait_minutes: 30, total_served: 10,
            }],
            loading: false,
        });
        await navigateToWaitTimesTab();

        expect(screen.getByText("15.0 min")).toBeVisible();
    });

    it("shows the single row as the peak hour", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{
                hour_of_day: 9, avg_wait_minutes: 15,
                min_wait_minutes: 5, max_wait_minutes: 30, total_served: 10,
            }],
            loading: false,
        });
        await navigateToWaitTimesTab();

        expect(screen.getByText("9 am")).toBeVisible();
    });
});


describe("Wait Times tab - facility filter", () => {
    it("renders All Facilities as the default option", async () => {
        await navigateToWaitTimesTab();

        const panel = getVisiblePanel();
        expect(panel.querySelector("select")).toHaveValue("");
    });

    it("renders facility options from useFacilities", async () => {
        await navigateToWaitTimesTab();

        expect(screen.getByRole("option", { name: "Soweto Clinic" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Cape Town CHC" })).toBeInTheDocument();
    });

    it("selecting a facility calls useWaitTimes with the correct facilityId", async () => {
        const user = await navigateToWaitTimesTab();
        const panel = getVisiblePanel();

        await user.selectOptions(panel.querySelector("select"), "1");

        expect(mockUseWaitTimes).toHaveBeenCalledWith(
            expect.objectContaining({ facilityId: 1 })
        );
    });

    it("selecting All Facilities resets facilityId to null", async () => {
        const user = await navigateToWaitTimesTab();
        const panel = getVisiblePanel();
        const select = panel.querySelector("select");

        await user.selectOptions(select, "1");
        await user.selectOptions(select, "");

        expect(mockUseWaitTimes).toHaveBeenLastCalledWith(
            expect.objectContaining({ facilityId: null })
        );
    });
});


describe("Wait Times tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        await navigateToWaitTimesTab();

        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).not.toBeDisabled();
        expect(pdfBtn).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with chart data and filename", async () => {
        const user = await navigateToWaitTimesTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        expect(mockExportCSV).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ "Avg Wait": 12 }),
                expect.objectContaining({ "Avg Wait": 20 }),
            ]),
            "wait-times"
        );
    });

    it("clicking PDF calls exportPDF with correct title and filename", async () => {
        const user = await navigateToWaitTimesTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title:    expect.stringContaining("Wait Times"),
                filename: "wait-times",
            })
        );
    });

    it("clicking PDF passes the correct column definitions", async () => {
        const user = await navigateToWaitTimesTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map((c) => c.header);
        expect(headers).toContain("Hour of Day");
        expect(headers).toContain("Avg Wait (min)");
        expect(headers).toContain("Min Wait (min)");
        expect(headers).toContain("Max Wait (min)");
    });
});


describe("Wait Times tab - tab switching", () => {
    it("clicking No-Show Rates tab hides the Wait Times panel", async () => {
        const user = await navigateToWaitTimesTab();

        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));

        const waitPanel = document.getElementById("tabpanel-0");
        expect(waitPanel).toHaveAttribute("hidden");
    });

    it("clicking Custom View tab hides the Wait Times panel", async () => {
        const user = await navigateToWaitTimesTab();

        await user.click(screen.getByRole("tab", { name: /custom view/i }));

        const waitPanel = document.getElementById("tabpanel-0");
        expect(waitPanel).toHaveAttribute("hidden");
    });

    it("clicking back to Wait Times tab shows its panel again", async () => {
        const user = await navigateToWaitTimesTab();

        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));
        await user.click(screen.getByRole("tab", { name: /wait times/i    }));

        const waitPanel = document.getElementById("tabpanel-0");
        expect(waitPanel).not.toHaveAttribute("hidden");
    });

    it("No-Show Rates tab gets active class when clicked", async () => {
        const user = await navigateToWaitTimesTab();

        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));

        expect(screen.getByRole("tab", { name: /no-show rates/i })).toHaveClass("bg-teal-500");
        expect(screen.getByRole("tab", { name: /wait times/i    })).not.toHaveClass("bg-teal-500");
    });
});


describe("Wait Times tab - hour label formatting", () => {
    it("formats hour 0 as '12 am'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{
                hour_of_day: 0, avg_wait_minutes: 5,
                min_wait_minutes: 2, max_wait_minutes: 10, total_served: 5,
            }],
            loading: false,
        });
        await navigateToWaitTimesTab();

        expect(screen.getByText("12 am")).toBeVisible();
    });

    it("formats hour 12 as '12 pm'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{
                hour_of_day: 12, avg_wait_minutes: 18,
                min_wait_minutes: 5, max_wait_minutes: 35, total_served: 40,
            }],
            loading: false,
        });
        await navigateToWaitTimesTab();

        expect(screen.getByText("12 pm")).toBeVisible();
    });

    it("formats afternoon hour 15 as '3 pm'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{
                hour_of_day: 15, avg_wait_minutes: 22,
                min_wait_minutes: 8, max_wait_minutes: 45, total_served: 60,
            }],
            loading: false,
        });
        await navigateToWaitTimesTab();

        expect(screen.getByText("3 pm")).toBeVisible();
    });
});


describe("No-Show Rates tab - initial render", () => {
    beforeEach(async () => {
        await navigateToNoShowTab();
    });

    openNoShowTab();
});


describe("No-Show Rates tab - loading state", () => {
    beforeEach(async () => {
        await navigateToNoShowLoading();
    });

    openNoShowLoadingState();
});


describe("No-Show Rates tab - computed stat values", () => {
    beforeEach(async () => {
        await navigateToNoShowTab();
    });

    it("shows correct overall no-show rate", () => {
        expect(screen.getByText("28.6%")).toBeVisible();
    });

    it("shows correct total no-shows", () => {
        expect(screen.getByText("10")).toBeVisible();
    });

    it("shows correct total appointments", () => {
        expect(screen.getByText("35")).toBeVisible();
    });

    it("shows correct days analysed", () => {
        expect(screen.getByText("2")).toBeVisible();
    });
});


describe("No-Show Rates tab - empty data", () => {
    beforeEach(async () => {
        mockUseNoShowRates.mockReturnValue({ data: [], loading: false });
        const user = userEvent.setup();
        render(<AnalyticsDashboardAdmin />);
        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));
        await waitFor(() =>
            expect(screen.getByText(/overall no-show rate/i)).toBeVisible()
        );
    });

    it("shows — for overall no-show rate", () => {
        expect(screen.getByText("—%")).toBeVisible();
    });

    it("shows 0 for total no-shows", () => {
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it("shows 0 for days analysed", () => {
        const zeros = screen.getAllByText("0");
        expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it("export buttons are disabled when data is empty", () => {
        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).toBeDisabled();
        expect(pdfBtn).toBeDisabled();
    });

    it("does not show the high no-show warning banner", () => {
        const panel = getVisiblePanel();
        expect(panel.textContent).not.toMatch(/no-show rate is above 20%/i);
    });
});


describe("No-Show Rates tab - high rate warning banner", () => {
    it("shows warning banner when overall rate is at or above 20%", async () => {
        await navigateToNoShowTab();

        expect(screen.getByText(/no-show rate is above 20%/i)).toBeVisible();
    });

    it("warning banner mentions appointment reminders", async () => {
        await navigateToNoShowTab();

        expect(screen.getByText(/appointment reminder/i)).toBeVisible();
    });

    it("does not show warning banner when rate is below 20%", async () => {
        mockUseNoShowRates.mockReturnValue({ data: lowNoShowData, loading: false });
        const user = userEvent.setup();
        render(<AnalyticsDashboardAdmin />);
        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));
        await waitFor(() =>
            expect(screen.getByText(/overall no-show rate/i)).toBeVisible()
        );

        const panel = getVisiblePanel();
        expect(panel.textContent).not.toMatch(/no-show rate is above 20%/i);
    });

    it("does not show warning banner while data is loading", async () => {
        await navigateToNoShowLoading();

        const panel = getVisiblePanel();
        expect(panel.textContent).not.toMatch(/no-show rate is above 20%/i);
    });
});


describe("No-Show Rates tab - facility filter", () => {
    it("renders All Facilities as the default selected option", async () => {
        await navigateToNoShowTab();

        const panel = getVisiblePanel();
        expect(panel.querySelector("select")).toHaveValue("");
    });

    it("renders facility options from useFacilities", async () => {
        await navigateToNoShowTab();

        expect(screen.getByRole("option", { name: "Soweto Clinic" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Cape Town CHC" })).toBeInTheDocument();
    });

    it("selecting a facility passes the correct facilityId to useNoShowRates", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();

        await user.selectOptions(panel.querySelector("select"), "2");

        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ facilityId: 2 })
        );
    });

    it("resetting to All Facilities passes null to useNoShowRates", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();
        const select = panel.querySelector("select");

        await user.selectOptions(select, "1");
        await user.selectOptions(select, "");

        expect(mockUseNoShowRates).toHaveBeenLastCalledWith(
            expect.objectContaining({ facilityId: null })
        );
    });
});


describe("No-Show Rates tab - date range filter", () => {
    it("setting a start date passes it to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToNoShowTab();

        const panel = getVisiblePanel();
        const [startInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });

        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: "2024-06-01" })
        );
    });

    it("setting an end date passes it to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToNoShowTab();

        const panel = getVisiblePanel();
        const [, endInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(endInput, { target: { value: "2024-06-30" } });

        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ endDate: "2024-06-30" })
        );
    });

    it("clearing the start date passes null to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToNoShowTab();

        const panel = getVisiblePanel();
        const [startInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        fireEvent.change(startInput, { target: { value: "" } });

        expect(mockUseNoShowRates).toHaveBeenLastCalledWith(
            expect.objectContaining({ startDate: null })
        );
    });

    it("useNoShowRates is initially called with null startDate and null endDate", async () => {
        await navigateToNoShowTab();

        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: null, endDate: null })
        );
    });
});


describe("No-Show Rates tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        await navigateToNoShowTab();

        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).not.toBeDisabled();
        expect(pdfBtn).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with chart data and filename 'noshows'", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        expect(mockExportCSV).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ "No-Show Rate %": 28 }),
            ]),
            "noshows"
        );
    });

    it("clicking PDF calls exportPDF with correct title and filename", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title:    expect.stringContaining("No-Show"),
                filename: "noshows",
            })
        );
    });

    it("clicking PDF passes the correct column definitions", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map((c) => c.header);
        expect(headers).toContain("Date");
        expect(headers).toContain("No-Show Rate (%)");
        expect(headers).toContain("No-Shows");
        expect(headers).toContain("Total Appointments");
    });

    it("chart data passed to CSV is in chronological order (oldest first)", async () => {
        const user = await navigateToNoShowTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        const [chartData] = mockExportCSV.mock.calls[0];
        expect(chartData[0].date).toBe("2024-06-01");
        expect(chartData[1].date).toBe("2024-06-02");
    });
});


describe("No-Show Rates tab - tab switching", () => {
    it("No-Show Rates tab gets the active class when clicked", async () => {
        await navigateToNoShowTab();

        expect(screen.getByRole("tab", { name: /no-show rates/i })).toHaveClass("bg-teal-500");
    });

    it("clicking Wait Times tab hides No-Show Rates panel", async () => {
        const user = await navigateToNoShowTab();

        await user.click(screen.getByRole("tab", { name: /wait times/i }));

        expect(document.getElementById("tabpanel-1")).toHaveAttribute("hidden");
    });

    it("clicking Custom View tab hides No-Show Rates panel", async () => {
        const user = await navigateToNoShowTab();

        await user.click(screen.getByRole("tab", { name: /custom view/i }));

        expect(document.getElementById("tabpanel-1")).toHaveAttribute("hidden");
    });

    it("clicking back to No-Show Rates shows its panel again", async () => {
        const user = await navigateToNoShowTab();

        await user.click(screen.getByRole("tab", { name: /wait times/i    }));
        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));

        expect(document.getElementById("tabpanel-1")).not.toHaveAttribute("hidden");
    });
});


describe("Custom View tab - initial render", () => {
    beforeEach(async () => {
        await navigateToCustomViewTab();
    });

    openCustomViewTab();
});


describe("Custom View tab - table headers", () => {
    beforeEach(async () => {
        await navigateToCustomViewTab();
    });

    openCustomViewTableHeaders();
});


describe("Custom View tab - loading state", () => {
    beforeEach(async () => {
        await navigateToCustomViewLoading();
    });

    openCustomViewLoadingState();
});


describe("Custom View tab - empty state", () => {
    beforeEach(async () => {
        await navigateToCustomViewEmpty();
    });

    openCustomViewEmptyState();
});


describe("Custom View tab - table data", () => {
    beforeEach(async () => {
        await navigateToCustomViewTab();
    });

    it("renders patient full names", () => {
        expect(screen.getByText("Jane Dlamini")).toBeVisible();
        expect(screen.getByText("John Mokoena")).toBeVisible();
    });

    it("renders patient email as contact when available", () => {
        expect(screen.getByText("jane@example.com")).toBeVisible();
    });

    it("renders patient phone as contact when email is null", () => {
        expect(screen.getByText("0831234567")).toBeVisible();
    });

    it("renders facility names", () => {
    const panel = getVisiblePanel();
    const sowetoTd = [...panel.querySelectorAll("td")].find((td) => td.textContent === "Soweto Clinic");
    const capeTd   = [...panel.querySelectorAll("td")].find((td) => td.textContent === "Cape Town CHC");
    expect(sowetoTd).toBeVisible();
    expect(capeTd).toBeVisible();
});

    it("renders appointment type with underscore replaced", () => {
        expect(screen.getByText("scheduled")).toBeVisible();
        expect(screen.getByText("walk in")).toBeVisible();
    });

    it("renders wait minutes with 'min' suffix", () => {
        expect(screen.getByText("10 min")).toBeVisible();
    });

    it("renders service minutes with 'min' suffix", () => {
        expect(screen.getByText("15 min")).toBeVisible();
    });

    it("renders '—' for null wait_minutes", () => {
        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it("shows correct records count", () => {
        expect(screen.getByText("2 records")).toBeVisible();
    });

    it("renders status badge for 'complete'", () => {
        expect(screen.getByText("complete")).toBeVisible();
    });

    it("renders status badge for 'no show'", () => {
        expect(screen.getByText("no show")).toBeVisible();
    });
});


describe("Custom View tab - facility filter", () => {
    it("renders All Facilities as the default selected option", async () => {
        await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        expect(combos[0]).toHaveValue("");
    });

    it("renders facility options from useFacilities", async () => {
        await navigateToCustomViewTab();
        expect(screen.getByRole("option", { name: "Soweto Clinic" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Cape Town CHC" })).toBeInTheDocument();
    });

    it("selecting a facility passes the correct facilityId to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[0], "1");

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ facilityId: 1 })
        );
    });

    it("resetting to All Facilities passes null facilityId to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[0], "1");
        await user.selectOptions(combos[0], "");

        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ facilityId: null })
        );
    });
});


describe("Custom View tab - status filter", () => {
    it("All Statuses is the default option", async () => {
        await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        expect(combos[1]).toHaveValue("");
    });

    it("selecting a status passes it to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[1], "no_show");

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ status: "no_show" })
        );
    });

    it("resetting status to All passes null to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[1], "booked");
        await user.selectOptions(combos[1], "");

        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ status: null })
        );
    });
});


describe("Custom View tab - type filter", () => {
    it("All Types is the default option", async () => {
        await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        expect(combos[2]).toHaveValue("");
    });

    it("selecting Scheduled passes 'scheduled' to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[2], "scheduled");

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ type: "scheduled" })
        );
    });

    it("selecting Walk-in passes 'walk_in' to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[2], "walk_in");

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ type: "walk_in" })
        );
    });

    it("resetting type to All passes null to useCustomView", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const combos = panel.querySelectorAll("select");
        await user.selectOptions(combos[2], "walk_in");
        await user.selectOptions(combos[2], "");

        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: null })
        );
    });
});


describe("Custom View tab - date range filter", () => {
    it("useCustomView is initially called with null startDate and null endDate", async () => {
        await navigateToCustomViewTab();

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: null, endDate: null })
        );
    });

    it("setting a start date passes it to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToCustomViewTab();

        const panel = getVisiblePanel();
        const [startInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: "2024-06-01" })
        );
    });

    it("setting an end date passes it to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToCustomViewTab();

        const panel = getVisiblePanel();
        const [, endInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(endInput, { target: { value: "2024-06-30" } });

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ endDate: "2024-06-30" })
        );
    });

    it("clearing the start date passes null to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        await navigateToCustomViewTab();

        const panel = getVisiblePanel();
        const [startInput] = panel.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        fireEvent.change(startInput, { target: { value: "" } });

        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ startDate: null })
        );
    });
});


describe("Custom View tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        await navigateToCustomViewTab();

        const panel = getVisiblePanel();
        const buttons = panel.querySelectorAll("button");
        const csvBtn = [...buttons].find((b) => b.textContent.includes("CSV"));
        const pdfBtn = [...buttons].find((b) => b.textContent.includes("PDF"));
        expect(csvBtn).not.toBeDisabled();
        expect(pdfBtn).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with filename 'appointments'", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        expect(mockExportCSV).toHaveBeenCalledWith(expect.any(Array), "appointments");
    });

    it("CSV data includes all column labels as keys", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]).toHaveProperty("Patient");
        expect(rows[0]).toHaveProperty("Facility");
        expect(rows[0]).toHaveProperty("Status");
    });

    it("CSV patient name is the full name (first + surname joined)", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]["Patient"]).toBe("Jane Dlamini");
    });

    it("CSV contact uses email when available", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]["Contact"]).toBe("jane@example.com");
    });

    it("CSV contact falls back to phone when email is null", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const csvBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("CSV"));
        await user.click(csvBtn);

        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[1]["Contact"]).toBe("0831234567");
    });

    it("clicking PDF calls exportPDF with correct title and filename", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title:    expect.stringContaining("Custom"),
                filename: "appointments",
            })
        );
    });

    it("clicking PDF passes all expected column headers", async () => {
        const user = await navigateToCustomViewTab();
        const panel = getVisiblePanel();
        const pdfBtn = [...panel.querySelectorAll("button")].find((b) => b.textContent.includes("PDF"));
        await user.click(pdfBtn);

        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map(c => c.header);
        expect(headers).toContain("Patient");
        expect(headers).toContain("Facility");
        expect(headers).toContain("Status");
        expect(headers).toContain("Contact");
        expect(headers).toContain("Type");
        expect(headers).toContain("Wait");
        expect(headers).toContain("Service");
    });
});


describe("Custom View tab - tab switching", () => {
    it("Custom View tab gets the active class when clicked", async () => {
        await navigateToCustomViewTab();

        expect(screen.getByRole("tab", { name: /custom view/i })).toHaveClass("bg-teal-500");
        expect(screen.getByRole("tab", { name: /wait times/i  })).not.toHaveClass("bg-teal-500");
    });

    it("clicking Wait Times tab hides Custom View panel", async () => {
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("tab", { name: /wait times/i }));

        expect(document.getElementById("tabpanel-2")).toHaveAttribute("hidden");
    });

    it("clicking No-Show Rates tab hides Custom View panel", async () => {
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("tab", { name: /no-show rates/i }));

        expect(document.getElementById("tabpanel-2")).toHaveAttribute("hidden");
    });

    it("clicking back to Custom View shows its panel again", async () => {
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("tab", { name: /wait times/i  }));
        await user.click(screen.getByRole("tab", { name: /custom view/i }));

        expect(document.getElementById("tabpanel-2")).not.toHaveAttribute("hidden");
    });
});


describe("Custom View tab - initial hook call args", () => {
    it("useCustomView is called with all null filters on first render", async () => {
        await navigateToCustomViewTab();

        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({
                facilityId: null,
                status:     null,
                type:       null,
                startDate:  null,
                endDate:    null,
            })
        );
    });
});