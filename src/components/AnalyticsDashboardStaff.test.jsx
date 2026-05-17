import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import AnalyticsDashboardStaff from "./AnalyticsDashboardStaff";




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


const mockSupabaseMaybeSingle = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseEq  = vi.fn();
const mockSupabaseFrom  = vi.fn();

vi.mock("#lib/supabase", () => ({
    supabase: {
        from: (...args) => mockSupabaseFrom(...args),
    },
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
        patient_phone: null,
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
        appointment_type: "walk_in",
        status: "no_show",
        queue_status: null,
        wait_minutes: null,
        service_minutes: null,
    },
];

const mockUseWaitTimes = vi.fn(() => ({ data: defaultWaitData, loading: false }));
const mockUseNoShowRates = vi.fn(() => ({ data: [], loading: false }));
const mockUseCustomView  = vi.fn(() => ({ data: [], loading: false }));

vi.mock("#hooks/useAnalytics", () => ({
    useWaitTimes: (...args) => mockUseWaitTimes(...args),
    useNoShowRates: (...args) => mockUseNoShowRates(...args),
    useCustomView: (...args) => mockUseCustomView(...args),
}));




//helpers
function mockSupabaseSuccess({
    profile = { id: "profile-1" },
    assignment = { facility_id: 42, facilities: { id: 42, name: "Soweto Clinic" } },
} = {}) {
    localStorage.setItem(
        "userIdentity",
        JSON.stringify({ auth_provider: "google", provider_user_id: "uid-1" })
    );

    const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
    };

    chain.maybeSingle
        .mockResolvedValueOnce({ data: profile, error: null })
        .mockResolvedValueOnce({ data: assignment, error: null });

    mockSupabaseFrom.mockReturnValue(chain);
}


async function renderStaff(facilityName = "Soweto Clinic") {
    mockSupabaseSuccess({ assignment: { facility_id: 42, facilities: { id: 42, name: facilityName } } });
    const user = userEvent.setup();
    render(<AnalyticsDashboardStaff />);
    await waitFor(() => expect(screen.getByText(`📍 ${facilityName}`)).toBeVisible());
    return user;
}


//navigate to page ...
async function navigateToWaitTimesTab() {
    const user = await renderStaff();
    await waitFor(() => expect(screen.getByText(/overall avg wait/i)).toBeVisible());
    return user;
}

async function navigateToWaitTimesLoading() {
    mockUseWaitTimes.mockReturnValue({ data: [], loading: true });
    const user = await renderStaff();
    return user;
}

async function navigateToNoShowTab() {
    const user = await renderStaff();
    await user.click(screen.getByRole("button", { name: /no-show rates/i }));
    await waitFor(() => expect(screen.getByText(/overall no-show rate/i)).toBeVisible());
    return user;
}

async function navigateToNoShowLoading() {
    mockUseNoShowRates.mockReturnValue({ data: [], loading: true });
    const user = await renderStaff();
    await user.click(screen.getByRole("button", { name: /no-show rates/i }));
    await waitFor(() => expect(screen.getByText(/overall no-show rate/i)).toBeVisible());
    return user;
}

async function navigateToCustomViewTab() {
    const user = await renderStaff();
    await user.click(screen.getByRole("button", { name: /custom view/i }));
    await waitFor(() => expect(screen.getByText(/^appointments$/i)).toBeVisible());
    return user;
}

async function navigateToCustomViewEmpty() {
    mockUseCustomView.mockReturnValue({ data: [], loading: false });
    const user = await renderStaff();
    await user.click(screen.getByRole("button", { name: /custom view/i }));
    await waitFor(() => expect(screen.getByText(/^appointments$/i)).toBeVisible());
    return user;
}

async function navigateToCustomViewLoading() {
    mockUseCustomView.mockReturnValue({ data: [], loading: true });
    const user = await renderStaff();
    await user.click(screen.getByRole("button", { name: /custom view/i }));
    await waitFor(() => expect(screen.getByText(/^appointments$/i)).toBeVisible());
    return user;
}

