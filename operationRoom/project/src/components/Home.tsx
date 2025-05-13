import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./NavBar.jsx";
import "./Home.css";
import HomePageBed from "../assets/HomePageBed.png";
import HomePageMidKit from "../assets/HomePageMidKit.png";
import HomePageClock from "../assets/HomePageClock.png";
import HomePageTop from "../assets/HomePageTop.png";
import HomePageMiddle from "../assets/HomePageMiddle.png";
import HomePageBottom from "../assets/HomePageBottom.png";

function Home() {
    const navigate = useNavigate();

    const handleJoinUs = () => {
        setTimeout(() => {
            navigate("/login");
        }, 300);
    };
    useEffect(() => {
        const handleScroll = () => {
            const middleRow = document.querySelector('.middle-row');
            const servicesTitle = document.querySelector('.home-content > h1:nth-of-type(1)');
            const servicesDesc = document.querySelector('.home-content > p:nth-of-type(1)');
            const bottomRow = document.querySelector('.bottom-row');
            const bottomImage = document.querySelector('.image-bottom');  
    
            const isInViewport = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect();
                return (
                    rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8
                );
            };
    
            if (isInViewport(middleRow)) {
                middleRow.classList.add('visible');
            }
    
            if (isInViewport(servicesTitle)) {
                servicesTitle.classList.add('visible');
            }
    
            if (isInViewport(servicesDesc)) {
                servicesDesc.classList.add('visible');
            }
    
            if (isInViewport(bottomRow)) {
                bottomRow.classList.add('visible');
            }
    
            
            if (isInViewport(bottomImage)) {
                bottomImage.classList.add('visible');
            }
        };
    
        window.addEventListener('scroll', handleScroll);
      
        setTimeout(handleScroll, 300);
    
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
    

    return (
        <div className="home-container">
            <Navbar page="home"/>
            <div className="home-content">
                <div className="top-row">
                    <div className="col-md-6 col-sm-12">
                        <h1>Best Care For Your Family</h1>
                        <p>Ensuring Health, Happiness, and Well-being for Your Loved Ones.</p>
                        <button className="btn-join" onClick={handleJoinUs}>Join Us</button>
                    </div>
                    <div className="col-md-6 col-sm-12">
                        <img src={HomePageTop} className="image-top" alt="top-image"/>
                    </div>
                </div>

                <div className="middle-row">
                    <div className="col-md-6 col-sm-12">
                        <img src={HomePageMiddle} className="image-middle" alt="middle-image"/>
                    </div>
                    <div className="col-md-6 col-sm-12">
                        <h1>About us</h1>
                        <p>We are HIS System for Operation. Our system streamlines operation room <br/>management,
                            ensuring better coordination, faster decisions, and improved <br/> patient outcomes.</p>
                    </div>
                </div>

                <h1>Our Services</h1>
                <p>We provide a comprehensive suite of solutions designed to <br/> optimize the efficiency, safety, and
                    effectiveness of every procedure.</p>
                <div className="bottom-row">
                    <div className="col-md-4 col-sm-12">
                        <div className="bottom-card">
                            <img src={HomePageBed} className="row-image-bed" alt="bed"/>
                            <p>Operation Room Workflow Management</p>
                        </div>
                    </div>
                    <div className="col-md-4 col-sm-12">
                        <div className="bottom-card">
                            <img src={HomePageMidKit} className="row-image-midkit" alt="midkit"/>
                            <p>Surgical Equipment and Inventory Tracking</p>
                        </div>
                    </div>
                    <div className="col-md-4 col-sm-12">
                        <div className="bottom-card">
                            <img src={HomePageClock} className="row-image-clock" alt="clock"/>
                            <p>Appointment Tracking</p>
                        </div>
                    </div>
                </div>
                <img src={HomePageBottom} className="image-bottom" alt="bottom-image"/>
            </div>
        </div>
    );
}

export default Home;