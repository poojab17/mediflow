import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Medal, ChevronsRight, MousePointer, Stethoscope, RefreshCw } from "lucide-react";
import defaultDocImg from "../assets/HD1.png";

const HomeDoctors = ({ apiBase, previewCount = 8 }) => {
  const API_BASE = apiBase || "http://localhost:4000";
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDoctors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/doctors`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (json && json.message) || `Failed to load doctors (${res.status})`;
        setError(msg);
        setDoctors([]);
        return;
      }

      const items = (json && (json.data || json)) || [];
      const normalized = (Array.isArray(items) ? items : []).map((d) => {
        const id = d._id || d.id;
        const image =
          d.imageUrl || d.image || d.imageSmall || d.imageSrc || "";
        const available =
          (typeof d.availability === "string"
            ? d.availability.toLowerCase() === "available"
            : typeof d.available === "boolean"
              ? d.available
              : d.availability === true) || d.availability === "Available";
        return {
          id,
          name: d.name || "Unknown",
          specialization: d.specialization || "General Specialist",
          image,
          experience:
            d.experience || d.experience === 0 ? String(d.experience) : "",
          fee: d.fee ?? d.price ?? 0,
          available,
          raw: d,
        };
      });

      setDoctors(normalized);
    } catch (err) {
      console.error("load doctors error:", err);
      setError("Network error while connecting to medical registry.");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, [API_BASE]);

  const preview = doctors.slice(0, previewCount);

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 text-blue-900 text-xs font-semibold tracking-wider uppercase mb-3 border border-blue-200/60">
            VERIFIED SPECIALISTS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Our Medical Team
          </h2>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Book appointments quickly with our verified medical specialists across all clinical departments.
          </p>
        </div>

        {/* Error / Offline Notice */}
        {error && !loading && (
          <div className="text-center py-10 px-6 rounded-2xl bg-slate-50 border border-slate-200/70 max-w-xl mx-auto mb-10">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3.5 border border-blue-100">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Specialist Registry
            </h3>
            <p className="text-sm text-slate-600 mt-1 mb-5 leading-relaxed">
              {error} Explore our verified doctor directory to view specialists and check clinic schedules.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={loadDoctors}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <Link
                to="/doctors"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Explore Doctors
                <ChevronsRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl border border-slate-100 p-4 flex flex-col"
              >
                <div className="w-full h-52 bg-slate-100 rounded-xl mb-4" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mb-4" />
                <div className="h-9 bg-slate-100 rounded-xl mt-auto w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Doctors Grid */}
        {!loading && preview.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {preview.map((doctor) => (
              <article
                key={doctor.id || doctor.name}
                className="group bg-white rounded-2xl border border-slate-200/70 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 overflow-hidden flex flex-col hover:-translate-y-1"
                aria-labelledby={`doctor-${doctor.id}-name`}
              >
                {/* Doctor Image Container */}
                <div className="relative h-56 w-full bg-slate-50 overflow-hidden flex items-center justify-center">
                  <img
                    src={doctor.image || defaultDocImg}
                    alt={doctor.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultDocImg;
                    }}
                  />

                  {/* Availability Badge */}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-md ${
                      doctor.available
                        ? "bg-emerald-50/90 text-emerald-700 border-emerald-200/80"
                        : "bg-slate-100/90 text-slate-600 border-slate-200/80"
                    }`}
                  >
                    {doctor.available ? "Available" : "Unavailable"}
                  </span>
                </div>

                {/* Doctor Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      id={`doctor-${doctor.id}-name`}
                      className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors"
                    >
                      {doctor.name}
                    </h3>

                    <p className="text-sm font-medium text-blue-600 mt-0.5">
                      {doctor.specialization}
                    </p>

                    {doctor.experience && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 font-medium">
                        <Medal className="w-3.5 h-3.5 text-blue-600" />
                        <span>{doctor.experience} years experience</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    {doctor.available ? (
                      <Link
                        to={`/doctors/${doctor.id}`}
                        state={{ doctor: doctor.raw || doctor }}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                        aria-label={`Book appointment with ${doctor.name}`}
                      >
                        <span>Book Now</span>
                        <ChevronsRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm bg-slate-100 text-slate-400 cursor-not-allowed"
                        aria-label={`${doctor.name} is currently not available`}
                      >
                        <MousePointer className="w-4 h-4" />
                        <span>Not Available</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Clear Action to View All Doctors */}
        <div className="mt-12 text-center">
          <Link
            to="/doctors"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-semibold transition-all duration-200 shadow-xs"
          >
            <span>Explore All Doctors</span>
            <ChevronsRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeDoctors;
