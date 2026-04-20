import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "./Dashboard";





const mockPatientProfile = {
    id: "profile-123",
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    phone_number: "0821234567",
    role: "patient",
    dob: "1990-01-01",
}




vi.mock("../firebase", () => ({
    auth: { currentUser: null },
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback({ uid: "1233" });
        return () => {};
    }),
    signOut: vi.fn(() => Promise.resolve()),
}));

const mockSupabaseQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: mockPatientProfile, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
};

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "supabase-user-123" } } })),
            signOut: vi.fn(() => Promise.resolve()),
            },
        from: vi.fn(() => mockSupabaseQuery),
    })),
}));

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return { ...actual, useNavigate: () => vi.fn() };
});





describe("Overview", () => {
    beforeEach(async() => {
        render(<Dashboard/>);
    });

    it("Renders Overview", async() => {
        const texts = screen.getAllByText("Overview");
        texts.forEach((text) => {
            expect(text).toBeVisible();
        });
    });

    it("Renders Upcoming appointments", async() => {
        const texts = screen.getAllByText("Upcoming Appointments");
        texts.forEach((text) => {
            expect(text).toBeVisible();
        });
    });

    it("Renders Active queue entries", async() => {
        expect(screen.getByText("Active Queue Entries")).toBeVisible();
    })

    it("Renders Total appointments", async() => {
        expect(screen.getByText("Total Appointments")).toBeVisible();
    })

    it("Renders Unread notifications", async() => {
        expect(screen.getByText("Unread Notifications")).toBeVisible();
    })
});


describe("Appointments", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const appointmentsButton = screen.getByRole("button", { name: /appointments/i });
        await user.click(appointmentsButton);
    });

    it("Renders My appointments", async() => {
        const appointments = screen.getAllByText(/appointment/i);
        appointments.forEach((appointment) => {
            expect(appointment).toBeVisible();
        });
    });
});

describe("My Queue", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const myQueueButton = screen.getByRole("button", { name: /my queue/i });
        await user.click(myQueueButton);
    });

    it("Renders My queue", async() => {
        const myQueues = screen.getAllByText(/my queue/i);
        myQueues.forEach((myQueue) => {
            expect(myQueue).toBeVisible();
        });
    });
});

describe("Notifications", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const notificationButton = screen.getByRole("button", { name: /notifications/i });
        await user.click(notificationButton);
    });

    it("Renders Notifications", async() => {
        const notifications = screen.getAllByText(/notifications/i);
        notifications.forEach((notification) => {
            expect(notification).toBeVisible();
        });
    });

    it("Renders Mark all as read", async() => {
        const markButton = screen.getByRole("button", {name:"Mark all as read"});
        expect(markButton).toBeVisible();
    });
});

describe("Profile", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const profileButton = screen.getByRole("button", { name: /profile/i });
        await user.click(profileButton);
    });

    it("Renders Name", async() => {
        expect(screen.getByText("Name:")).toBeVisible();
    });
    it("Renders Email", async() => {
        expect(screen.getByText("Email:")).toBeVisible();
    });
    it("Renders Phone", async() => {
        expect(screen.getByText("Phone:")).toBeVisible();
    });
    it("Renders Date of Birth", async() => {
        expect(screen.getByText("Date of Birth:")).toBeVisible();
    });
    it("Renders Role", async() => {
        expect(screen.getByText("Role:")).toBeVisible();
    });

    it("Renders Edit profile", async() => {
        const editProfileButton = screen.getByRole("button", { name: /Edit profile/i });
        expect(editProfileButton).toBeVisible();
    });
});


describe("Service policy", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const policyButton = screen.getByRole("button", { name: /service policy/i });
        await user.click(policyButton);
    });

    it("Renders Service policy", async() => {
        const policies = screen.getAllByText("Service Policy");
        policies.forEach((policy) => {
            expect(policy).toBeVisible();
        });
    });
});


