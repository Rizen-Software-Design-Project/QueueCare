import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Welcome from "./Welcome";

describe("Welcome Page", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Renders Queue Care logo", () => {
        const logos = screen.getAllByText("QueueCare");
        logos.forEach((logo) => {
            expect(logo).toBeVisible();
        });
    });

    it("Renders Home button/link", () => {
        const homeLinks = screen.getAllByRole("link", { name: "Home" });
        homeLinks.forEach((hl) => {
            expect(hl).toBeVisible();
        });
    });

    it("Renders About button/link", () => {
        const aboutLinks = screen.getAllByRole("link", { name: "About" });
        aboutLinks.forEach((al) => {
            expect(al).toBeVisible();
        });
    });

    it("Renders Services button/link", () => {
        const servicesLinks = screen.getAllByRole("link", { name: "Services" });
        servicesLinks.forEach((sl) => {
            expect(sl).toBeVisible();
        });
    });

    it("Renders Contact button/link", () => {
        const contactLinks = screen.getAllByRole("link", { name: "Contact" });
        contactLinks.forEach((cl) => {
            expect(cl).toBeVisible();
        });
    });

    it("Renders Sign In button", () => {
        const signInButton = screen.getByRole("link", { name: "Sign In" });
        expect(signInButton).toBeVisible();
    });

    it("Renders Skip the wait... block", () => {
        const texts = screen.getAllByText(/Proudly South African/i);
        texts.forEach((text) => {
            expect(text).toBeVisible();
        });
        
        expect(screen.getByText("Skip the Wait.")).toBeVisible();
        expect(screen.getByText(/From Limpopo/i)).toBeVisible();
    });

    it("Renders Get started button", () => {
        const getStartedButton = screen.getByRole("link", { name: "Get Started" });
        expect(getStartedButton).toBeVisible();
    });

    it("Renders Learn more button", () => {
        const learnMoreButton = screen.getByRole("button", { name: "Learn More" });
        expect(learnMoreButton).toBeVisible();
    });

    it("Renders Stats block", () => {
        expect(screen.getByText("3,500+")).toBeVisible();
        expect(screen.getByText("Clinics")).toBeVisible();
        expect(screen.getByText("9")).toBeVisible();
        expect(screen.getByText("Provinces")).toBeVisible();
        expect(screen.getByText("24/7")).toBeVisible();
        expect(screen.getByText("Access")).toBeVisible();
        expect(screen.getByText("Free")).toBeVisible();
        expect(screen.getByText("For Patients")).toBeVisible();
    });

    it("Renders Our story block", () => {
        expect(screen.getByText("Our Story")).toBeVisible();
        expect(screen.getByText("Built for South African's")).toBeVisible();
        expect(screen.getByText(/QueueCare was born/i)).toBeVisible();
        expect(screen.getByText(/Our platform connects/i)).toBeVisible();
        expect(screen.getByText(/Completely free/i)).toBeVisible();
    });

    it("Renders What we offer... block", () => {
        expect(screen.getByText(/What We Offer/i)).toBeVisible();
        expect(screen.getByText(/Everything You Need for/i)).toBeVisible();
        expect(screen.getByText(/One platform for patients/i)).toBeVisible();
        expect(screen.getByText(/Find Nearby Clinics/i)).toBeVisible();
        expect(screen.getByText(/Secure Access/i)).toBeVisible();
        expect(screen.getByText(/Staff Management/i)).toBeVisible();
    });

    it("Renders Get in touch block", () => {
        expect(screen.getByText("Get In Touch")).toBeVisible();
        const emails = screen.getAllByText("support@queuecare.co.za");
        emails.forEach((email) => {
            expect(email).toBeVisible();
        });
        const numbers = screen.getAllByText("+27 123 456 789");
        numbers.forEach((number) => {
            expect(number).toBeVisible();
        });
        expect(screen.getByText("123 Health St, Johannesburg, South Africa")).toBeVisible();
    });

    it("Renders Send us message form", () => {
        expect(screen.getByPlaceholderText("Thabo")).toBeVisible();
        expect(screen.getByPlaceholderText("Nkosi")).toBeVisible();
        expect(screen.getByPlaceholderText("thabo@example.com")).toBeVisible();
        expect(screen.getByPlaceholderText("How can we help?")).toBeVisible();
        expect(screen.getByPlaceholderText("Tell us more...")).toBeVisible();
        expect(screen.getByRole("button", { name: "Send Message" })).toBeVisible();
    });

    it("Renders footer section", () => {
        expect(screen.getByText(/Making healthcare easier/i)).toBeVisible();
        expect(screen.getByText("Navigate")).toBeVisible();
        expect(screen.getByText("Legal")).toBeVisible();
        const contact = screen.getAllByText("Contact");
        contact.forEach((instance) => {
            expect(instance).toBeVisible();
        });
        expect(screen.getByText(/All rights reserved/i)).toBeVisible();
    });
});

describe("Sign in Button clicked", () => {
    it("Navigates to sign in", () => {
        render(
            <MemoryRouter>
                <Welcome />
            </MemoryRouter>
        );

        const link = screen.getByRole("link", { name: "Sign In" });
        expect(link).toHaveAttribute("href", "/signin");
    });
});

describe("Get started clicked", () => {
    it("Navigates to sign in", () => {
        render(
            <MemoryRouter>
                <Welcome />
            </MemoryRouter>
        );

        const link = screen.getByRole("link", { name: "Get Started" });
        expect(link).toHaveAttribute("href", "/signin");
    });
});


