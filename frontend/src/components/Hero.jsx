import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarCheck,
  ShieldCheck,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import doctorHeroImg from "../assets/New_Banner.png";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-sky-50/20 to-white py-12 sm:py-16 lg:py-20">
      {/* Soft Background Accents */}
      <div
        className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-blue-200/30 to-teal-200/25 blur-3xl pointer-events-none rounded-full -z-10"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Messaging & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/70 text-blue-900 text-xs font-semibold tracking-wider uppercase mb-5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              YOUR HEALTH, SIMPLIFIED
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Better care.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">
                A smoother journey.
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Find the right doctors, manage appointments, and keep your
              healthcare journey organized in one place.
            </p>

            {/* Primary Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
              <button
                onClick={() => navigate("/doctors")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm shadow-blue-600/25 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Book an Appointment
              </button>

              <button
                onClick={() => navigate("/doctors")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm border border-slate-200 hover:border-slate-300 shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-blue-600" />
                Explore Doctors
              </button>
            </div>

            {/* Three Concise Benefits */}
            <div className="mt-10 pt-8 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
                  Easy appointment booking
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100/80">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
                  Trusted medical professionals
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100/80">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
                  Organized healthcare records
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Panel */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-lg lg:max-w-none">
              {/* Subtle background container with rounded corners and light blue/teal accents */}
              <div className="relative rounded-3xl bg-gradient-to-tr from-blue-100/60 via-teal-50/40 to-sky-100/60 p-4 sm:p-6 pb-0 sm:pb-0 border border-blue-100/80 shadow-lg shadow-blue-500/5 overflow-hidden">
                {/* Decorative radial gradient inside panel */}
                <div
                  className="absolute -top-12 -right-12 w-48 h-48 bg-teal-200/40 rounded-full blur-2xl"
                  aria-hidden="true"
                />
                <div
                  className="absolute bottom-0 left-0 w-48 h-48 bg-blue-200/40 rounded-full blur-2xl"
                  aria-hidden="true"
                />

                {/* Professional Doctor Imagery */}
                <div className="relative z-10 flex justify-center pt-2">
                  <img
                    src={doctorHeroImg}
                    alt="MediFlow Professional Healthcare Specialists"
                    className="w-auto max-h-[380px] sm:max-h-[420px] object-contain drop-shadow-sm transform hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Small Floating Appointment Card */}
              <div className="absolute -bottom-4 sm:-bottom-5 -left-2 sm:-left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3.5 shadow-lg shadow-slate-900/5 flex items-center gap-3 max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100/80">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    Appointment Confirmed
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Specialist Consultation · Today
                  </p>
                </div>
              </div>

              {/* Small Floating Health-Record Card */}
              <div className="absolute top-4 sm:top-6 -right-2 sm:-right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl p-3 shadow-lg shadow-slate-900/5 flex items-center gap-2.5 max-w-[220px] animate-in fade-in slide-in-from-top-2 duration-700">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    Health Records
                  </p>
                  <p className="text-[11px] text-teal-600 font-semibold truncate">
                    ✓ Organized & Synced
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
