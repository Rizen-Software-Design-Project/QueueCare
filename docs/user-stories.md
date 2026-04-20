# User Stories

## US-01 · Secure Authentication
 
**Epic:** Authentication
**Priority:** P1 — High
**Size:** 8
**Status:** Backlog
 
**As a** patient,
**I want to** register and log in using a secure third-party provider,
**So that** I can safely access the system.
 
### Acceptance Criteria
- User can sign up and log in via an external auth provider (e.g. Google)
- User role is assigned on first login (Patient, Staff, Admin)
- Unauthorized users are redirected away from restricted routes
- Session persists across page refreshes
 
### Out of Scope
- Manual email/password registration (to be assessed separately)
- Social login providers beyond the initially agreed provider
 
### Dependencies
- None — this is the foundational story
 
### Definition of Done
- Code reviewed and merged
- Auth flow tested on mobile and desktop
- Role-based route guards verified
- Unit tests written and passing
- QA sign-off received


---

## US-02 · Search Nearby Clinics (Location-Based)
 
**Epic:** Clinic Discovery
**Priority:** P1 — High
**Size:** 6
**Status:** Backlog
 
**As a** patient,
**I want to** search for clinics near my location,
**So that** I can find a suitable nearby facility.
 
### Acceptance Criteria
- Clinics are displayed using real South African data
- User can filter by province, district, and facility type
- Clinic details include name, location, and services offered
- Results are sorted by proximity to the user's location
 
### Out of Scope
- Availability status on this view (covered in US-17)
- Directions or navigation integration (future enhancement)
 
### Dependencies
- US-01 — User must be authenticated to search
 
### Definition of Done
- Code reviewed and merged
- Tested with real South African clinic data
- Filter combinations verified to return correct results
- Mobile responsiveness confirmed
- QA sign-off received

---

## US-03 · View and Book Appointment Slots
 
**Epic:** Appointments
**Priority:** P1 — High
**Size:** 7
**Status:** Backlog
 
**As a** patient,
**I want to** view available appointment slots,
**So that** I can book a convenient time.
 
### Acceptance Criteria
- Available time slots are displayed per clinic
- User can select and confirm a booking
- Booking confirmation is shown immediately after submission
- Booked slot is no longer shown as available to other users
 
### Out of Scope
- Payment or co-pay processing
- Recurring or repeat bookings (future enhancement)
 
### Dependencies
- US-01 — User must be authenticated
- US-02 — Clinic must be selected from discovery
 
### Definition of Done
- Code reviewed and merged
- Slot availability updates correctly after booking
- Confirmation screen displays all relevant booking details
- Tested on mobile and desktop
- QA sign-off received

---

## US-04 · Reschedule or Cancel an Appointment
 
**Epic:** Appointments
**Priority:** P2 — Medium
**Size:** 4
**Status:** Backlog
 
**As a** patient,
**I want to** reschedule or cancel my appointment,
**So that** I can adjust my plans if needed.
 
### Acceptance Criteria
- User can reschedule to another available slot at the same clinic
- User can cancel an appointment entirely
- System updates slot availability accordingly after either action
- User receives confirmation of the change
 
### Out of Scope
- Rescheduling to a different clinic (user must re-book from scratch)
- Cancellation penalties or waitlist management
 
### Dependencies
- US-03 — Booking must exist before it can be changed
 
### Definition of Done
- Code reviewed and merged
- Availability updates correctly after reschedule and cancel
- Edge case tested: cancelling within 1 hour of appointment
- QA sign-off received

---

## US-05 · Join Virtual Queue on Arrival
 
**Epic:** Virtual Queue
**Priority:** P1 — High
**Size:** 6
**Status:** Backlog
 
**As a** patient,
**I want to** join a virtual queue when I arrive at the clinic,
**So that** I don't have to wait physically in line.
 
### Acceptance Criteria
- Walk-in patients can be added to the queue without a prior appointment
- Patient receives a queue position number upon joining
- Queue updates dynamically as patients are called
 
### Out of Scope
- Geofencing to auto-add patients when nearby (future enhancement)
- Queue joining before arrival
 
### Dependencies
- US-01 — User must be authenticated
- US-02 — Clinic must be identified
 
### Definition of Done
- Code reviewed and merged
- Queue position assigned correctly and sequentially
- Walk-in flow tested independently of appointment flow
- QA sign-off received

---

## US-06 · View Queue Position and Estimated Wait Time
 
**Epic:** Virtual Queue
**Priority:** P1 — High
**Size:** 7
**Status:** Backlog
 
**As a** patient,
**I want to** see my queue position and estimated wait time,
**So that** I know when I will be attended to.
 
