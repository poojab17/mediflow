import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import Hero from "./components/Hero.jsx";
import Home from "./pages/Home";
import Add from "./pages/Add";
import List from "./pages/List";
import Appointments from "./pages/Appointments";
import SerDashboard from "./pages/SerDashboard";
import AddSer from "./pages/AddSer.jsx";
import ListService from "./pages/ListService.jsx";
import ServiceAppointments from "./pages/ServiceAppointments.jsx";




function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono">
        <p className="text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // If user is not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen font-mono flex items-center justify-center bg-gradient-to-b from-emerald-50 via-green-50 to-emerald-100 px-4">
        <div className="text-center">

          <p className="text-emerald-800 font-semibold text-lg sm:text-2xl mb-4">
            Please sign in to view this page
          </p>

          <div className="flex justify-center">
            <Link
              to="/"
              className="px-4 py-2 text-sm rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all duration-300"
            >
              HOME
            </Link>
          </div>

        </div>
      </div>
    );
  }

  return children;
}

const App = () => {
  return (
    <div>
      <Routes>
        {/* Public Page */}
        <Route path="/" element={<Hero />} />

        {/* Protected Dashboard */}
        <Route
          path="/h"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route path="/add" element={<RequireAuth><Add /></RequireAuth>} />
        <Route path="/list" element={<RequireAuth><List /></RequireAuth>} />
        <Route
          path="/appointments"
          element={
            <RequireAuth>
              <Appointments />
            </RequireAuth>
          }
        />
        <Route
          path="/service-dashboard"
          element={
            <RequireAuth>
              <SerDashboard />
            </RequireAuth>
          }
        
        />
         <Route
        path="/add-service"
        element={
          <RequireAuth>
            <AddSer />
          </RequireAuth>
        }
      />
        <Route
        path="/list-service"
        element={
          <RequireAuth>
            <ListService />
          </RequireAuth>
        }
      />
      <Route
        path="/service-appointments"
        element={
          <RequireAuth>
            <ServiceAppointments />
          </RequireAuth>
        }
      />

      </Routes>
    </div>
  );
};

export default App;
