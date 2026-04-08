import "./Welcome.css";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import homeBg from "../assets/images/home_bg.jpg";
import aboutImg from "../assets/images/about_img.jpg";

import { faCalendarAlt, faClock , faShieldAlt , faPeopleGroup, faEnvelope, faPhone, faLocationDot } from "@fortawesome/free-solid-svg-icons"; 

function Welcome() {
  return (
    <div className="Welcome_page">

        {/* Navigation Bar */}
        <nav className="navbar">

            <h1 className="navbar_logo">QueueCare</h1>

            <div className="navbar_links">
                <ul className="links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/services">Services</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </div>

            <div className="navbar_auth">
                <Link to="/login" className="login_button">Login</Link>
                <Link to="/signup" className="signup_button">Sign Up</Link>
            </div>

        </nav>

        {/* Home Section */}  
        <section className="Home">

            <div className="home_background">
                 <img src={homeBg} alt="Home Background" />
            </div>

            <div className="home_content">

                <div className="home_tag">
                    <span className="home_tagline">Proudly South African</span>
                </div>

                <h1 className="home_header">Skip the Wait.<span className="home_header_colored">Book Online</span></h1>
                <p className="home_paragraph">From Limpopo to Cape Town, and everywhere in between, find clinics, book appointments, and join virtual queues with QueueCare - Healthcare made easy for South Africans </p>

                <div className="home_buttons">
                    <Link to="/signup">
                        <button className="home_signup_button">Get Started</button>
                    </Link>

                    <a href="/services">
                        <button className="home_services_button">Learn More</button>
                    </a>  
                </div>  

            </div>    
          
        </section>

        {/* About Section */}
        <section className="About">
            <div className="about_content">

                <div className="about_info">
                    <h2 className="about_header">Built for South African's <span className="about_header_colored">Healthcare Needs</span></h2>
                    <p className="about_paragraph"> 
                        ClinicQ was born out of the need to modernise how South Africans access healthcare. 
                        Long queues, missed appointments, and inefficient systems have been a challenge 
                        for communities across all nine provinces.
                    </p>

                    <p className="about_paragraph">
                        Our platform connects patients with clinics — public and private — through smart 
                        scheduling, virtual queues, and real-time updates. We believe that quality 
                        healthcare access is a right, not a privilege, embodying the Ubuntu spirit: 
                        <em className="about_paragraph_italic"> "I am because we are."</em>
                    </p>

                    <div className="about_badges">
                        <div className="about_badge">
                            <div className="about_badge_header">9</div>
                            <div className="about_badge_paragraph">Provinces Covered</div>
                        </div>

                        <div className="about_badge">
                            <div className="about_badge_header">3,500+</div>
                            <div className="about_badge_paragraph">Clinics Listed</div>
                        </div>  

                        <div className="about_badge">
                            <div className="about_badge_header">24/7</div>
                            <div className="about_badge_paragraph">Queue Access</div>
                        </div>  

                        <div className="about_badge">
                            <div className="about_badge_header">Free</div>
                            <div className="about_badge_paragraph">For All Patients</div>
                        </div>

                    </div>

                </div>

                <div className="about_visual">

                    <div className="about_visual_image">
                        <img src={aboutImg} alt="About Visual" />
                    </div>  

                    <div className="about_visual_badge">
                        <div className="about_visual_badge_icon">
                            <FontAwesomeIcon icon={faPeopleGroup} size="3x" color="#4CAF50" />
                        </div>

                        <div className="about_visual_badge_text">
                            <div className="about_visual_badge_header">Ubuntu Healthcare</div>
                            <div className="about_visual_badge_paragraph">Connecting Communities, Empowering Patients</div>
                        </div>
                    </div>
                </div>

            </div>

        </section>

        {/* Services Section */}
        <section className="Services">
            <div className="services_content">

                <h2 className="services_header"> Everything You Need for <span className="services_header_colored">Better Healthcare</span> </h2>                                                                                                                   
                <div className="services_list">

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faLocationDot} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Find Nearby Clinics</div>
                            <div className="service_paragraph">Discover clinics near you with real South African facility data. Filter by province, district, and services offered.</div>
                        </div>
                    </div>

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faCalendarAlt} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Book Appointments</div>
                            <div className="service_paragraph">View available slots and book appointments instantly. Reschedule or cancel with ease — no more long phone queues.</div>
                        </div>
                    </div>  

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faClock} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Virtual Queues</div>
                            <div className="service_paragraph">Join virtual queues and get real-time updates on your wait time and position.</div>
                        </div>
                    </div>

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faShieldAlt} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Secure Access</div>
                            <div className="service_paragraph">Sign in securely with your ID. Role-based access for patients, staff, and administrators keeps your data safe.</div>
                        </div>
                    </div> 

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faPeopleGroup} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Staff Management</div>
                            <div className="service_paragraph">Manage patient flow, update statuses, and set availability — all from one powerful dashboard.</div>
                        </div>
                    </div>

                    <div className="service_item">
                        <div className="service_icon">
                            <FontAwesomeIcon icon={faPeopleGroup} size="2x" color="#4CAF50" />
                        </div>
                        <div className="service_text">
                            <div className="service_header">Reports & Analytics</div>
                            <div className="service_paragraph">Gain insights into patient flow, appointment trends, and clinic performance with our comprehensive reporting tools.</div>
                        </div>
                    </div> 

                </div>
            </div>
        </section>

        {/* Contact Section */}
        <section className="Contact">
            <div className="contact_content">
                <div className="contact_details">
                    <h2 className="contact_header">Contact <span className="contact_header_colored">Us</span></h2>
                    <p className="contact_paragraph">Have questions or need support? Our team is here to help. Contact us via email, phone, or visit our office.</p>

                    <div className="contact_info">
                        <div className="contact_company_email">
                            <div className="contact_email_icon"><FontAwesomeIcon icon={faEnvelope} /></div>
                            <div className="contact_email_text">support@queuecare.com</div>
                        </div>

                        <div className="contact_company_phone">
                            <div className="contact_phone_icon"><FontAwesomeIcon icon={faPhone} /></div>
                            <div className="contact_phone_text">+27 123 456 789</div>
                        </div>

                        <div className="contact_company_address">
                            <div className="contact_address_icon"><FontAwesomeIcon icon={faLocationDot} /></div>
                            <div className="contact_address_text">123 Health St, Johannesburg, South Africa</div>
                        </div>
                    </div>

                </div>

                <div className="contact_form">
                    <form onSubmit={(e) => e.preventDefault()}>
                        <div className="contact_name">
                            <div className="contact_field">
                                <label htmlFor="firstName" className="contact_label">First Name</label>
                                <input id="firstName" type="text" placeholder="First Name" className="contact_input" />
                            </div>
                            <div className="contact_field">
                                <label htmlFor="lastName" className="contact_label">Last Name</label>
                                <input id="lastName" type="text" placeholder="Last Name" className="contact_input" />
                            </div>
                        </div>

                        <div className="contact_message">
                            <div className="contact_field">
                                <label htmlFor="subject" className="contact_label">Subject</label>
                                <input id="subject" type="text" placeholder="Subject" className="contact_input" />
                            </div>
                            <div className="contact_field">
                                <label htmlFor="email" className="contact_label">Email</label>
                                <input id="email" type="email" placeholder="Your Email" className="contact_input" />
                            </div>
                            <div className="contact_field">
                                <label htmlFor="message" className="contact_label">Message</label>
                                <textarea id="message" placeholder="Your Message" className="contact_textarea"></textarea>
                            </div>
                        </div>

                        <div className="contact_buttons">
                            <button type="submit" className="contact_submit_button">Submit</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="footer">
            <div className="footer-content">

                {/* Left side */}
                <div className="footer-section">
                    <h2>QueueCare</h2>
                    <p>Making healthcare easier and more accessible across South Africa. </p>
                </div>

                {/* Quick Links */}
                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="#">Home</a></li>
                        <li><a href="#">About</a></li>
                        <li><a href="#">Services</a></li>
                        <li><a href="#">Contact</a></li>
                    </ul>
                </div>

                {/* Legal */}
                <div className="footer-section">
                    <h3>Legal</h3>
                    <ul>
                        <li><a href="#">Privacy Policy</a></li>
                        <li><a href="#">Terms of Service</a></li>
                        <li><a href="#">Cookie Policy</a></li>
                    </ul>
                </div>

            </div>

            {/* Bottom */}
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} ClinicQ. All rights reserved.</p>
           </div>
        </footer>



    </div>
  );
}

export default Welcome;