//opening pages
function openAnalyticsHeader() {
    it("renders the Analytics heading", () => {
        expect(screen.getByRole("heading", { name: /^analytics$/i })).toBeVisible();
    });

    it("renders all three tab buttons", () => {
        expect(screen.getByRole("button", { name: /wait times/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /no-show rates/i })).toBeVisible();
        expect(screen.getByRole("button", { name: /custom view/i })).toBeVisible();
    });

    it("Wait Times tab is active by default", () => {
        expect(screen.getByRole("button", { name: /wait times/i })).toHaveClass("tab-btn--active");
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

    it("renders the CSV export button", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getByRole("button", { name: /pdf/i })).toBeVisible();
    });

    it("does NOT render a facility filter dropdown (staff see only their facility)", () => {
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
}

function openWaitTimesLoadingState() {
    it("shows '…' in all three stat cards while loading", () => {
        const ellipses = screen.getAllByText("…");
        expect(ellipses.length).toBeGreaterThanOrEqual(3);
    });

    it("export buttons are disabled while loading", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
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

    it("renders two date range inputs", () => {
        const dateInputs = document.querySelectorAll("input[type='date']");
        expect(dateInputs).toHaveLength(2);
    });

    it("renders the CSV export button", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getByRole("button", { name: /pdf/i })).toBeVisible();
    });

    it("does NOT render a facility filter dropdown (facility is locked to staff assignment)", () => {
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
}

function openNoShowLoadingState() {
    it("shows '…' in all four stat cards while loading", () => {
        const ellipses = screen.getAllByText("…");
        expect(ellipses.length).toBeGreaterThanOrEqual(4);
    });

    it("export buttons are disabled while loading", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
    });

    it("does not show the high no-show warning while loading", () => {
        expect(screen.queryByText(/no-show rate is above 20%/i)).not.toBeInTheDocument();
    });
}

function openCustomViewTab() {
    it("renders the Appointments table heading", () => {
        expect(screen.getByText(/^appointments$/i)).toBeVisible();
    });

    it("renders the records count", () => {
        expect(screen.getByText(/records/i)).toBeVisible();
    });

    it("renders the Status filter dropdown", () => {
        expect(screen.getByRole("option", { name: /all statuses/i })).toBeInTheDocument();
    });

    it("renders the Type filter dropdown", () => {
        expect(screen.getByRole("option", { name: /all types/i })).toBeInTheDocument();
    });

    it("renders two date range inputs", () => {
        const dateInputs = document.querySelectorAll("input[type='date']");
        expect(dateInputs).toHaveLength(2);
    });

    it("renders the CSV export button", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeVisible();
    });

    it("renders the PDF export button", () => {
        expect(screen.getByRole("button", { name: /pdf/i })).toBeVisible();
    });

    it("does NOT render a facility filter dropdown", () => {
        const combos = screen.getAllByRole("combobox");
        expect(combos).toHaveLength(2);
    });
}

function openCustomViewTableHeaders() {
    const EXPECTED_HEADERS = [
        "Booked At", "Patient", "Contact", "Type", "Status", "Queue", "Wait", "Service",
    ];

    EXPECTED_HEADERS.forEach(header => {
        it(`renders "${header}" column header`, () => {
            expect(screen.getByText(header)).toBeVisible();
        });
    });

    it('does NOT render a "Facility" column header', () => {
        expect(screen.queryByText(/^facility$/i)).not.toBeInTheDocument();
    });
}

function openCustomViewLoadingState() {
    it("shows 'Loading…' records label while loading", () => {
        const loadingEls = screen.getAllByText("Loading…");
        expect(loadingEls.length).toBeGreaterThanOrEqual(1);
    });

    it("export buttons are disabled while loading", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
    });
}

function openCustomViewEmptyState() {
    it("shows the empty message when no appointments match", () => {
        expect(screen.getByText(/no appointments match your filters/i)).toBeVisible();
    });

    it("export buttons are disabled when data is empty", () => {
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
    });
}



beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseWaitTimes.mockReturnValue({ data: defaultWaitData, loading: false });
    mockUseNoShowRates.mockReturnValue({ data: [], loading: false });
    mockUseCustomView.mockReturnValue({ data: [], loading: false });
});


//tests
describe("Analytics Staff - facility resolution - loading state", () => {
    it("shows 'Loading facility…' before Supabase resolves", () => {
        localStorage.setItem(
            "userIdentity",
            JSON.stringify({ auth_provider: "google", provider_user_id: "uid-1" })
        );

        const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})) };
        mockSupabaseFrom.mockReturnValue(chain);

        render(<AnalyticsDashboardStaff />);
        expect(screen.getByText(/loading facility/i)).toBeVisible();
    });
});

