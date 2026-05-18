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
    <main className="Welcome_page">

      {/* ── NAVBAR ── */}
      <header>
        <nav className="navbar">
          <h1 className="navbar_logo">
            <FontAwesomeIcon icon={faHeartPulse} className="navbar_logo_icon" />
            QueueCare
          </h1>

          <ul className="navbar_links links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>

          <aside className="navbar_auth">
            <Link to="/signin" className="signup_button">Sign In</Link>
          </aside>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="Home">

        <figure className="home_background">
          <img src={homeBg} alt="Home Background" />
        </figure>

        <aside className="hero_overlay" />

        <article className="home_content">

          <p className="home_tag">
            <span className="home_tagline">🇿🇦 Proudly South African</span>
          </p>

          <h2 className="home_header">
            Skip the Wait.
            <span className="home_header_colored"> Book Online.</span>
          </h2>

          <p className="home_paragraph">
            From Limpopo to Cape Town — find clinics, book appointments, and join
            virtual queues with QueueCare. Healthcare made effortless for every
            South African.
          </p>

          <nav className="home_buttons">
            <Link to="/signin">
              <button className="home_signup_button">
                Get Started
                <FontAwesomeIcon icon={faArrowRight} className="btn_icon" />
              </button>
            </Link>

            <Link to="/services">
              <button className="home_services_button">
                Learn More
              </button>
            </Link>
          </nav>

          <section className="hero_stats">

            <article className="hero_stat">
              <strong className="hero_stat_number">3,500+</strong>
              <span className="hero_stat_label">Clinics</span>
            </article>

            <hr className="hero_stat_divider" />

            <article className="hero_stat">
              <strong className="hero_stat_number">9</strong>
              <span className="hero_stat_label">Provinces</span>
            </article>

            <hr className="hero_stat_divider" />

            <article className="hero_stat">
              <strong className="hero_stat_number">24/7</strong>
              <span className="hero_stat_label">Access</span>
            </article>

            <hr className="hero_stat_divider" />

            <article className="hero_stat">
              <strong className="hero_stat_number">Free</strong>
              <span className="hero_stat_label">For Patients</span>
            </article>

          </section>
        </article>
      </section>

      {/* ── ABOUT ── */}
      <section className="About">

        <p className="about_label">Our Story</p>

        <section className="about_content">

          <article className="about_info">

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

            <ul className="about_features">

              <li className="about_feature_item">
                <section className="about_feature_dot" />
                <section>Real-time wait time updates</section>
              </li>

              <li className="about_feature_item">
                <section className="about_feature_dot" />
                <section>Public &amp; private clinic listings</section>
              </li>

              <li className="about_feature_item">
                <section className="about_feature_dot" />
                <section>Available in all 9 provinces</section>
              </li>

              <li className="about_feature_item">
                <section className="about_feature_dot" />
                <section>Completely free for patients</section>
              </li>

            </ul>
          </article>

          <aside className="about_visual">

            <figure className="about_visual_image">
              <img src={aboutImg} alt="Healthcare in South Africa" />
            </figure>

            <article className="about_visual_badge">

              <aside className="about_visual_badge_icon">
                <FontAwesomeIcon
                  icon={faGroupArrowsRotate}
                  size="2x"
                  color="#2E7D32"
                />
              </aside>

              <section className="about_visual_badge_text">
                <h3 className="about_visual_badge_header">
                  Ubuntu Healthcare
                </h3>

                <p className="about_visual_badge_paragraph">
                  Connecting Communities, Empowering Patients
                </p>
              </section>

            </article>
          </aside>

        </section>
      </section>

      {/* ── SERVICES ── */}
      <section className="Services">

        <article className="services_content">

          <p className="section_label">What We Offer</p>

          <h2 className="services_header">
            Everything You Need for{" "}
            <span className="services_header_colored">Better Healthcare</span>
          </h2>

          <p className="services_subheader">
            One platform for patients, clinic staff, and administrators —
            designed for real South African healthcare conditions.
          </p>

          <section className="services_list">

            <article className="service_item">
              <aside className="service_icon">
                <FontAwesomeIcon icon={faLocationDot} size="lg" color="#2E7D32" />
              </aside>

              <section className="service_text">
                <h3 className="service_header">Find Nearby Clinics</h3>

                <p className="service_paragraph">
                  Discover clinics near you with real South African facility data.
                  Filter by province, district, and services offered.
                </p>
              </section>
            </article>

            <article className="service_item">
              <aside className="service_icon">
                <FontAwesomeIcon icon={faCalendarAlt} size="lg" color="#2E7D32" />
              </aside>

              <section className="service_text">
                <h3 className="service_header">Book Appointments</h3>

                <p className="service_paragraph">
                  View available slots and book instantly. Reschedule or cancel
                  with ease — no more long phone queues.
                </p>
              </section>
            </article>

            <article className="service_item">
              <aside className="service_icon">
                <FontAwesomeIcon icon={faClock} size="lg" color="#2E7D32" />
              </aside>

              <section className="service_text">
                <h3 className="service_header">Virtual Queues</h3>

                <p className="service_paragraph">
                  Join virtual queues and get real-time updates on your wait time
                  and position.
                </p>
              </section>
            </article>

            <article className="service_item">
              <aside className="service_icon">
                <FontAwesomeIcon icon={faShieldAlt} size="lg" color="#2E7D32" />
              </aside>

              <section className="service_text">
                <h3 className="service_header">Secure Access</h3>

                <p className="service_paragraph">
                  Sign in securely with your ID. Role-based access for patients,
                  staff, and administrators keeps your data safe.
                </p>
              </section>
            </article>

            <article className="service_item">
              <aside className="service_icon">
                <FontAwesomeIcon icon={faUserNurse} size="lg" color="#2E7D32" />
              </aside>

              <section className="service_text">
                <h3 className="service_header">Staff Management</h3>

                <p className="service_paragraph">
                  Manage patient flow, update statuses, and set availability —
                  all from one powerful dashboard.
                </p>
              </section>
            </article>

            <article className="service_item service_item--accent">
              <aside className="service_icon service_icon--accent">
                <FontAwesomeIcon icon={faChartLine} size="lg" color="#ffffff" />
              </aside>

              <section className="service_text">
                <h3 className="service_header service_header--accent">
                  Reports &amp; Analytics
                </h3>

                <p className="service_paragraph service_paragraph--accent">
                  Gain insights into patient flow, appointment trends, and clinic
                  performance with our comprehensive reporting tools.
                </p>
              </section>
            </article>

          </section>
        </article>
      </section>

      {/* ── CONTACT ── */}
      <section className="Contact">

        <section className="contact_content">

          <article className="contact_details">

            <p className="section_label section_label--dark">
              Get In Touch
            </p>

            <h2 className="contact_header">
              Contact <section className="contact_header_colored">Us</section>
            </h2>

            <p className="contact_paragraph">
              Have questions or need support? Our team is here to help. Reach out
              via email, phone, or fill in the form.
            </p>

            <address className="contact_info">

              <article className="contact_company_email">

                <aside className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faEnvelope} />
                </aside>

                <section className="contact_text_wrap">
                  <section className="contact_info_label">Email</section>

                  <a
                    href="mailto:support@queuecare.co.za"
                    className="contact_info_value"
                  >
                    support@queuecare.co.za
                  </a>
                </section>

              </article>

              <article className="contact_company_phone">

                <aside className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faPhone} />
                </aside>

                <section className="contact_text_wrap">
                  <section className="contact_info_label">Phone</section>

                  <a
                    href="tel:+27123456789"
                    className="contact_info_value"
                  >
                    +27 123 456 789
                  </a>
                </section>

              </article>

              <article className="contact_company_address">

                <aside className="contact_icon_wrap">
                  <FontAwesomeIcon icon={faLocationDot} />
                </aside>

                <section className="contact_text_wrap">
                  <section className="contact_info_label">Address</section>

                  <p className="contact_info_value">
                    123 Health St, Johannesburg, South Africa
                  </p>
                </section>

              </article>

            </address>
          </article>

          <section className="contact_form">

            <h3 className="contact_form_title">Send us a message</h3>

            <form onSubmit={(e) => e.preventDefault()}>

              <fieldset className="contact_name">

                <section className="contact_field">
                  <label htmlFor="firstName" className="contact_label">
                    First Name
                  </label>

                  <input
                    id="firstName"
                    type="text"
                    placeholder="Thabo"
                    className="contact_input"
                  />
                </section>

                <section className="contact_field">
                  <label htmlFor="lastName" className="contact_label">
                    Last Name
                  </label>

                  <input
                    id="lastName"
                    type="text"
                    placeholder="Nkosi"
                    className="contact_input"
                  />
                </section>

              </fieldset>

              <fieldset className="contact_message">

                <section className="contact_field">
                  <label htmlFor="email" className="contact_label">
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="thabo@example.com"
                    className="contact_input"
                  />
                </section>

                <section className="contact_field">
                  <label htmlFor="subject" className="contact_label">
                    Subject
                  </label>

                  <input
                    id="subject"
                    type="text"
                    placeholder="How can we help?"
                    className="contact_input"
                  />
                </section>

                <section className="contact_field">
                  <label htmlFor="message" className="contact_label">
                    Message
                  </label>

                  <textarea
                    id="message"
                    placeholder="Tell us more..."
                    className="contact_textarea"
                  ></textarea>
                </section>

              </fieldset>

              <footer className="contact_buttons">
                <button type="submit" className="contact_submit_button">
                  Send Message
                  <FontAwesomeIcon icon={faArrowRight} className="btn_icon" />
                </button>
              </footer>

            </form>
          </section>

        </section>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">

        <section className="footer-content">

          <section className="footer-section footer-section--brand">

            <h2 className="footer_logo">
              <FontAwesomeIcon
                icon={faHeartPulse}
                className="footer_logo_icon"
              />
              QueueCare
            </h2>

            <p>
              Making healthcare easier and more accessible across South Africa —
              one queue at a time.
            </p>

            <p className="footer_badge">
              🇿🇦 Proudly South African
            </p>

          </section>

          <nav className="footer-section">

            <h3>Navigate</h3>

            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>

          </nav>

          <nav className="footer-section">

            <h3>Legal</h3>

            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">POPIA Compliance</a></li>
            </ul>

          </nav>

          <address className="footer-section">

            <h3>Contact</h3>

            <ul>
              <li>
                <a href="mailto:support@queuecare.co.za">
                  support@queuecare.co.za
                </a>
              </li>

              <li>
                <a href="tel:+27123456789">
                  +27 123 456 789
                </a>
              </li>

              <li>Johannesburg, GP</li>
            </ul>

          </address>

        </section>

        <section className="footer-bottom">
          <p>
            © {new Date().getFullYear()} QueueCare. All rights reserved.
            Built with care for South Africa.
          </p>
        </section>

      </footer>

    </main>
  );
}

export default Welcome;