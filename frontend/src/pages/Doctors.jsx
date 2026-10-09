import React from 'react'
import Navbar from '../components/Navbar'
import DoctorsPage from '../components/DoctorsPage'
import Footer from '../components/Footer'
import Chatbot from "../components/chatbot/Chatbot";

const Doctors = () => {
  return (
    <div>
        <Navbar/>
        <DoctorsPage/>
        <Footer/>
        <Chatbot />
    </div>
  )
}

export default Doctors