describe("Settings", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const settingsButton = screen.getByRole("button", { name: /settings/i });
        await user.click(settingsButton);
    });

    it("Renders Settings", async() => {
        const settings = screen.getAllByText("Settings");
        settings.forEach((setting) => {
            expect(setting).toBeVisible();
        });
    });
});


describe("Click Edit profile", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const profileButton = screen.getByRole("button", { name: /profile/i });
        await user.click(profileButton);

        const editProfileButton = screen.getByRole("button", { name: /Edit profile/i });
        await user.click(editProfileButton);
    });

    it("Renders Textboxes", async() => {
        const textboxes = screen.getAllByRole("textbox");
        expect(textboxes).toHaveLength(3);
    });

    it("Renders Calendar(DOB)", async() => {
        const calender = screen.getByPlaceholderText("Date of Birth");
        expect(calender).toHaveAttribute("type", "date");
    });

    it("Renders Cancel", async() => {
        const cancel = screen.getByRole("button", {name:"Cancel"});
        expect(cancel).toBeVisible();
    });

    it("Renders Save", async() => {
        const save = screen.getByRole("button", {name:"Save"});
        expect(save).toBeVisible();
    });
});

describe("Cancel clicked", () => {
    beforeEach(async() => {
        const user = userEvent.setup();
        render(<Dashboard/>);

        const profileButton = screen.getByRole("button", { name: /profile/i });
        await user.click(profileButton);

        const editProfileButton = screen.getByRole("button", { name: /Edit profile/i });
        await user.click(editProfileButton);

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        await user.click(cancelButton);
    });

    it("Renders Name", async() => {
        expect(screen.getByText("Name:")).toBeVisible();
    });
    it("Renders Email", async() => {
        expect(screen.getByText("Email:")).toBeVisible();
    });
    it("Renders Phone", async() => {
        expect(screen.getByText("Phone:")).toBeVisible();
    });
    it("Renders Date of Birth", async() => {
        expect(screen.getByText("Date of Birth:")).toBeVisible();
    });
    it("Renders Role", async() => {
        expect(screen.getByText("Role:")).toBeVisible();
    });

    it("Renders Edit profile", async() => {
        const editProfileButton = screen.getByRole("button", { name: "Edit Profile"});
        expect(editProfileButton).toBeVisible();
    });
});

// describe("Save Clicked", () => {
//     beforeEach(async() => {
//         const user = userEvent.setup();
//         render(<Dashboard/>);

//         const profileButton = screen.getByRole("button", { name: /profile/i });
//         await user.click(profileButton);

//         const editProfileButton = screen.getByRole("button", { name: "Edit Profile"});
//         await user.click(editProfileButton);

//         const name = screen.getByPlaceholderText("First name");
//         const surname = screen.getByPlaceholderText("Surname");
//         const phoneNumber = screen.getByPlaceholderText("Phone number");
//         const date = screen.getByPlaceholderText("Date of Birth");
        
//         user.type(name, "abc");
//         user.type(surname, "xyz");
//         user.type(phoneNumber, "0820000000");
//         user.type(date, "1990-01-01")

//         const saveButton = screen.getByRole("button", { name: /save/i });
//         await user.click(saveButton);

//         await waitFor(() => {
//             expect
//         });
//     });

//     it("Renders Name", async() => {
//         expect(screen.getByText("Name:")).toBeVisible();
//     });
//     it("Renders Email", async() => {
//         expect(screen.getByText("Email:")).toBeVisible();
//     });
//     it("Renders Phone", async() => {
//         expect(screen.getByText("Phone:")).toBeVisible();
//     });
//     it("Renders Date of Birth", async() => {
//         expect(screen.getByText("Date of Birth:")).toBeVisible();
//     });
//     it("Renders Role", async() => {
//         expect(screen.getByText("Role:")).toBeVisible();
//     });

//     it("Renders Edit profile", async() => {
//         const editProfileButton = screen.getByRole("button", { name: "Edit Profile"});
//         expect(editProfileButton).toBeVisible();
//     });
// });


