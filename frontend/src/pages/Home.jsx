import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import HomeServices from "../components/HomeServices";
import HomeDoctors from "../components/HomeDoctors";
import Chatbot from "../components/chatbot/Chatbot";

const Home = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      <div>
        <Navbar />
        <main>
          <Hero />
          <HomeServices />
          <HomeDoctors />
        </main>
      </div>

      {/* Floating Chatbot Widget preserved */}
      <Chatbot />
    </div>
  );
};

export default Home;