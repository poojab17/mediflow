import React from 'react';
import Navbar from "../components/Navbar";
import Banner from '../components/Banner';
import HomeDoctors from '../components/HomeDoctors';
import Testimonial from '../components/Testimonial';
import Footer from '../components/Footer';
import Chatbot from "../components/chatbot/Chatbot";


const Home = () => {
    return (
       <div className="min-h-screen bg-white bg-white transition-colors duration-300">
            <Navbar />
            <Banner />
          
            <HomeDoctors />
            <Testimonial />
            <Footer />
             <Chatbot />

        </div>
    );
};

export default Home;