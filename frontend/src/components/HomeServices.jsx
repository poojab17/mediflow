import React from "react";
import { Link } from "react-router-dom";
import {
  Stethoscope,
  Calendar,
  FileText,
  ClipboardList,
  Sparkles,
  Activity,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    title: "Doctor Discovery",
    description:
      "Find and connect with certified specialists across multiple medical departments with verified qualifications.",
    icon: Stethoscope,
    link: "/doctors",
    cta: "Explore Doctors",
    accent: "blue",
  },
  {
    title: "Appointment Booking",
    description:
      "Reserve in-person or virtual consultations instantly with transparent scheduling and instant confirmation.",
    icon: Calendar,
    link: "/doctors",
    cta: "Book Appointment",
    accent: "teal",
  },
  {
    title: "Medical Report Analysis",
    description:
      "Upload laboratory test results and diagnostic documents for intelligent OCR extraction and clinical summaries.",
    icon: FileText,
    link: "/curadesk-workspace",
    cta: "Analyze Reports",
    accent: "indigo",
  },
  {
    title: "Patient Records",
    description:
      "Keep track of scheduled consultations, treatment history, status updates, and payment invoices in one secure hub.",
    icon: ClipboardList,
    link: "/appointments",
    cta: "View Records",
    accent: "sky",
  },
  {
    title: "AI Healthcare Assistance",
    description:
      "Get conversational symptom assessment, medical clarification, and personalized specialist recommendations 24/7.",
    icon: Sparkles,
    link: "/curadesk-workspace",
    cta: "Consult AI",
    accent: "purple",
  },
  {
    title: "Diagnostic Services",
    description:
      "Book clinical laboratory tests including blood panels, metabolic screenings, and routine diagnostic checkups.",
    icon: Activity,
    link: "/services",
    cta: "View Diagnostics",
    accent: "emerald",
  },
];

const HomeServices = () => {
  return (
    <section className="py-16 sm:py-20 bg-slate-50/70 border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 text-blue-900 text-xs font-semibold tracking-wider uppercase mb-3 border border-blue-200/60">
            OUR CORE SERVICES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Integrated Healthcare Services
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Everything you need to navigate your healthcare journey with
            confidence — from specialist discovery to intelligent records.
          </p>
        </div>

        {/* Clean Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Link
                key={index}
                to={service.link}
                className="group relative bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200 border border-blue-100/80">
                    <Icon className="w-6 h-6 stroke-[2]" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </h3>

                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                  <span>{service.cta}</span>
                  <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeServices;
