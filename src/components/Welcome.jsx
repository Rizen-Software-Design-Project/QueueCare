import "./Welcome.css";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import homeBg from "../assets/images/home_bg.jpg";
import aboutImg from "../assets/images/about_img.jpg";

import {
  faGroupArrowsRotate,
  faUserNurse,
  faChartLine,
  faCalendarAlt,
  faClock,
  faShieldAlt,
  faLocationDot,
  faEnvelope,
  faPhone,
  faArrowRight,
  faHeartPulse,
} from "@fortawesome/free-solid-svg-icons";

function Welcome() {
  return (
    <section className="Welcome_page">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar_logo">
          <FontAwesomeIcon icon={faHeartPulse} className="navbar_logo_icon" />
          QueueCare
        </div>

        <section className="navbar_links">
          <ul className="links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </section>

        <section className="navbar_auth">
          <Link to="/signin" className="signup_button">Sign In</Link>
        </section>
      </nav>

      {/* ── HERO ── */}
      <section className="Home">
        <section className="home_background">
          <img src={homeBg} alt="Home Background" />
        </section>

        <div className="hero_overlay" />

        <section className="home_content">
          <div className="home_tag">
            <span className="home_tagline">🇿🇦 Proudly South African</span>
          </div>

          <h1 className="home_header">
            Skip the Wait.
            <span className="home_header_colored"> Book Online.</span>
          </h1>

          <p className="home_paragraph">
            From Limpopo to Cape Town — find clinics, book appointments, and join
            virtual queues with QueueCare. Healthcare made effortless for every
            South African.
          </p>

          <section className="home_buttons">
            <Link to="/signin">
              <button className="home_signup_button">
                Get Started
                <FontAwesomeIcon icon={faArrowRight} className="btn_icon" />
              </button>
            </Link>
            <a href="/services">
              <button className="home_services_button">Learn More</button>
            </a>
          </section>

          <div className="hero_stats">
            <div className="hero_stat">
              <span className="hero_stat_number">3,500+</span>
              <span className="hero_stat_label">Clinics</span>
            </div>
            <div className="hero_stat_divider" />
            <div className="hero_stat">
              <span className="hero_stat_number">9</span>
              <span className="hero_stat_label">Provinces</span>
            </div>
            <div className="hero_stat_divider" />
            <div className="hero_stat">
              <span className="hero_stat_number">24/7</span>
              <span className="hero_stat_label">Access</span>
            </div>
            <div className="hero_stat_divider" />
            <div className="hero_stat">
              <span className="hero_stat_number">Free</span>
              <span className="hero_stat_label">For Patients</span>
            </div>
          </div>
        </section>
      </section>

      {/* ── ABOUT ── */}
      <section className="About">
        <div className="about_label">Our Story</div>
        <section className="about_content">

          <section className="about_info">
            <h2 className="about_header">
              Built for South African's{" "}
              <span className="about_header_colored">Healthcare Needs</span>
            </h2>

            <p className="about_paragraph">
              QueueCare was born out of the need to modernise how South Africans
              access healthcare. Long queues, missed appointments, and inefficient
              systems have been a challenge for communities across all nine
              provinces.
            </p>

            <p className="about_paragraph">
              Our platform connects patients with clinics — public and private —
              through smart scheduling, virtual queues, and real-time updates. We
              believe quality healthcare access is a right, not a privilege,
              embodying the Ubuntu spirit:{" "}
              <em className="about_paragraph_italic">"I am because we are."</em>
            </p>

            <div className="about_features">
              <div className="about_feature_item">
                <div className="about_feature_dot" />
                Real-time wait time updates
              </div>
              <div className="about_feature_item">
                <div className="about_feature_dot" />
                Public &amp; private clinic listings
              </div>
              <div className="about_feature_item">
                <div className="about_feature_dot" />
                Available in all 9 provinces
              </div>
              <div className="about_feature_item">
                <div className="about_feature_dot" />
                Completely free for patients
              </div>
            </div>
          </section>

          <section className="about_visual">
            <section className="about_visual_image">
              <img src={aboutImg} alt="Healthcare in South Africa" />
            </section>

            <section className="about_visual_badge">
              <section className="about_visual_badge_icon">
                <FontAwesomeIcon icon={faGroupArrowsRotate} size="2x" color="#2E7D32" />
              </section>
              <section className="about_visual_badge_text">
                <section className="about_visual_badge_header">Ubuntu Healthcare</section>
                <section className="about_visual_badge_paragraph">Connecting Communities, Empowering Patients</section>
              </section>
            </section>
          </section>

        </section>
      </section>

      {/* ── SERVICES ── */}
      <section className="Services">
        <section className="services_content">
          <div className="section_label">What We Offer</div>
          <h2 className="services_header">
            Everything You Need for{" "}
            <span className="services_header_colored">Better Healthcare</span>
          </h2>
          <p className="services_subheader">
            One platform for patients, clinic staff, and administrators — designed
            for real South African healthcare conditions.
          </p>

          <section className="services_list">

            <section className="service_item">
              <section className="service_icon">
                <FontAwesomeIcon icon={faLocationDot} size="lg" color="#2E7D32" />
              </section>
              <section className="service_text">
                <section className="service_header">Find Nearby Clinics</section>
                <section className="service_paragraph">
                  Discover clinics near you with real South African facility data.
                  Filter by province, district, and services offered.
                </section>
              </section>
            </section>

            <section className="service_item">
              <section className="service_icon">
                <FontAwesomeIcon icon={faCalendarAlt} size="lg" color="#2E7D32" />
              </section>
              <section className="service_text">
                <section className="service_header">Book Appointments</section>
                <section className="service_paragraph">
                  View available slots and book instantly. Reschedule or cancel
                  with ease — no more long phone queues.
                </section>
              </section>
            </section>

            <section className="service_item">
              <section className="service_icon">
                <FontAwesomeIcon icon={faClock} size="lg" color="#2E7D32" />
              </section>
              <section className="service_text">
                <section className="service_header">Virtual Queues</section>
                <section className="service_paragraph">
                  Join virtual queues and get real-time updates on your wait time
                  and position.
                </section>
              </section>
            </section>

            <section className="service_item">
              <section className="service_icon">
                <FontAwesomeIcon icon={faShieldAlt} size="lg" color="#2E7D32" />
              </section>
              <section className="service_text">
                <section className="service_header">Secure Access</section>
                <section className="service_paragraph">
                  Sign in securely with your ID. Role-based access for patients,
                  staff, and administrators keeps your data safe.
                </section>
              </section>
            </section>

            <section className="service_item">
              <section className="service_icon">
                <FontAwesomeIcon icon={faUserNurse} size="lg" color="#2E7D32" />
              </section>
              <section className="service_text">
                <section className="service_header">Staff Management</section>
                <section className="service_paragraph">
                  Manage patient flow, update statuses, and set availability —
                  all from one powerful dashboard.
                </section>
              </section>
            </section>

            <section className="service_item service_item--accent">
              <section className="service_icon service_icon--accent">
                <FontAwesomeIcon icon={faChartLine} size="lg" color="#ffffff" />
              </section>
              <section className="service_text">
                <section className="service_header service_header--accent">Reports &amp; Analytics</section>
                <section className="service_paragraph service_paragraph--accent">
                  Gain insights into patient flow, appointment trends, and clinic
                  performance with our comprehensive reporting tools.
                </section>
              </section>
            </section>

          </section>
        </section>
      </section>

      {/* ── CONTACT ── */}
      <section className="Contact">
        <section className="contact_content">

          <section className="contact_details">
            <div className="section_label section_label--dark">Get In Touch</div>
            <h2 className="contact_header">
              Contact <span className="contact_header_colored">Us</span>
            </h2>
            <p className="contact_paragraph">
              Have questions or need support? Our team is here to help. Reach out
              via email, phone, or fill in the form.
            </p>

            <section className="contact_info">
              <section className="contact_company_email">
                <div className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <section className="contact_text_wrap">
                  <span className="contact_info_label">Email</span>
                  <span className="contact_info_value">support@queuecare.co.za</span>
                </section>
              </section>

              <section className="contact_company_phone">
                <div className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faPhone} />
                </div>
                <section className="contact_text_wrap">
                  <span className="contact_info_label">Phone</span>
                  <span className="contact_info_value">+27 123 456 789</span>
                </section>
              </section>

              <section className="contact_company_address">
                <div className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faLocationDot} />
                </div>
                <section className="contact_text_wrap">
                  <span className="contact_info_label">Address</span>
                  <span className="contact_info_value">123 Health St, Johannesburg, South Africa</span>
                </section>
              </section>
            </section>
          </section>

          <section className="contact_form">
            <h3 className="contact_form_title">Send us a message</h3>
            <form onSubmit={(e) => e.preventDefault()}>
              <section className="contact_name">
                <section className="contact_field">
                  <label htmlFor="firstName" className="contact_label">First Name</label>
                  <input id="firstName" type="text" placeholder="Thabo" className="contact_input" />
                </section>
                <section className="contact_field">
                  <label htmlFor="lastName" className="contact_label">Last Name</label>
                  <input id="lastName" type="text" placeholder="Nkosi" className="contact_input" />
                </section>
              </section>

              <section className="contact_message">
                <section className="contact_field">
                  <label htmlFor="email" className="contact_label">Email Address</label>
                  <input id="email" type="email" placeholder="thabo@example.com" className="contact_input" />
                </section>
                <section className="contact_field">
                  <label htmlFor="subject" className="contact_label">Subject</label>
                  <input id="subject" type="text" placeholder="How can we help?" className="contact_input" />
                </section>
                <section className="contact_field">
                  <label htmlFor="message" className="contact_label">Message</label>
                  <textarea id="message" placeholder="Tell us more..." className="contact_textarea"></textarea>
                </section>
              </section>

              <section className="contact_buttons">
                <button type="submit" className="contact_submit_button">
                  Send Message
                  <FontAwesomeIcon icon={faArrowRight} className="btn_icon" />
                </button>
              </section>
            </form>
          </section>

        </section>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <section className="footer-content">
          <section className="footer-section footer-section--brand">
            <div className="footer_logo">
              <FontAwesomeIcon icon={faHeartPulse} className="footer_logo_icon" />
              QueueCare
            </div>
            <p>Making healthcare easier and more accessible across South Africa — one queue at a time.</p>
            <div className="footer_badge">🇿🇦 Proudly South African</div>
          </section>

          <section className="footer-section">
            <h3>Navigate</h3>
            <ul>
              <li><a href="#">Home</a></li>
              <li><a href="#">About</a></li>
              <li><a href="#">Services</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </section>

          <section className="footer-section">
            <h3>Legal</h3>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">POPIA Compliance</a></li>
            </ul>
          </section>

          <section className="footer-section">
            <h3>Contact</h3>
            <ul>
              <li><a href="mailto:support@queuecare.co.za">support@queuecare.co.za</a></li>
              <li><a href="tel:+27123456789">+27 123 456 789</a></li>
              <li><a href="#">Johannesburg, GP</a></li>
            </ul>
          </section>
        </section>

        <section className="footer-bottom">
          <p>© {new Date().getFullYear()} QueueCare. All rights reserved. Built with care for South Africa.</p>
        </section>
      </footer>

    </section>
  );
}

export default Welcome;