describe("Welcome Page, Navigation Links", () => {
    beforeEach(() => {
        render(
            <MemoryRouter>
                <Welcome />
            </MemoryRouter>
        );
    });

    it("Home link has correct href", () => {
        const homeLinks = screen.getAllByRole("link", { name: "Home" });
        const navbarHomeLink = homeLinks.find(link => link.closest('.navbar_links'));
        expect(navbarHomeLink).toHaveAttribute("href", "/");
    });

    it("About link has correct href", () => {
        const aboutLinks = screen.getAllByRole("link", { name: "About" });
        const navbarAboutLink = aboutLinks.find(link => link.closest('.navbar_links'));
        expect(navbarAboutLink).toHaveAttribute("href", "/about");
    });

    it("Services link has correct href", () => {
        const servicesLinks = screen.getAllByRole("link", { name: "Services" });
        const navbarServicesLink = servicesLinks.find(link => link.closest('.navbar_links'));
        expect(navbarServicesLink).toHaveAttribute("href", "/services");
    });

    it("Contact link has correct href", () => {
        const contactLinks = screen.getAllByRole("link", { name: "Contact" });
        const navbarContactLink = contactLinks.find(link => link.closest('.navbar_links'));
        expect(navbarContactLink).toHaveAttribute("href", "/contact");
    });
});

describe("Welcome Page, Form Interaction", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Allows typing in first name field", async () => {
        const user = userEvent.setup();
        const firstNameInput = screen.getByPlaceholderText("Thabo");
        await user.type(firstNameInput, "John");
        expect(firstNameInput).toHaveValue("John");
    });

    it("Allows typing in last name field", async () => {
        const user = userEvent.setup();
        const lastNameInput = screen.getByPlaceholderText("Nkosi");
        await user.type(lastNameInput, "Doe");
        expect(lastNameInput).toHaveValue("Doe");
    });

    it("Allows typing in email field", async () => {
        const user = userEvent.setup();
        const emailInput = screen.getByPlaceholderText("thabo@example.com");
        await user.type(emailInput, "test@example.com");
        expect(emailInput).toHaveValue("test@example.com");
    });

    it("Allows typing in subject field", async () => {
        const user = userEvent.setup();
        const subjectInput = screen.getByPlaceholderText("How can we help?");
        await user.type(subjectInput, "Test Subject");
        expect(subjectInput).toHaveValue("Test Subject");
    });

    it("Allows typing in message field", async () => {
        const user = userEvent.setup();
        const messageInput = screen.getByPlaceholderText("Tell us more...");
        await user.type(messageInput, "This is a test message");
        expect(messageInput).toHaveValue("This is a test message");
    });

    it("Submit button triggers submit event", async () => {
        const user = userEvent.setup();
        const form = document.querySelector("form");
        const submitHandler = vi.fn((e) => e.preventDefault());
        form.addEventListener("submit", submitHandler);
        
        const submitButton = screen.getByRole("button", { name: "Send Message" });
        await user.click(submitButton);
        
        expect(submitHandler).toHaveBeenCalled();
        form.removeEventListener("submit", submitHandler);
    });
});


describe("Welcome Page, Footer Links", () => {
    beforeEach(() => {
        render(
            <MemoryRouter>
                <Welcome />
            </MemoryRouter>
        );
    });

    it("Home link has correct href", () => {
        const homeLinks = screen.getAllByRole("link", { name: "Home" });
        const navbarHomeLink = homeLinks.find(link => link.closest('.footer-section'));
        expect(navbarHomeLink).toHaveAttribute("href", "#");
    });

    it("About link has correct href", () => {
        const aboutLinks = screen.getAllByRole("link", { name: "About" });
        const navbarAboutLink = aboutLinks.find(link => link.closest('.footer-section'));
        expect(navbarAboutLink).toHaveAttribute("href", "#");
    });

    it("Services link has correct href", () => {
        const servicesLinks = screen.getAllByRole("link", { name: "Services" });
        const navbarServicesLink = servicesLinks.find(link => link.closest('.footer-section'));
        expect(navbarServicesLink).toHaveAttribute("href", "#");
    });

    it("Contact link has correct href", () => {
        const contactLinks = screen.getAllByRole("link", { name: "Contact" });
        const navbarContactLink = contactLinks.find(link => link.closest('.footer-section'));
        expect(navbarContactLink).toHaveAttribute("href", "#");
    });

    it("Footer has Privacy Policy link", () => {
        const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
        expect(privacyLink).toBeVisible();
        expect(privacyLink).toHaveAttribute("href", "#");
    });

    it("Footer has Terms of Service link", () => {
        const termsLink = screen.getByRole("link", { name: "Terms of Service" });
        expect(termsLink).toBeVisible();
        expect(termsLink).toHaveAttribute("href", "#");
    });

    it("Footer has Cookie Policy link", () => {
        const cookieLink = screen.getByRole("link", { name: "Cookie Policy" });
        expect(cookieLink).toBeVisible();
        expect(cookieLink).toHaveAttribute("href", "#");
    });

    it("Footer has POPIA Compliance link", () => {
        const popiaLink = screen.getByRole("link", { name: "POPIA Compliance" });
        expect(popiaLink).toBeVisible();
        expect(popiaLink).toHaveAttribute("href", "#");
    });

    it("Footer email link has correct href", () => {
        const emailLink = screen.getByRole("link", { name: "support@queuecare.co.za" });
        expect(emailLink).toHaveAttribute("href", "mailto:support@queuecare.co.za");
    });

    it("Footer phone link has correct href", () => {
        const phoneLink = screen.getByRole("link", { name: "+27 123 456 789" });
        expect(phoneLink).toHaveAttribute("href", "tel:+27123456789");
    });

    it("Footer location has correct href", () => {
        const location = screen.getByText(/Johannesburg, GP/i);
        expect(location).toBeVisible();
    });
});
