import React from "react";
import { useNavigate } from "react-router-dom";
import "./NavBar.css";
import { LuLogOut } from "react-icons/lu";
import { FaUserDoctor } from "react-icons/fa6";
import { SlCalender } from "react-icons/sl";
import { CgProfile } from "react-icons/cg";
import { FaHome } from "react-icons/fa";
import { FaPhoneAlt } from "react-icons/fa";
import { GiArmBandage } from "react-icons/gi";

function Navbar({ page }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setTimeout(() => {
      localStorage.removeItem("userId");
      navigate("/");
    }, 300);
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <span>THE</span>
        <br />
        <span>LANNISTERS</span>
      </div>

      <div className="nav-links">
        {page === "patient" && (
          <>
            <a href="#" className="active">
              <CgProfile className="profile-icon" /> Profile
            </a>
            <a href="#">
              <SlCalender className="appointments-icon" /> Appointments
            </a>
            <a href="#">
              <FaUserDoctor className="doctor-icon" /> Doctors
            </a>
            <a
              onClick={handleLogout}
              className="logout"
              style={{ cursor: "pointer" }}
            >
              <LuLogOut className="logout-icon" /> LogOut
            </a>
          </>
        )}

        {page === "home" && (
          <>
            <a href="#" className="active">
              <FaHome className="home-icon" /> Home
            </a>
            <a href="#">
              <FaPhoneAlt className="contact-icon" /> Contact us
            </a>
          </>
        )}
        {page === "doctor" && (
          <>
            <a href="#" className="active">
              <CgProfile className="profile-icon" /> Profile
            </a>
            <a href="#">
              <SlCalender className="appointments-icon" /> Appointments
            </a>
            <a href="#">
              <GiArmBandage className="patient-icon" /> Patients
            </a>
            <a
              onClick={handleLogout}
              className="logout"
              style={{ cursor: "pointer" }}
            >
              <LuLogOut className="logout-icon" /> LogOut
            </a>
          </>
        )}

        {page === "admin" && (
          <>
            <a href="#" className="active">
              <CgProfile className="profile-icon" /> Profile
            </a>
            <a
              onClick={handleLogout}
              className="logout"
              style={{ cursor: "pointer" }}
            >
              <LuLogOut className="logout-icon" /> LogOut
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
export default Navbar;