### Acceptance Criteria
- Queue position updates in real time as patients ahead are served
- Estimated wait time is calculated and displayed
- Changes reflect immediately without requiring a page refresh
 
### Out of Scope
- Historical wait time trends (covered in US-13)
- Wait time notifications (covered in US-07)
 
### Dependencies
- US-05 — Patient must have joined the queue first
 
### Definition of Done
- Code reviewed and merged
- Real-time updates confirmed via WebSocket or polling
- Wait time estimate logic reviewed for accuracy
- Tested under concurrent queue activity
- QA sign-off received

---

## US-07 · Notifications When Turn Is Approaching
 
**Epic:** Virtual Queue
**Priority:** P2 — Medium
**Size:** 4
**Status:** Backlog
 
**As a** patient,
**I want to** receive a notification when my turn is approaching,
**So that** I don't miss my appointment.
 
### Acceptance Criteria
- Notification is triggered when the patient is a set number of positions away (e.g. 2 ahead)
- Notification method is reliable (e.g. in-app UI alert or email)
- Notification is not repeated unnecessarily
 
### Out of Scope
- Push notifications to mobile devices (future enhancement)
- Patient configuring their own notification threshold
 
### Dependencies
- US-06 — Queue position tracking must be working
 
### Definition of Done
- Code reviewed and merged
- Notification triggers verified at correct queue position threshold
- Duplicate notification prevention tested
- QA sign-off received

---

## US-08 · Manage Patient Queue
 
**Epic:** Staff Management
**Priority:** P1 — High
**Size:** 7
**Status:** Backlog
 
**As a** clinic staff member,
**I want to** manage the patient queue,
**So that** I can control patient flow efficiently.
 
### Acceptance Criteria
- Staff can view the full daily queue for their clinic
- Staff can reorder or adjust queue positions when needed
- Any updates made by staff are reflected in real time for patients
 
### Out of Scope
- Merging queues across multiple clinics
- Automated queue prioritisation (future AI enhancement)
 
### Dependencies
- US-01 — Staff must be authenticated with the correct role
- US-05 — Queue must exist for staff to manage
 
### Definition of Done
- Code reviewed and merged
- Queue reorder reflected immediately on patient-facing view
- Access restricted to staff and admin roles only
- QA sign-off received

---

## US-09 · Update Patient Status
 
**Epic:** Staff Management
**Priority:** P1 — High
**Size:** 3
**Status:** Backlog
 
**As a** clinic staff member,
**I want to** update a patient's status,
**So that** I can track their progress through the system.
 
### Acceptance Criteria
- Status options available: Waiting, In Consultation, Complete
- Status updates are reflected instantly for both staff and the patient
- Status history is retained for reporting purposes
 
### Out of Scope
- Clinical notes or medical records (out of scope for this system)
- Patient self-updating their own status
 
### Dependencies
- US-08 — Staff must be able to view the queue before updating individual statuses
 
### Definition of Done
- Code reviewed and merged
- All three status transitions tested
- Real-time reflection on patient view confirmed
- QA sign-off received

---

## US-10 · Manage Clinic Details
 
**Epic:** Admin & Reporting
**Priority:** P1 — High
**Size:** 5
**Status:** Backlog
 
**As an** admin,
**I want to** manage clinic details,
**So that** clinic information stays accurate and up to date.
 
### Acceptance Criteria
- Admin can edit clinic operating hours
- Admin can update the list of services offered by a clinic
- Admin can assign staff members to clinics
 
### Out of Scope
- Creating or deleting clinics (requires system-level access beyond admin scope)
- Editing clinic physical address (requires data team verification)
 
### Dependencies
- US-01 — Admin must be authenticated with the correct role
- US-16 — Admin role assignment must be in place
 
### Definition of Done
- Code reviewed and merged
- Changes to clinic details reflected immediately across the app
- Non-admin users verified as unable to access clinic management
- QA sign-off received

---

## US-11 · Set Staff Availability
 
**Epic:** Staff Management
**Priority:** P2 — Medium
**Size:** 4
**Status:** Backlog
 
**As a** clinic staff member,
**I want to** set my availability,
**So that** appointments are scheduled only during my working hours.
 
### Acceptance Criteria
- Staff can define their working hours per day of the week
- Availability settings directly affect which appointment slots are shown to patients
- Changes to availability take effect immediately for future bookings
 
### Out of Scope
- Leave or time-off requests (HR system responsibility)
- Availability for walk-in queue management (queue is open during clinic hours)
 
### Dependencies
- US-01 — Staff must be authenticated
- US-03 — Booking system must use availability data
 