describe("Analytics Staff - facility resolution - missing identity", () => {
    it("shows 'Not logged in.' when localStorage has no identity", async () => {
        localStorage.clear();
        const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
        mockSupabaseFrom.mockReturnValue(chain);

        render(<AnalyticsDashboardStaff />);
        await waitFor(() => expect(screen.getByText(/not logged in/i)).toBeVisible());
    });
});

describe("Analytics Staff - facility resolution - profile error", () => {
    it("shows a profile error message when the profiles query fails", async () => {
        localStorage.setItem(
            "userIdentity",
            JSON.stringify({ auth_provider: "google", provider_user_id: "uid-1" })
        );
        const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
        };
        mockSupabaseFrom.mockReturnValue(chain);

        render(<AnalyticsDashboardStaff />);
        await waitFor(() => expect(screen.getByText(/could not load your profile/i)).toBeVisible());
    });
});

describe("Analytics Staff - facility resolution - no assignment", () => {
    it("shows 'not assigned to a facility' when staff_assignments returns nothing", async () => {
        localStorage.setItem(
            "userIdentity",
            JSON.stringify({ auth_provider: "google", provider_user_id: "uid-1" })
        );
        const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn()
                .mockResolvedValueOnce({ data: { id: "profile-1" }, error: null })   // profiles
                .mockResolvedValueOnce({ data: null, error: null }),                 // staff_assignments
        };
        mockSupabaseFrom.mockReturnValue(chain);

        render(<AnalyticsDashboardStaff />);
        await waitFor(() => expect(screen.getByText(/not assigned to a facility/i)).toBeVisible());
    });
});

describe("Analytics Staff - facility resolution - success", () => {
    it("renders the dashboard after facility loads", async () => {
        await renderStaff("Soweto Clinic");
        expect(screen.getByRole("heading", { name: /^analytics$/i })).toBeVisible();
    });

    it("displays the resolved facility name below the heading", async () => {
        await renderStaff("Cape Town CHC");
        expect(screen.getByText("📍 Cape Town CHC")).toBeVisible();
    });

    it("passes the resolved facilityId to useWaitTimes", async () => {
        await renderStaff();
        expect(mockUseWaitTimes).toHaveBeenCalledWith(
            expect.objectContaining({ facilityId: 42 })
        );
    });
});



describe("Analytics Staff - page header", () => {
    beforeEach(async () => { await navigateToWaitTimesTab(); });
    openAnalyticsHeader();
});



describe("Wait Times tab - initial render", () => {
    beforeEach(async () => { await navigateToWaitTimesTab(); });
    openWaitTimesTab();
});

describe("Wait Times tab - loading state", () => {
    beforeEach(async () => { await navigateToWaitTimesLoading(); });
    openWaitTimesLoadingState();
});

describe("Wait Times tab - computed stat values", () => {
    beforeEach(async () => { await navigateToWaitTimesTab(); });

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
        const peakCard = screen.getByText(/peak hour/i).closest("div");
        expect(peakCard).toHaveTextContent("—");
    });

    it("shows 0 for Total Served when there is no data", async () => {
        mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
        await navigateToWaitTimesTab();
        expect(screen.getByText("0")).toBeVisible();
    });

    it("export buttons are disabled when data is empty", async () => {
        mockUseWaitTimes.mockReturnValue({ data: [], loading: false });
        await navigateToWaitTimesTab();
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
    });
});

describe("Wait Times tab - single row data", () => {
    const singleRow = [{
        hour_of_day: 9,
        avg_wait_minutes: 15,
        min_wait_minutes: 5,
        max_wait_minutes: 30,
        total_served: 10,
    }];

    it("shows the single row's avg wait as the overall average", async () => {
        mockUseWaitTimes.mockReturnValue({ data: singleRow, loading: false });
        await navigateToWaitTimesTab();
        expect(screen.getByText("15.0 min")).toBeVisible();
    });

    it("shows the single row as the peak hour", async () => {
        mockUseWaitTimes.mockReturnValue({ data: singleRow, loading: false });
        await navigateToWaitTimesTab();
        expect(screen.getByText("9 am")).toBeVisible();
    });
});

