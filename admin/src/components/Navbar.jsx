import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { navbarStyles } from '../assets/dummyStyles';
import logoImg from '../assets/logo.png';
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
    Home,
    UserPlus,
    Users,
    Calendar,
    Grid,
    PlusSquare,
    List,
    Menu,
    X
} from "lucide-react";

import { useClerk, useUser, useAuth } from "@clerk/clerk-react";

import ThemeToggle from "../components/ThemeToggle";


const ns = navbarStyles;

const Navbar = () => {

    const [open, setOpen] = useState(false);
    const navInnerRef = useRef(null);
    const indicatorRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    // Clerk
    const clerk = useClerk?.();
    const { getToken, isLoaded: authLoaded } = useAuth();
    const { isSignedIn, isLoaded: userLoaded } = useUser();

    const moveIndicator = useCallback(() => {
        const container = navInnerRef.current;
        const ind = indicatorRef.current;
        if (!container || !ind) return;

        const active = container.querySelector(".nav-item.active");

        if (!active) {
            ind.style.opacity = "0";
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();

        const left = activeRect.left - containerRect.left + container.scrollLeft;
        const width = activeRect.width;

        ind.style.transform = `translateX(${left}px)`;
        ind.style.width = `${width}px`;
        ind.style.opacity = "1";

    }, []);

    useLayoutEffect(() => {
        moveIndicator();
        const t = setTimeout(moveIndicator, 120);
        return () => clearTimeout(t);
    }, [location.pathname, moveIndicator]);

    useEffect(() => {
        const container = navInnerRef.current;
        if (!container) return;

        const onScroll = () => moveIndicator();

        container.addEventListener("scroll", onScroll, { passive: true });

        const ro = new ResizeObserver(moveIndicator);
        ro.observe(container);

        window.addEventListener("resize", moveIndicator);

        return () => {
            container.removeEventListener("scroll", onScroll);
            ro.disconnect();
            window.removeEventListener("resize", moveIndicator);
        };
    }, [moveIndicator]);

    // save clerk token
    useEffect(() => {

        const storeToken = async () => {

            if (!authLoaded || !userLoaded) return;

            if (!isSignedIn) {
                localStorage.removeItem("clerk_token");
                return;
            }

            try {
                const token = await getToken();
                if (token) {
                    localStorage.setItem("clerk_token", token);
                }
            } catch (err) {
                console.warn("Token fetch failed", err);
            }
        };

        storeToken();

    }, [isSignedIn, authLoaded, userLoaded, getToken]);

    const handleOpenSignIn = () => {
        clerk?.openSignIn();
        navigate("/");
    };

    const handleSignOut = async () => {

        try {
            await clerk?.signOut();
        } catch (err) {
            console.error(err);
        }

        localStorage.removeItem("clerk_token");
        navigate("/");
    };

    return (
        <header className={ns.header}>

            <nav className={ns.navContainer}>

                <div className={ns.flexContainer}>

                    {/* Logo */}

                    <div className={ns.logoContainer}>
                        <img src={logoImg} alt="logo" className={ns.logoImage} />

                        <Link to="/">
                            <div className={ns.logoLink}>CuraDesk</div>
                            <div className={ns.logoSubtext}>Healthcare Solutions</div>
                        </Link>
                    </div>

                    {/* CENTER NAV */}

                    <div className={ns.centerNavContainer}>

                        <div className={ns.glowEffect}>

                            <div className={ns.centerNavInner}>

                                <div
                                    ref={navInnerRef}
                                    tabIndex={0}
                                    className={ns.centerNavScrollContainer}
                                >

                                    <div ref={indicatorRef} className={ns.indicator}></div>

                                    <CenterNavItem to="/h" icon={<Home size={18} />} label="Dashboard" />
                                    <CenterNavItem to="/add" icon={<UserPlus size={18} />} label="Add Doctor" />
                                    <CenterNavItem to="/list" icon={<Users size={18} />} label="List Doctors" />
                                    <CenterNavItem to="/appointments" icon={<Calendar size={18} />} label="Appointments" />
                                    <CenterNavItem to="/service-dashboard" icon={<Grid size={18} />} label="Service Dashboard" />
                                    <CenterNavItem to="/add-service" icon={<PlusSquare size={18} />} label="Add Service" />
                                    <CenterNavItem to="/list-service" icon={<List size={18} />} label="List Services" />
                                    <CenterNavItem to="/service-appointments" icon={<Calendar size={18} />} label="Service Appointments" />
                                </div>

                            </div>

                        </div>

                    </div>

                    {/* RIGHT SIDE */}

                    <div className={ns.rightContainer}>

                        {/* 🌙 DARK MODE TOGGLE */}
                        <ThemeToggle />

                        {isSignedIn ? (
                            <button
                                onClick={handleSignOut}
                                className={ns.signOutButton + " " + ns.cursorPointer}
                            >
                                Sign Out
                            </button>
                        ) : (
                            <div className="hidden lg:flex items-center gap-2">
                                <button
                                    onClick={handleOpenSignIn}
                                    className={ns.loginButton + " " + ns.cursorPointer}
                                >
                                    Login
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setOpen(v => !v)}
                            className={ns.mobileMenuButton}
                        >
                            {open ? <X size={18} /> : <Menu size={18} />}
                        </button>




                      
                    </div>

                </div>

                {/* MOBILE MENU */}

                {open && (
                    <div
                        className={ns.mobileOverlay}
                        onClick={() => setOpen(false)}
                    />
                )}

                {open && (
                    <div className={ns.mobileMenuContainer}>

                        <div className={ns.mobileMenuInner}>

                           

                            <MobileItem to="/h" icon={<Home size={16} />} label="Dashboard" onClick={() => setOpen(false)} />
                            <MobileItem to="/add" icon={<UserPlus size={16} />} label="Add Doctor" onClick={() => setOpen(false)} />
                            <MobileItem to="/list" icon={<Users size={16} />} label="List Doctors" onClick={() => setOpen(false)} />
                            <MobileItem to="/appointments" icon={<Calendar size={16} />} label="Appointments" onClick={() => setOpen(false)} />
                            <MobileItem to="/service-dashboard" icon={<Grid size={16} />} label="Service Dashboard" onClick={() => setOpen(false)} />
                            <MobileItem to="/add-service" icon={<PlusSquare size={16} />} label="Add Service" onClick={() => setOpen(false)} />
                            <MobileItem to="/list-service" icon={<List size={16} />} label="List Services" onClick={() => setOpen(false)} />
                            <MobileItem to="/service-appointments" icon={<Calendar size={16} />} label="Service Appointments" onClick={() => setOpen(false)} />

                            <div className={ns.mobileAuthContainer}>
                                {isSignedIn ? (
                                    <button
                                        onClick={() => {
                                            handleSignOut();
                                            setOpen(false);
                                        }}
                                        className={ns.mobileSignOutButton}
                                    >
                                        Sign Out
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => {
                                                handleOpenSignIn();
                                                setOpen(false);
                                            }}
                                            className={ns.mobileLoginButton + " " + ns.cursorPointer}
                                        >
                                            Login
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>
                )}

            </nav>

        </header>
    );
};

export default Navbar;


function CenterNavItem({ to, icon, label }) {

    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""} ${ns.centerNavItemBase} ${isActive ? ns.centerNavItemActive : ns.centerNavItemInactive}`
            }
        >
            <span className="flex items-center gap-1">
                {icon}
                <span className="font-medium">{label}</span>
            </span>
        </NavLink>
    );
}


function MobileItem({ to, icon, label, onClick }) {

    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `${ns.mobileItemBase} ${isActive ? ns.mobileItemActive : ns.mobileItemInactive}`
            }
        >
            {icon}
            <span className="font-medium text-sm">{label}</span>
        </NavLink>
    );
}