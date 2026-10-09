import React from 'react'
import ServicePage from '../components/ServicePage'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Chatbot from "../components/chatbot/Chatbot";

const Service = () => {
  return (
    <div>
        <Navbar/>
        <ServicePage/>
        <Footer/>
        <Chatbot />
    </div>
  )
}

export default Service