describe("Wait Times tab - hour label formatting", () => {
    it("formats hour 0 as '12 am'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{ hour_of_day: 0, avg_wait_minutes: 5, min_wait_minutes: 2, max_wait_minutes: 10, total_served: 5 }],
            loading: false,
        });
        await navigateToWaitTimesTab();
        expect(screen.getByText("12 am")).toBeVisible();
    });

    it("formats hour 12 as '12 pm'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{ hour_of_day: 12, avg_wait_minutes: 18, min_wait_minutes: 5, max_wait_minutes: 35, total_served: 40 }],
            loading: false,
        });
        await navigateToWaitTimesTab();
        expect(screen.getByText("12 pm")).toBeVisible();
    });

    it("formats afternoon hour 15 as '3 pm'", async () => {
        mockUseWaitTimes.mockReturnValue({
            data: [{ hour_of_day: 15, avg_wait_minutes: 22, min_wait_minutes: 8, max_wait_minutes: 45, total_served: 60 }],
            loading: false,
        });
        await navigateToWaitTimesTab();
        expect(screen.getByText("3 pm")).toBeVisible();
    });
});

describe("Wait Times tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        await navigateToWaitTimesTab();
        expect(screen.getByRole("button", { name: /csv/i })).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with chart data and filename 'wait-times'", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
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
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title: expect.stringContaining("Wait Times"),
                filename: "wait-times",
            })
        );
    });

    it("clicking PDF passes the correct column definitions", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map(c => c.header);
        expect(headers).toContain("Hour of Day");
        expect(headers).toContain("Avg Wait (min)");
        expect(headers).toContain("Min Wait (min)");
        expect(headers).toContain("Max Wait (min)");
    });
});

describe("Wait Times tab - tab switching", () => {
    it("clicking No-Show Rates tab hides the Wait Times content", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        expect(screen.queryByText(/overall avg wait/i)).not.toBeInTheDocument();
    });

    it("clicking Custom View tab hides the Wait Times content", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /custom view/i }));
        expect(screen.queryByText(/overall avg wait/i)).not.toBeInTheDocument();
    });

    it("clicking back to Wait Times tab restores its content", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        await user.click(screen.getByRole("button", { name: /wait times/i }));
        expect(screen.getByText(/overall avg wait/i)).toBeVisible();
    });

    it("No-Show Rates tab gets active class when clicked", async () => {
        const user = await navigateToWaitTimesTab();
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        expect(screen.getByRole("button", { name: /no-show rates/i })).toHaveClass("tab-btn--active");
        expect(screen.getByRole("button", { name: /wait times/i })).not.toHaveClass("tab-btn--active");
    });
});



describe("No-Show Rates tab - initial render", () => {
    beforeEach(async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
    });
    openNoShowTab();
});

describe("No-Show Rates tab - loading state", () => {
    beforeEach(async () => { await navigateToNoShowLoading(); });
    openNoShowLoadingState();
});

describe("No-Show Rates tab - computed stat values", () => {
    beforeEach(async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
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
        mockSupabaseSuccess();
        render(<AnalyticsDashboardStaff />);
        await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        await waitFor(() => expect(screen.getByText(/overall no-show rate/i)).toBeVisible());
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
        expect(screen.getByRole("button", { name: /csv/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).toBeDisabled();
    });

    it("does not show the high no-show warning banner", () => {
        expect(screen.queryByText(/no-show rate is above 20%/i)).not.toBeInTheDocument();
    });
});

describe("No-Show Rates tab - high rate warning banner", () => {
    it("shows warning banner when overall rate is at or above 20%", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab(); // defaultNoShowData → 28.6%
        expect(screen.getByText(/no-show rate is above 20%/i)).toBeVisible();
    });

    it("warning banner mentions appointment reminders", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        expect(screen.getByText(/appointment reminder/i)).toBeVisible();
    });

    it("does not show warning banner when rate is below 20%", async () => {
        mockUseNoShowRates.mockReturnValue({ data: lowNoShowData, loading: false });
        mockSupabaseSuccess();
        const user = userEvent.setup();
        render(<AnalyticsDashboardStaff />);
        await waitFor(() => expect(screen.getByText("📍 Soweto Clinic")).toBeVisible());
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        await waitFor(() => expect(screen.getByText(/overall no-show rate/i)).toBeVisible());
        expect(screen.queryByText(/no-show rate is above 20%/i)).not.toBeInTheDocument();
    });

    it("does not show warning banner while data is loading", async () => {
        await navigateToNoShowLoading();
        expect(screen.queryByText(/no-show rate is above 20%/i)).not.toBeInTheDocument();
    });
});

