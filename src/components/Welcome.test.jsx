import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Welcome from "./Welcome";

describe("Welcome Page - Website", () => {
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
        const homeLinks = screen.getAllByRole("link", {name: "Home"});
        homeLinks.forEach((hl) => {
            expect(hl).toBeVisible();
        });
    });

    it("Renders About button/link", () => {
        const aboutLinks = screen.getAllByRole("link", {name: "About"});
        aboutLinks.forEach((al) => {
            expect(al).toBeVisible();
        });
    });

    it("Renders Services button/link", () => {
        const servicesLinks = screen.getAllByRole("link", {name: "Services"});
        servicesLinks.forEach((sl) => {
            expect(sl).toBeVisible();
        });
    });

    it("Renders Contact button/link", () => {
        const contactLinks = screen.getAllByRole("link", {name: "Contact"});
        contactLinks.forEach((cl) => {
            expect(cl).toBeVisible();
        });
    });

    it("Renders Sign In button", () => {
        const signInButton = screen.getByRole("link", {name: "Sign In"});
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
        const getStartedButton = screen.getByRole("button", {name: "Get Started"});
        expect(getStartedButton).toBeVisible();
    });

    it("Renders Learn more button", () => {
        const learnMoreButton = screen.getByRole("button", {name: "Learn More"});
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
            expect(email).toBeVisible;
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
        expect(screen.getByPlaceholderText("thabo@example.com"));
        expect(screen.getByPlaceholderText("How can we help?"));
        expect(screen.getByPlaceholderText("Tell us more..."));
        expect(screen.getByRole("button", {name:"Send Message"}));
    });
});