import React from 'react'
import Navbar from '../components/Navbar'
import ContactPage from '../components/ContactPage'
import Footer from '../components/Footer'
import Chatbot from "../components/chatbot/Chatbot";
const Contact = () => {
  return (
    <div>
        <Navbar/>
        <ContactPage/>
        <Footer/>
         <Chatbot />
    </div>
  )
}

export default Contact