describe("No-Show Rates tab - date range filter", () => {
    it("setting a start date passes it to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        const [startInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: "2024-06-01" })
        );
    });

    it("setting an end date passes it to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        const [, endInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(endInput, { target: { value: "2024-06-30" } });
        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ endDate: "2024-06-30" })
        );
    });

    it("clearing the start date passes null to useNoShowRates", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        const [startInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        fireEvent.change(startInput, { target: { value: "" } });
        expect(mockUseNoShowRates).toHaveBeenLastCalledWith(
            expect.objectContaining({ startDate: null })
        );
    });

    it("useNoShowRates is initially called with null startDate and null endDate", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: null, endDate: null })
        );
    });

    it("useNoShowRates is called with the resolved facilityId, not null", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        expect(mockUseNoShowRates).toHaveBeenCalledWith(
            expect.objectContaining({ facilityId: 42 })
        );
    });
});

describe("No-Show Rates tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        expect(screen.getByRole("button", { name: /csv/i })).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with chart data and filename 'noshows'", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        expect(mockExportCSV).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ "No-Show Rate %": 28 }),
            ]),
            "noshows"
        );
    });

    it("clicking PDF calls exportPDF with correct title and filename", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title:    expect.stringContaining("No-Show"),
                filename: "noshows",
            })
        );
    });

    it("clicking PDF passes the correct column definitions", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map(c => c.header);
        expect(headers).toContain("Date");
        expect(headers).toContain("No-Show Rate (%)");
        expect(headers).toContain("No-Shows");
        expect(headers).toContain("Total Appointments");
    });

    it("chart data passed to CSV is in chronological order (oldest first)", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [chartData] = mockExportCSV.mock.calls[0];
        expect(chartData[0].date).toBe("2024-06-01");
        expect(chartData[1].date).toBe("2024-06-02");
    });
});

describe("No-Show Rates tab - tab switching", () => {
    it("No-Show Rates tab gets the active class when clicked", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();
        expect(screen.getByRole("button", { name: /no-show rates/i })).toHaveClass("tab-btn--active");
    });

    it("clicking Wait Times tab hides No-Show Rates content", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /wait times/i }));
        expect(screen.queryByText(/overall no-show rate/i)).not.toBeInTheDocument();
    });

    it("clicking Custom View tab hides No-Show Rates content", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        const user = await navigateToNoShowTab();
        await user.click(screen.getByRole("button", { name: /custom view/i }));
        expect(screen.queryByText(/overall no-show rate/i)).not.toBeInTheDocument();
    });

    it("clicking back to No-Show Rates restores its content", async () => {
        mockUseNoShowRates.mockReturnValue({ data: defaultNoShowData, loading: false });
        await navigateToNoShowTab();

        const user = userEvent.setup();

        await user.click(screen.getByRole("button", { name: /wait times/i }));
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        expect(screen.getByText(/overall no-show rate/i)).toBeVisible();
    });
});



describe("Custom View tab - initial render", () => {
    beforeEach(async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
    });
    openCustomViewTab();
});

describe("Custom View tab - table headers", () => {
    beforeEach(async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
    });
    openCustomViewTableHeaders();
});

describe("Custom View tab - loading state", () => {
    beforeEach(async () => { await navigateToCustomViewLoading(); });
    openCustomViewLoadingState();
});

describe("Custom View tab - empty state", () => {
    beforeEach(async () => { await navigateToCustomViewEmpty(); });
    openCustomViewEmptyState();
});

describe("Custom View tab - table data", () => {
    beforeEach(async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
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

describe("Custom View tab - status filter", () => {
    it("All Statuses is the default option", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        expect(combos[0]).toHaveValue("");
    });

    it("selecting a status passes it to useCustomView", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        await user.selectOptions(combos[0], "no_show");
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ status: "no_show" })
        );
    });

    it("resetting status to All passes null to useCustomView", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        await user.selectOptions(combos[0], "booked");
        await user.selectOptions(combos[0], "");
        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ status: null })
        );
    });
});

describe("Custom View tab - type filter", () => {
    it("All Types is the default option", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        expect(combos[1]).toHaveValue("");
    });

    it("selecting Scheduled passes 'scheduled' to useCustomView", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        await user.selectOptions(combos[1], "scheduled");
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ type: "scheduled" })
        );
    });

    it("selecting Walk-in passes 'walk_in' to useCustomView", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        await user.selectOptions(combos[1], "walk_in");
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ type: "walk_in" })
        );
    });

    it("resetting type to All passes null to useCustomView", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        const combos = screen.getAllByRole("combobox");
        await user.selectOptions(combos[1], "walk_in");
        await user.selectOptions(combos[1], "");
        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: null })
        );
    });
});

