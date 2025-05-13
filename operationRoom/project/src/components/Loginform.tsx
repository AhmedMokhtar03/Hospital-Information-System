import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Loginform.css';
import doctorIcon from '../assets/doctor-icon.png';
import patientIcon from '../assets/patient-icon.png';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedUserType, setSelectedUserType] = useState(null);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5267/login', {
        email: email,
        password: password
      });
      
      console.log('Login result:', response.data);
      if (response.data.userId) {
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('userType', response.data.userType); 
      }

      if (response.data.redirect) {
        navigate(response.data.redirect); 
      }
    } catch (error) {
      if (error.response) {
        if (error.response.data.code === 'INVALID_PASSWORD') {
          setError('Incorrect password. Please try again.');
        } else if (error.response.data.code === 'USER_NOT_FOUND') {
          setError('Email not found. Please check your email address.');
        } else {
          setError(error.response.data.message || 'Authentication failed');
        }
        console.error('Login error:', error.response.data);
      } else if (error.request) {
        setError('No response from server. Please try again later.');
        console.error('Login error:', error.request);
      } else {
        setError('An error occurred. Please try again.');
        console.error('Login error:', error.message);
      }
    }
  };

  const selectDoctor = () => {
    setSelectedUserType('doctor');
  
    setTimeout(() => {
      navigate('/doctor-register');
    }, 300);
  };

  const selectPatient = () => {
    setSelectedUserType('patient');
  
    setTimeout(() => {
      navigate('/patient-register');
    }, 300);
  };
  
  

  return (
    <div className="login-form">
      <form onSubmit={handleSubmit}>
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="showpassword"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </span>
          </div>
        </div>
       
        <button type="submit" className="sign-in-btn">Sign In</button>
       
        <div className="register-section">
          <p>You Don't have account? Register As</p>
          <div className="user-types">
            <div 
              className={`user-type ${selectedUserType === 'doctor' ? 'selected' : ''}`} 
              onClick={selectDoctor}
            >
              <img src={doctorIcon} alt="Doctor" className="user-icon" />
              <span>Doctor</span>
            </div>
            <div 
              className={`user-type ${selectedUserType === 'patient' ? 'selected' : ''}`} 
              onClick={selectPatient}
            >
              <img src={patientIcon} alt="Patient" className="user-icon" />
              <span>Patient</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;