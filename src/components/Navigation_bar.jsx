import React from 'react';
import './Navigation_bar.css';

const Navigation_bar = () => {
    return (
        <nav className="Nav_bar">
            <h1 className="Nav_bar_logo">Community Clinic</h1>

            <ul className="Nav_bar_links">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/services">Services</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>

        </nav>
    );
}

export default Navigation_bar;