describe("Custom View tab - date range filter", () => {
    it("useCustomView is initially called with null startDate and null endDate", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: null, endDate: null })
        );
    });

    it("setting a start date passes it to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        const [startInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ startDate: "2024-06-01" })
        );
    });

    it("setting an end date passes it to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        const [, endInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(endInput, { target: { value: "2024-06-30" } });
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({ endDate: "2024-06-30" })
        );
    });

    it("clearing the start date passes null to useCustomView", async () => {
        const { fireEvent } = await import("@testing-library/react");
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        const [startInput] = document.querySelectorAll("input[type='date']");
        fireEvent.change(startInput, { target: { value: "2024-06-01" } });
        fireEvent.change(startInput, { target: { value: "" } });
        expect(mockUseCustomView).toHaveBeenLastCalledWith(
            expect.objectContaining({ startDate: null })
        );
    });
});

describe("Custom View tab - export buttons", () => {
    it("export buttons are enabled when data is present", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        expect(screen.getByRole("button", { name: /csv/i })).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /pdf/i })).not.toBeDisabled();
    });

    it("clicking CSV calls exportCSV with filename 'appointments'", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        expect(mockExportCSV).toHaveBeenCalledWith(expect.any(Array), "appointments");
    });

    it("CSV data includes all column labels as keys", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]).toHaveProperty("Patient");
        expect(rows[0]).toHaveProperty("Status");
        expect(rows[0]).toHaveProperty("Type");
    });

    it("CSV does NOT include a Facility key (staff view has no facility column)", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]).not.toHaveProperty("Facility");
    });

    it("CSV patient name is the full name (first + surname joined)", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]["Patient"]).toBe("Jane Dlamini");
    });

    it("CSV contact uses email when available", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[0]["Contact"]).toBe("jane@example.com");
    });

    it("CSV contact falls back to phone when email is null", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /csv/i }));
        const [rows] = mockExportCSV.mock.calls[0];
        expect(rows[1]["Contact"]).toBe("0831234567");
    });

    it("clicking PDF calls exportPDF with correct title and filename", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        expect(mockExportPDF).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                title:    expect.stringContaining("Custom"),
                filename: "appointments",
            })
        );
    });

    it("clicking PDF passes all expected column headers", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /pdf/i }));
        const [, options] = mockExportPDF.mock.calls[0];
        const headers = options.columns.map(c => c.header);
        expect(headers).toContain("Patient");
        expect(headers).toContain("Status");
        expect(headers).toContain("Contact");
        expect(headers).toContain("Type");
        expect(headers).toContain("Wait");
        expect(headers).toContain("Service");
        expect(headers).not.toContain("Facility");
    });
});

describe("Custom View tab - initial hook call args", () => {
    it("useCustomView is called with all null filters and the resolved facilityId on first render", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        expect(mockUseCustomView).toHaveBeenCalledWith(
            expect.objectContaining({
                facilityId: 42,
                status:     null,
                type:       null,
                startDate:  null,
                endDate:    null,
            })
        );
    });
});

describe("Custom View tab - tab switching", () => {
    it("Custom View tab gets the active class when clicked", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        await navigateToCustomViewTab();
        expect(screen.getByRole("button", { name: /custom view/i })).toHaveClass("tab-btn--active");
        expect(screen.getByRole("button", { name: /wait times/i })).not.toHaveClass("tab-btn--active");
    });

    it("clicking Wait Times tab hides Custom View content", async () => {
        mockUseCustomView.mockReturnValue({ data: [], loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /wait times/i }));
        expect(screen.queryByText(/no appointments match/i)).not.toBeInTheDocument();
    });

    it("clicking No-Show Rates tab hides Custom View content", async () => {
        mockUseCustomView.mockReturnValue({ data: [], loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /no-show rates/i }));
        expect(screen.queryByText(/no appointments match/i)).not.toBeInTheDocument();
    });

    it("clicking back to Custom View restores its content", async () => {
        mockUseCustomView.mockReturnValue({ data: defaultCustomData, loading: false });
        const user = await navigateToCustomViewTab();
        await user.click(screen.getByRole("button", { name: /wait times/i }));
        await user.click(screen.getByRole("button", { name: /custom view/i }));
        expect(screen.getByText(/^appointments$/i)).toBeVisible();
    });
});