### Definition of Done
- Code reviewed and merged
- Slot generation logic verified against availability settings
- Tested for edge cases (e.g. overnight shifts, public holidays)
- QA sign-off received

---

## US-12 · Appointment Reminders
 
**Epic:** Appointments
**Priority:** P2 — Medium
**Size:** 5
**Status:** Backlog
 
**As a** patient,
**I want to** receive reminders for my appointment,
**So that** I don't forget to attend.
 
### Acceptance Criteria
- Reminder is sent before the appointment time (e.g. 24 hours and 1 hour prior)
- Reminder includes: clinic name, date, time, and appointment reference
- Reminder method is reliable (e.g. email or in-app notification)
 
### Out of Scope
- SMS reminders (future enhancement pending cost approval)
- User-configurable reminder timing (v2 feature)
 
### Dependencies
- US-03 — Appointment must be booked for a reminder to be triggered
 
### Definition of Done
- Code reviewed and merged
- Reminder triggers verified at correct intervals
- Reminder content reviewed for accuracy and clarity
- QA sign-off received

---

## US-13 · View Average Patient Wait Times
 
**Epic:** Admin & Reporting
**Priority:** P3 — Low
**Size:** 6
**Status:** Backlog
 
**As an** admin,
**I want to** view average patient wait times,
**So that** I can evaluate clinic performance.
 
### Acceptance Criteria
- Report displays average wait times broken down by clinic
- Data is grouped by time of day (e.g. morning, afternoon, evening)
- Report covers a selectable date range
 
### Out of Scope
- Wait times broken down by individual staff member
- Predictive wait time modelling (future AI feature)
 
### Dependencies
- US-06 — Wait time data must be captured from the queue system
- US-09 — Patient status updates feed into wait time calculations
 
### Definition of Done
- Code reviewed and merged
- Report data verified against raw queue records
- Date range filter tested for accuracy
- QA sign-off received

---

## US-14 · Track Appointment No-Show Rates
 
**Epic:** Admin & Reporting
**Priority:** P3 — Low
**Size:** 5
**Status:** Backlog
 
**As an** admin,
**I want to** track appointment no-show rates,
**So that** I can identify inefficiencies and take corrective action.
 
### Acceptance Criteria
- No-show statistics are calculated per clinic and per time period
- Report is presented in a visually clear format (e.g. chart or table)
- Admin can filter by clinic and date range
 
### Out of Scope
- Automated follow-up actions for no-shows (future enhancement)
- Individual patient no-show history (privacy considerations)
 
### Dependencies
- US-03 — Booking data must exist
- US-09 — Patient completion status must be tracked to identify no-shows
 
### Definition of Done
- Code reviewed and merged
- No-show calculation logic reviewed for correctness
- Visual report reviewed for clarity by a non-technical stakeholder
- QA sign-off received

---

## US-15 · Generate Custom Reports and Export
 
**Epic:** Admin & Reporting
**Priority:** P3 — Low
**Size:** 9
**Status:** Backlog
 
**As an** admin,
**I want to** generate custom reports and export them,
**So that** I can analyse and share performance data externally.
 
### Acceptance Criteria
- Admin can apply custom filters (clinic, date range, metric type)
- Reports can be exported in CSV format
- Reports can be exported in PDF format
- Exported files are correctly formatted and readable
 
### Out of Scope
- Scheduled or automated report delivery (future enhancement)
- Third-party BI tool integrations (e.g. Power BI, Tableau)
 
### Dependencies
- US-13 — Wait time data must be available for reporting
- US-14 — No-show data must be available for reporting
 
### Definition of Done
- Code reviewed and merged
- CSV and PDF exports tested for data accuracy and formatting
- Large dataset export performance tested (1000+ records)
- QA sign-off received

---

## US-16 · Admin Role Request and Approval
 
**Epic:** Authentication
**Priority:** P2 — Medium
**Size:** 6
**Status:** Backlog
 
**As a** clinic staff member,
**I want to** apply for an admin role,
**So that** I can gain administrative privileges to manage clinics and users.
 
### Acceptance Criteria
- Staff can submit a request for admin privileges
- Existing admins can view all pending requests
- Admins can approve or reject requests
- Approved users are immediately granted admin role access
- Only admins can assign admin roles
- Unauthorized users cannot access admin features
 
### Out of Scope
- Automated role assignment without admin approval
- Role downgrade flow (handled separately)
 
### Dependencies
- US-01 — Authentication must be in place before role management
 
### Definition of Done
- Code reviewed and merged
- Approval/rejection flow tested end-to-end
- Unauthorized access to admin routes verified as blocked
- QA sign-off received