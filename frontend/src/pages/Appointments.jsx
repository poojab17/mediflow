import React from 'react'
import AppointmentPage from '../components/AppointmentPage'
import Footer from '../components/Footer'
import DoctorNavbar from '../doctor/DoctorNavbar'
const Appointments = () => {
  return (
    <div>
        <DoctorNavbar/>
        <AppointmentPage/>
        <Footer/>

    </div>
  )
}

export default Appointments