import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import {
    Badge,
    OverviewPanel,
    AppointmentsPanel,
    PatientQueuePanel,
    NotificationsPanel,
    ProfilePanel,
} from "./DashboardPanels";

const mockProfile = { id: "p1", name: "Jane", surname: "Doe", email: "jane@test.com", role: "patient" };

const mockAppointment = {
    id: "a1",
    status: "booked",
    appointment_slots: { slot_date: "2026-06-01", slot_time: "09:00:00" },
};

const mockCancelledAppt = {
    id: "a2",
    status: "cancelled",
    appointment_slots: { slot_date: "2026-06-02", slot_time: "10:00:00" },
};

function wrap(ui) {
    return render(<BrowserRouter>{ui}</BrowserRouter>);
}

// Badge
describe("Badge (DashboardPanels)", () => {
    it("renders booked status", () => {
        render(<Badge status="booked" />);
        expect(screen.getByText("booked")).toBeInTheDocument();
    });

    it("renders cancelled status", () => {
        render(<Badge status="cancelled" />);
        expect(screen.getByText("cancelled")).toBeInTheDocument();
    });

    it("renders unknown status", () => {
        render(<Badge status="unknown" />);
        expect(screen.getByText("unknown")).toBeInTheDocument();
    });
});

// OverviewPanel
describe("OverviewPanel", () => {
    const baseProps = {
        profile: mockProfile,
        appointments: [mockAppointment],
        upcomingAppts: [mockAppointment],
        activeQueue: null,
        unreadCount: 2,
        queueData: null,
        slotDate: null,
        slotTime: null,
        isAppointmentToday: false,
        lastClinic: null,
        onReschedule: vi.fn(),
        onCancel: vi.fn(),
        onJoinQueue: vi.fn(),
    };

    it("renders Overview heading and stat cards", () => {
        wrap(<OverviewPanel {...baseProps} />);
        expect(screen.getByText("Overview")).toBeInTheDocument();
        expect(screen.getByText("Upcoming")).toBeInTheDocument();
        expect(screen.getByText("Appointments")).toBeInTheDocument();
        expect(screen.getByText("In Queue")).toBeInTheDocument();
        expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("returns null when profile is null", () => {
        const { container } = wrap(<OverviewPanel {...baseProps} profile={null} />);
        expect(container.firstChild).toBeNull();
    });

    it("shows Check In button when appointment is today and not in queue", () => {
        wrap(<OverviewPanel {...baseProps} isAppointmentToday={true} activeQueue={null} />);
        expect(screen.getByText("Check In — Join Queue")).toBeInTheDocument();
    });

    it("shows checked-in message when appointment is today and in queue", () => {
        wrap(<OverviewPanel {...baseProps} isAppointmentToday={true} activeQueue={[]} queueData={{ position: 3 }} />);
        expect(screen.getByText(/Position #3/)).toBeInTheDocument();
    });

    it("shows check-in reminder when upcoming appts but not today", () => {
        wrap(<OverviewPanel {...baseProps} isAppointmentToday={false} upcomingAppts={[mockAppointment]} />);
        expect(screen.getByText(/Check-in opens on the day/)).toBeInTheDocument();
    });

    it("shows last clinic card with Book Again button", () => {
        const lastClinic = { facility_id: "f1", facilities: { name: "City Clinic", district: "CBD" } };
        wrap(<OverviewPanel {...baseProps} lastClinic={lastClinic} />);
        expect(screen.getByText("City Clinic")).toBeInTheDocument();
        expect(screen.getByText("Book Again")).toBeInTheDocument();
    });

    it("clicking Book Again calls onBookAgain with the clinic's facility_id", () => {
    const mockOnBookAgain = vi.fn();
    const lastClinic = { facility_id: "f1", facilities: { name: "City Clinic", district: "CBD" } };
    wrap(<OverviewPanel {...baseProps} lastClinic={lastClinic} onBookAgain={mockOnBookAgain} />);

    fireEvent.click(screen.getByText("Book Again"));

    expect(mockOnBookAgain).toHaveBeenCalledWith("f1");
    });
    it("shows admin overview panel for admin role", () => {
        wrap(<OverviewPanel {...baseProps} profile={{ ...mockProfile, role: "admin" }} />);
        expect(screen.getByText("Admin overview panel active")).toBeInTheDocument();
    });

    it("shows staff facility card when latestAssignment exists", () => {
        const assignment = { facilities: { name: "Staff Clinic", district: "North" } };
        wrap(
            <OverviewPanel
                {...baseProps}
                profile={{ ...mockProfile, role: "staff" }}
                latestAssignment={assignment}
            />
        );
        expect(screen.getByText("Staff Clinic")).toBeInTheDocument();
    });
});

// AppointmentsPanel
describe("AppointmentsPanel", () => {
    it("renders 'No appointments found' when empty", () => {
        render(<AppointmentsPanel appointments={[]} onReschedule={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText("No appointments found.")).toBeInTheDocument();
    });

    it("renders appointment cards with Reschedule and Cancel buttons for active appts", () => {
        const onReschedule = vi.fn();
        const onCancel = vi.fn();
        render(
            <AppointmentsPanel
                appointments={[mockAppointment]}
                onReschedule={onReschedule}
                onCancel={onCancel}
            />
        );
        expect(screen.getByText("Reschedule")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("does not render Reschedule/Cancel buttons for terminal status", () => {
        render(
            <AppointmentsPanel
                appointments={[mockCancelledAppt]}
                onReschedule={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.queryByText("Reschedule")).not.toBeInTheDocument();
        expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
    });

    it("calls onReschedule when Reschedule button clicked", () => {
        const onReschedule = vi.fn();
        render(
            <AppointmentsPanel
                appointments={[mockAppointment]}
                onReschedule={onReschedule}
                onCancel={vi.fn()}
            />
        );
        fireEvent.click(screen.getByText("Reschedule"));
        expect(onReschedule).toHaveBeenCalledWith(mockAppointment);
    });

    it("calls onCancel when Cancel button clicked", () => {
        const onCancel = vi.fn();
        render(
            <AppointmentsPanel
                appointments={[mockAppointment]}
                onReschedule={vi.fn()}
                onCancel={onCancel}
            />
        );
        fireEvent.click(screen.getByText("Cancel"));
        expect(onCancel).toHaveBeenCalledWith(mockAppointment);
    });
});

// PatientQueuePanel
describe("PatientQueuePanel", () => {
    it("renders 'Not in queue.' when no queueData", () => {
        render(<PatientQueuePanel queueData={null} slotDate={null} slotTime={null} />);
        expect(screen.getByText("Not in queue.")).toBeInTheDocument();
    });

    it("renders QueueCard when queueData has an error", () => {
        // queueData.error = true → QueueCard returns null
        render(<PatientQueuePanel queueData={{ error: true }} slotDate={null} slotTime={null} />);
        expect(screen.getByText("My Queue")).toBeInTheDocument();
    });

    it("renders queue status card with position when queueData is valid", () => {
        const queueData = {
            status: "waiting",
            position: 3,
            patients_before_you: 2,
            time_until_appointment: "20 min",
            eta_minutes: 20,
        };
        render(<PatientQueuePanel queueData={queueData} slotDate={null} slotTime={null} />);
        expect(screen.getByText("Queue Status")).toBeInTheDocument();
        expect(screen.getByText("#3")).toBeInTheDocument();
    });

    it("renders complete status card", () => {
        const queueData = { status: "complete", error: false };
        render(<PatientQueuePanel queueData={queueData} slotDate={null} slotTime={null} />);
        expect(screen.getByText("Appointment Complete")).toBeInTheDocument();
    });

    it("renders in-consultation status card", () => {
        const queueData = { status: "called", error: false };
        render(<PatientQueuePanel queueData={queueData} slotDate={null} slotTime={null} />);
        expect(screen.getByText("You're being seen now")).toBeInTheDocument();
    });
});

// NotificationsPanel
describe("NotificationsPanel", () => {
    it("renders Notifications heading and Mark all as read button", () => {
        render(<NotificationsPanel notifications={[]} unreadCount={0} onMarkAllRead={vi.fn()} />);
        expect(screen.getByText(/Notifications \(0 unread\)/)).toBeInTheDocument();
        expect(screen.getByText("Mark all as read")).toBeInTheDocument();
    });

    it("renders 'No notifications.' when empty", () => {
        render(<NotificationsPanel notifications={[]} unreadCount={0} onMarkAllRead={vi.fn()} />);
        expect(screen.getByText("No notifications.")).toBeInTheDocument();
    });

    it("renders notification items", () => {
        const notifications = [
            { id: "n1", message: "Your appointment is confirmed", is_read: false, sent_at: null, type: "booking" },
            { id: "n2", message: "Reminder: appointment tomorrow", is_read: true, sent_at: null, type: "reminder" },
        ];
        render(<NotificationsPanel notifications={notifications} unreadCount={1} onMarkAllRead={vi.fn()} />);
        expect(screen.getByText("Your appointment is confirmed")).toBeInTheDocument();
        expect(screen.getByText("Reminder: appointment tomorrow")).toBeInTheDocument();
    });

    it("calls onMarkAllRead when button is clicked", () => {
        const onMarkAllRead = vi.fn();
        render(<NotificationsPanel notifications={[]} unreadCount={0} onMarkAllRead={onMarkAllRead} />);
        fireEvent.click(screen.getByText("Mark all as read"));
        expect(onMarkAllRead).toHaveBeenCalled();
    });
});

// ProfilePanel
describe("ProfilePanel", () => {
    const viewProps = {
        profile: mockProfile,
        editProfile: false,
        editForm: { name: "Jane", surname: "Doe", phone_number: "0821234567" },
        savingProfile: false,
        onEdit: vi.fn(),
        onCancel: vi.fn(),
        onSave: vi.fn(),
        onFormChange: vi.fn(),
    };

    it("renders null when profile is null", () => {
        const { container } = render(<ProfilePanel {...viewProps} profile={null} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders profile view mode with Name, Surname, Email, Edit button", () => {
        render(<ProfilePanel {...viewProps} />);
        expect(screen.getByText("Name: Jane")).toBeInTheDocument();
        expect(screen.getByText("Surname: Doe")).toBeInTheDocument();
        expect(screen.getByText("Email: jane@test.com")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });

    it("calls onEdit when Edit button is clicked", () => {
        const onEdit = vi.fn();
        render(<ProfilePanel {...viewProps} onEdit={onEdit} />);
        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
        expect(onEdit).toHaveBeenCalled();
    });

    it("renders edit mode with inputs and Save/Cancel buttons", () => {
        render(<ProfilePanel {...viewProps} editProfile={true} />);
        expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Surname")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Phone")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("calls onSave when Save is clicked", () => {
        const onSave = vi.fn();
        render(<ProfilePanel {...viewProps} editProfile={true} onSave={onSave} />);
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
        expect(onSave).toHaveBeenCalled();
    });

    it("calls onCancel when Cancel is clicked", () => {
        const onCancel = vi.fn();
        render(<ProfilePanel {...viewProps} editProfile={true} onCancel={onCancel} />);
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(onCancel).toHaveBeenCalled();
    });

    it("Save button is disabled when savingProfile is true", () => {
        render(<ProfilePanel {...viewProps} editProfile={true} savingProfile={true} />);
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });
});
