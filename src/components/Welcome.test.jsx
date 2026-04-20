import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import Welcome from "./Welcome";

describe("Welcome Page, Website", () => {
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
        // Use getAllByText since "Contact" appears multiple times
        const contactHeadings = screen.getAllByText("Contact");
        expect(contactHeadings.length).toBeGreaterThan(0);
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
        // Only test the navbar link, not footer links (which have href="#")
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

    it("Submit button prevents default form submission", async () => {
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

describe("Welcome Page, Responsive Elements", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Displays Ubuntu spirit text", () => {
        expect(screen.getByText(/I am because we are/i)).toBeVisible();
    });

    it("Displays feature items in About section", () => {
        expect(screen.getByText(/Real-time wait time updates/i)).toBeVisible();
        expect(screen.getByText(/Public & private clinic listings/i)).toBeVisible();
        expect(screen.getByText(/Available in all 9 provinces/i)).toBeVisible();
    });

    it("Displays Ubuntu Healthcare badge", () => {
        expect(screen.getByText("Ubuntu Healthcare")).toBeVisible();
        expect(screen.getByText(/Connecting Communities, Empowering Patients/i)).toBeVisible();
    });

    it("Displays Reports & Analytics service", () => {
        expect(screen.getByText("Reports & Analytics")).toBeVisible();
        expect(screen.getByText(/Gain insights into patient flow/i)).toBeVisible();
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

    it("Footer has Privacy Policy link", () => {
        const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
        expect(privacyLink).toBeInTheDocument();
        expect(privacyLink).toHaveAttribute("href", "#");
    });

    it("Footer has Terms of Service link", () => {
        const termsLink = screen.getByRole("link", { name: "Terms of Service" });
        expect(termsLink).toBeInTheDocument();
        expect(termsLink).toHaveAttribute("href", "#");
    });

    it("Footer has Cookie Policy link", () => {
        const cookieLink = screen.getByRole("link", { name: "Cookie Policy" });
        expect(cookieLink).toBeInTheDocument();
        expect(cookieLink).toHaveAttribute("href", "#");
    });

    it("Footer has POPIA Compliance link", () => {
        const popiaLink = screen.getByRole("link", { name: "POPIA Compliance" });
        expect(popiaLink).toBeInTheDocument();
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
});

describe("Welcome Page, Logo and Branding", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Displays heart pulse icon in navbar", () => {
        const icons = document.querySelectorAll(".navbar_logo_icon");
        expect(icons.length).toBeGreaterThan(0);
    });

    it("Displays heart pulse icon in footer", () => {
        const icons = document.querySelectorAll(".footer_logo_icon");
        expect(icons.length).toBeGreaterThan(0);
    });

    it("Displays Proudly South African badge in footer", () => {
        const badges = screen.getAllByText(/Proudly South African/i);
        const footerBadge = badges.find(badge => badge.closest('.footer_badge'));
        expect(footerBadge).toBeVisible();
    });

    it("Displays current year in footer copyright", () => {
        const currentYear = new Date().getFullYear().toString();
        expect(screen.getByText(new RegExp(currentYear))).toBeVisible();
    });
});

describe("Welcome Page, Hero Section", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Displays hero background image", () => {
        const heroImage = document.querySelector(".home_background img");
        expect(heroImage).toBeInTheDocument();
        expect(heroImage).toHaveAttribute("alt", "Home Background");
    });

    it("Displays South African flag emoji in tagline", () => {
        const emojis = screen.getAllByText(/🇿🇦/);
        const taglineEmoji = emojis.find(emoji => emoji.closest('.home_tagline'));
        expect(taglineEmoji).toBeVisible();
    });

    it("Displays hero paragraph text", () => {
        expect(screen.getByText(/Healthcare made effortless/i)).toBeVisible();
    });
});

describe("Welcome Page, About Section Image", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Displays about section image", () => {
        const aboutImage = document.querySelector(".about_visual_image img");
        expect(aboutImage).toBeInTheDocument();
        expect(aboutImage).toHaveAttribute("alt", "Healthcare in South Africa");
    });
});

describe("Welcome Page, Service Icons", () => {
    beforeEach(() => {
        render(
            <BrowserRouter>
                <Welcome />
            </BrowserRouter>
        );
    });

    it("Displays all 6 service items", () => {
        const serviceItems = document.querySelectorAll(".service_item");
        expect(serviceItems.length).toBe(6);
    });

    it("Displays accent service item", () => {
        const accentItem = document.querySelector(".service_item--accent");
        expect(accentItem).toBeInTheDocument();
    });
});