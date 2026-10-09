import React from "react";
import {
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Send,
  Stethoscope,
  Activity,
} from "lucide-react";
import logo from "../assets/logo.png";
import { footerStyles } from "../assets/dummyStyles";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";


const Footer = () => {

  const [email, setEmail] = useState("");

  const handleSubscribe = async () => {
    if (!email) {
      toast.error("Enter email");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:4000/api/newsletter/subscribe",
        { email }
      );

      if (res.data.success) {
        toast.success("Subscribed successfully 🎉");
        setEmail("");
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      toast.error("Server error");
    }
  };


  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: "Home", href: "/" },
    { name: "Doctors", href: "/doctors" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact" },
    { name: "Appointments", href: "/appointments" },
  ];

  const services = [
    { name: "Blood Pressure Check", href: "/services" },
    { name: "Blood Sugar Test", href: "/services" },
    { name: "Full Blood Count", href: "/services" },
    { name: "X-Ray Scan", href: "/services" },
    { name: "Thyroid Test", href: "/services" },
  ];

  const socialLinks = [
    {
      Icon: Linkedin,
      color: footerStyles.linkedinColor,
      name: "LinkedIn",
      href: "https://www.linkedin.com/in/tushartyagi28/",
    },
  ];

  return (
    <footer className={`${footerStyles.footerContainer} backdrop-blur-2xl bg-white/10 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25)] relative overflow-hidden`}>

      {/* Glass Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/5 pointer-events-none"></div>

      {/* Floating Icons */}
      <div className={footerStyles.floatingIcon1}>
        <Stethoscope className={footerStyles.stethoscopeIcon} />
      </div>

      <div className={footerStyles.floatingIcon2} style={{ animationDelay: "3s" }}>
        <Activity className={footerStyles.activityIcon} />
      </div>

      {/* Main */}
      <div className={`${footerStyles.mainContent} bg-white/5 backdrop-blur-xl rounded-2xl`}>
        <div className={footerStyles.gridContainer}>

          {/* Company */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/30 shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300 rounded-xl p-4">
            <div className={footerStyles.logoContainer}>
              <div className={footerStyles.logoWrapper}>
                <div className={footerStyles.logoImageContainer}>
                  <img src={logo} alt="Logo" className={footerStyles.logoImage} />
                </div>
              </div>

              <div>
                <h2 className={footerStyles.companyName}>CuraDesk</h2>
                <p className={footerStyles.companyTagline}>Healthcare</p>
              </div>
            </div>

            <p className={footerStyles.companyDescription}>
             Streamlining healthcare operations with smart appointment management, secure records, and seamless patient care.
            </p>

            <div className={footerStyles.contactContainer}>
              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <Phone className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>7289086655</span>
              </div>

              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <Mail className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>
                  anjutushartyagi2810@gmail.com
                </span>
              </div>

              <div className={footerStyles.contactItem}>
                <div className={footerStyles.contactIconWrapper}>
                  <MapPin className={footerStyles.contactIcon} />
                </div>
                <span className={footerStyles.contactText}>Delhi, India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/30 shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300 rounded-xl p-4">
            <h3 className={footerStyles.sectionTitle}>Quick Links</h3>
            <ul className={footerStyles.linksList}>
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className={footerStyles.quickLink}>
                    <div className={footerStyles.quickLinkIconWrapper}>
                      <ArrowRight className={footerStyles.quickLinkIcon} />
                    </div>
                    <span>{link.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/30 shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300 rounded-xl p-4">
            <h3 className={footerStyles.sectionTitle}>Our Services</h3>
            <ul className={footerStyles.linksList}>
              {services.map((service) => (
                <li key={service.name}>
                  <a href={service.href} className={footerStyles.serviceLink}>
                    <div className={footerStyles.serviceIcon} />
                    <span>{service.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/30 shadow-lg hover:shadow-2xl hover:bg-white/20 transition-all duration-300 rounded-xl p-4">
            <h3 className={footerStyles.newsletterTitle}>Stay Connected</h3>

            <p className={footerStyles.newsletterDescription}>
              Subscribe for health tips, medical updates, and wellness insights.
            </p>

            {/* ✅ FINAL FIXED INPUT */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full">

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="flex-1 w-full min-w-0 px-5 py-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-gray-800 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              />

              <button
                onClick={handleSubscribe}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full flex items-center justify-center gap-2 transition w-full sm:w-auto whitespace-nowrap shadow-md hover:shadow-lg"
              >
                <Send className="w-2 h-2" />
                Subscribe
              </button>

            </div>

          </div>

        </div>

        {/* Bottom */}
        <div className={`${footerStyles.bottomSection} flex justify-between items-center flex-wrap gap-2`}>

         

          {/* Right */}
          <div className="text-sm text-cyan-700 font-large">
            Designed by <span className="font-bold text-blue-600 hover:text-blue-700 transition">Tushar Tyagi</span>
          </div>

        </div>
      </div>

      <style>{footerStyles.animationStyles}</style>
    </footer>
  );
};

export default Footer;