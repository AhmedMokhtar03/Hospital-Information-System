import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import axios from 'axios';
import './Registration.css';
import doctorIcon from '../assets/doctor-icon.png';
import {FaEye, FaEyeSlash} from 'react-icons/fa';

const DoctorRegistration = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
        address: '',
        phoneNumber: '',
        ssn: '',
        department: '',
        gender: '',
        maritalStatus: '',
        birthYear: '',
        birthMonth: '',
        birthDay: ''
    });

    const [errors, setErrors] = useState({
        password: '',
        phoneNumber: '',
        general: ''
    });

    const [touched, setTouched] = useState({
        password: false,
        phoneNumber: false
    });

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Validate fields only if they've been touched already
        if (touched[name]) {
            validateField(name, value);
        }
    };

    const handleBlur = (e) => {
        const {name, value} = e.target;

        setTouched({
            ...touched,
            [name]: true
        });

        validateField(name, value);
    };

    const validateField = (name, value) => {
        switch (name) {
            case 'password':
                if (value.length > 0 && value.length < 8) {
                    setErrors(prev => ({
                        ...prev,
                        password: 'Password must be at least 8 characters.'
                    }));
                } else {
                    setErrors(prev => ({
                        ...prev,
                        password: ''
                    }));
                }
                break;
            case 'phoneNumber':
                if (value.length > 0 && !value.startsWith('01')) {
                    setErrors(prev => ({
                        ...prev,
                        phoneNumber: 'Phone number must start with "01".'
                    }));
                } else {
                    setErrors(prev => ({
                        ...prev,
                        phoneNumber: ''
                    }));
                }
                break;
            default:
                break;
        }
    };

    const handleSSNChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 14) {
            value = value.slice(0, 14);
        }

        if (value.length > 9) {
            value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 9)}-${value.slice(9)}`;
        } else if (value.length > 6) {
            value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
        } else if (value.length > 3) {
            value = `${value.slice(0, 3)}-${value.slice(3)}`;
        }

        setFormData({
            ...formData,
            ssn: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({password: '', phoneNumber: '', general: ''});

        let validationErrors = {
            password: '',
            phoneNumber: '',
            general: ''
        };

        let hasError = false;

        if (formData.password !== formData.confirmPassword) {
            validationErrors.general = 'Passwords do not match.';
            hasError = true;
        }

        if (formData.password.length < 8) {
            validationErrors.password = 'Password must be at least 8 characters.';
            hasError = true;
        }

        if (!formData.phoneNumber.startsWith('01')) {
            validationErrors.phoneNumber = 'Phone number must start with "01".';
            hasError = true;
        }

        if (hasError) {
            setErrors(validationErrors);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5267/doctor-register', formData);
            alert('Registration successful!');
            navigate('/login');
        } catch (err) {
            setErrors({
                ...validationErrors,
                general: 'Registration failed: ' + (err.response?.data?.message || err.message)
            });
        }
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({length: currentYear - 1949}, (_, i) => currentYear - i);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const days = Array.from({length: 31}, (_, i) => i + 1);

    const departments = [
        'Cardiology',
        'Dermatology',
        'Endocrinology',
        'Gastroenterology',
        'Neurology',
        'Obstetrics',
        'Oncology',
        'Ophthalmology',
        'Orthopedics',
        'Pediatrics',
        'Psychiatry',
        'Radiology',
        'Urology'
    ];

    return (
        <div className="registration-container">
            <div className="registration-card">
                <div className="registration-header">
                    <img src={doctorIcon} alt="Doctor" className="registration-icon"/>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div style={{position: 'relative'}}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                placeholder="At Least 8 char A-Z, a-z, !@#*"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                autoComplete="new-password"
                                className={errors.password ? 'input-error' : ''}
                            />
                            <span className="showpassword"
                                  onClick={() => setShowPassword(!showPassword)}
                            >
                {showPassword ? <FaEye/> : <FaEyeSlash/>}
              </span>
                        </div>
                        {errors.password && <div className="field-error-message">{errors.password}</div>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div style={{position: 'relative'}}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                autoComplete="new-password"
                            />
                            <span className="showpassword"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                {showConfirmPassword ? <FaEye/> : <FaEyeSlash/>}
              </span>
                        </div>
                    </div>

                    {errors.general && <div className="error-message">{errors.general}</div>}

                    <div className="form-row">
                        <div className="form-group half">
                            <label htmlFor="firstName">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                name="firstName"
                                placeholder="First Name"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group half">
                            <label htmlFor="lastName">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                name="lastName"
                                placeholder="Last Name"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label htmlFor="address">Address</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                placeholder="Address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group half">
                            <label htmlFor="phoneNumber">Phone Number</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                name="phoneNumber"
                                placeholder="Phone (start with 01)"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                required
                                className={errors.phoneNumber ? 'input-error' : ''}
                            />
                            {errors.phoneNumber && <div className="field-error-message">{errors.phoneNumber}</div>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="ssn">Social Security Number</label>
                        <input
                            type="text"
                            id="ssn"
                            name="ssn"
                            placeholder="XXX-XXX-XXX-XXXXX"
                            value={formData.ssn}
                            onChange={handleSSNChange}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label htmlFor="department">Department</label>
                            <select
                                id="department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Department Name</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group half">
                            <label htmlFor="gender">Gender</label>
                            <select
                                id="gender"
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group Marital-Status">
                        <label htmlFor="maritalStatus">Marital Status</label>
                        <select
                            id="maritalStatus"
                            name="maritalStatus"
                            value={formData.maritalStatus}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>Select Status</option>
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Birthdate</label>
                        <div className="birthdate-row">
                            <select
                                name="birthYear"
                                value={formData.birthYear}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Year</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>

                            <select
                                name="birthMonth"
                                value={formData.birthMonth}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Month</option>
                                {months.map((month, index) => (
                                    <option key={month} value={index + 1}>{month}</option>
                                ))}
                            </select>

                            <select
                                name="birthDay"
                                value={formData.birthDay}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>Day</option>
                                {days.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <button type="submit" className="register-btn">Register</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DoctorRegistration;