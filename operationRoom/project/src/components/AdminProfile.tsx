import React, { useState, useEffect, useCallback } from "react";
import "./AdminProfile.css";
import NavBar from "./NavBar.jsx";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminProfile() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('patient');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [stats, setStats] = useState({
        doctors: { total: 0, male: 0, female: 0 },
        patients: { total: 0, male: 0, female: 0 }
    });

    const [adminData, setAdminData] = useState({
        name: "",
        nationalID: "",
        gender: "",
        dateOfBirth: "",
        emailAddress: "",
        address: "",
        profileImage: null,
    });

    const userId = localStorage.getItem("userId");

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:5267/admin-stats');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError('Failed to load statistics. Please try again later.');
        }
    }, []);

    const fetchAdminData = useCallback(async () => {
        if (!userId) return;
        
        try {
            setLoading(true);
            setError(""); // Clear error before fetch
            const response = await axios.get(
                `http://localhost:5267/admin-profile?userId=${userId}`
            );

            if (!response.data) {
                throw new Error("No data received");
            }

            setAdminData({
                name: response.data.name ||
                    `${response.data.firstName} ${response.data.lastName}`,
                nationalID: response.data.ssn || "",
                gender: response.data.gender || "",
                dateOfBirth: response.data.birthdate || "",
                emailAddress: response.data.email || "",
                address: response.data.address || "",
                profileImage: response.data.profileImage || null,
            });
        } catch (error) {
            console.error("Error fetching profile data:", error);
            setError("Failed to load profile data. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAdminData();
        fetchStats();
    }, [fetchAdminData, fetchStats]);

    // Real-time search effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.trim()) {
                try {
                    const response = await axios.get(`http://localhost:5267/search-users`, {
                        params: {
                            userType: searchType,
                            name: searchTerm
                        }
                    });
                    setResults(response.data);
                } catch (error) {
                    console.error('Search failed:', error);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, searchType]);

    const handleDelete = async (id) => {
        if (window.confirm(`Are you sure you want to delete this ${searchType}? This action cannot be undone.`)) {
            try {
                await axios.delete(`http://localhost:5267/delete-user`, {
                    params: {
                        userType: searchType,
                        userId: id
                    }
                });
                setResults(results.filter(item => item.id !== id));
                setSuccessMessage(`${searchType} deleted successfully`);
                setTimeout(() => setSuccessMessage(''), 3000);
                // Refresh stats after deletion
                fetchStats();
            } catch (error) {
                console.error('Delete failed:', error);
                setError('Failed to delete. Please try again.');
                setTimeout(() => setError(''), 3000);
            }
        }
    };

    const viewProfile = async (id) => {
        try {
            const response = await axios.get(`http://localhost:5267/get-user-redirect`, {
                params: { userId: id }
            });
            
            if (response.data.redirect) {
                localStorage.setItem('viewedUserId', id.toString());
                navigate(response.data.redirect);
            }
        } catch (error) {
            console.error('Error getting user redirect:', error);
            setError('Failed to view profile. Please try again.');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleLogout = () => {
        // Clear all local storage items
        localStorage.clear();
        // Redirect to login page
        navigate('/login');
    };

    return (
        <div className="dashboard-container">
            <NavBar page="admin" />

            <main className="dashboard-main">
                {error && <div className="error-message">{error}</div>}
                {successMessage && (
                    <div className="success-message">{successMessage}</div>
                )}

                <div className="dashboard-grid">
                    {/* Admin Profile Card */}
                    <div className="dashboard-card profile-card">
                        <div className="profile-header">
                            <div className="profile-image">
                                {adminData.profileImage ? (
                                    <img
                                        src={adminData.profileImage}
                                        alt="Profile"
                                        className="profile-pic"
                                    />
                                ) : (
                                    <div className="profile-pic-placeholder"></div>
                                )}
                            </div>
                            <div className="profile-info">
                                <div className="admin-name">
                                    <h2>{adminData.name}</h2>
                                    <span className="admin-badge">Administrator</span>
                                </div>
                                <div className="admin-details">
                                    <div className="detail-item">
                                        <i className="fas fa-envelope"></i>
                                        <span>{adminData.emailAddress}</span>
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-id-card"></i>
                                        <span>{adminData.nationalID}</span>
                                    </div>
                                    <div className="detail-item">
                                        <i className="fas fa-venus-mars"></i>
                                        <span>{adminData.gender}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Doctor Statistics Card */}
                    <div className="dashboard-card stats-card">
                        <h3>Doctor Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <h4>Total Doctors</h4>
                                <p>{stats.doctors.total}</p>
                            </div>
                            <div className="stat-item">
                                <h4>Male Doctors</h4>
                                <p>{stats.doctors.male}</p>
                            </div>
                            <div className="stat-item">
                                <h4>Female Doctors</h4>
                                <p>{stats.doctors.female}</p>
                            </div>
                        </div>
                    </div>

                    {/* Patient Statistics Card */}
                    <div className="dashboard-card stats-card">
                        <h3>Patient Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <h4>Total Patients</h4>
                                <p>{stats.patients.total}</p>
                            </div>
                            <div className="stat-item">
                                <h4>Male Patients</h4>
                                <p>{stats.patients.male}</p>
                            </div>
                            <div className="stat-item">
                                <h4>Female Patients</h4>
                                <p>{stats.patients.female}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search Controls Card */}
                    <div className="dashboard-card search-card">
                        <div className="search-controls">
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                className="search-type-select"
                            >
                                <option value="patient">Search Patients</option>
                                <option value="doctor">Search Doctors</option>
                            </select>
                            <input
                                type="text"
                                placeholder={`Search ${searchType}s by name...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>
                    </div>

                    {/* Results Card */}
                    <div className="dashboard-card results-card">
                        <h3>Search Results</h3>
                        <div className="results-grid">
                            {results.map((item) => (
                                <div key={item.id} className="result-card">
                                    <img
                                        src={item.profileImage || "/default-avatar.png"}
                                        alt={item.name}
                                        className="result-image"
                                    />
                                    <div className="result-info">
                                        <h4>{item.name}</h4>
                                        <p>{item.email}</p>
                                    </div>
                                    <div className="result-actions">
                                        <button
                                            onClick={() => viewProfile(item.id)}
                                            className="view-button"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="delete-button"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {searchTerm && results.length === 0 && (
                                <p className="no-results">No results found</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AdminProfile;