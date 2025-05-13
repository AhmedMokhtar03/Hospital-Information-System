import React, { useState, useEffect, useCallback } from "react";
import "./PatientProfile.css";
import NavBar from "./NavBar.jsx";
import axios from "axios";

function PatientProfile() {
  const [patientData, setPatientData] = useState({
    name: "",
    nationalID: "",
    gender: "",
    bloodGroup: "",
    dateOfBirth: "",
    insurance: "",
    phoneNumber: "",
    emailAddress: "",
    address: "",
    chronicDiseases: "",
    profileImage: null,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const userId = localStorage.getItem("viewedUserId") || localStorage.getItem("userId");
  const isViewedByAdmin = Boolean(localStorage.getItem("viewedUserId"));

  useEffect(() => {
    return () => {
      localStorage.removeItem("viewedUserId");
    };
  }, []);

  const fetchPatientData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(""); // Clear error before fetch
      const response = await axios.get(
        `http://localhost:5267/patient-profile?userId=${userId}`
      );

      if (!response.data) {
        throw new Error("No data received");
      }

      setPatientData({
        name:
          response.data.name ||
          `${response.data.firstName} ${response.data.lastName}`,
        nationalID: response.data.ssn || "",
        gender: response.data.gender || "",
        bloodGroup: response.data.bloodGroup || "",
        dateOfBirth: response.data.birthdate || "",
        insurance: response.data.insurance || "",
        phoneNumber: response.data.phoneNumber || "",
        emailAddress: response.data.email || "",
        address: response.data.address || "",
        chronicDiseases: response.data.chronicDiseases || "",
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
    fetchPatientData();
  }, [fetchPatientData]);

  function HandleEdit() {
    if (isEditing) {
      saveProfileChanges();
    } else {
      setIsEditing(true);
    }
  }
  const saveProfileChanges = async () => {
    try {
      let base64Image = patientData.profileImage;

      if (patientData.profileImage instanceof File) {
        // Validate file type
        if (!['image/jpeg', 'image/png'].includes(patientData.profileImage.type)) {
          setError("Only JPEG/PNG images allowed");
          return;
        }

        // Validate file size
        if (patientData.profileImage.size > 2 * 1024 * 1024) {
          setError("Image must be smaller than 2MB");
          return;
        }

        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(patientData.profileImage as File);
        });
      }

      const response = await axios.put(
          "http://localhost:5267/patient-profile",
          {
            Id: userId,
            Name: patientData.name,
            Gender: patientData.gender,
            BloodGroup: patientData.bloodGroup,
            Insurance: patientData.insurance,
            PhoneNumber: patientData.phoneNumber,
            EmailAddress: patientData.emailAddress,
            Address: patientData.address,
            ChronicDiseases: patientData.chronicDiseases,
            ProfileImage: base64Image
          }
      );

      if (response.data.message) {
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      }

      setIsEditing(false);
    } catch (error) {
      console.error("Update error:", error);
      setError("Update failed - check network connection");
    }
  };

  return (
    <div className="profile-container">
      <NavBar page="patient" />

      <main className="profile-main">
        {loading ? (
          <div className="loading">Loading profile data...</div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            <section className="profile-info">
              <div className="profile-image">
                {patientData.profileImage ? (
                    <img
                        src={
                          patientData.profileImage instanceof File
                              ? URL.createObjectURL(patientData.profileImage)
                              : patientData.profileImage
                        }
                        alt="Profile"
                        className="image-placeholder"
                    />
                ) : (
                  <div className="image-placeholder"></div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  id="profilePicInput"
                  style={{ display: "none" }}
                    // In the file input onChange handler
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Validate file type and size
                      if (!file.type.startsWith('image/')) {
                        setError("Only image files are allowed");
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setError("Image must be smaller than 2MB");
                        return;
                      }

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPatientData(prev => ({
                          ...prev,
                          profileImage: file // Store File for preview
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}

                />

                {isEditing && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("profilePicInput").click();
                    }}
                  >
                    Change Photo
                  </a>
                )}
              </div>

              <div className="profile-details">
                <div className="row">
                  <label>Name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={patientData.name}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <input disabled value={patientData.name} />
                  )}

                  <label>National ID:</label>
                  <input disabled value={patientData.nationalID} />
                </div>

                <div className="row">
                  <label>Gender:</label>
                  {isEditing ? (
                    <select
                      value={patientData.gender}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          gender: e.target.value,
                        })
                      }
                      style={{
                        width: "237px",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        marginRight: "50px",
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  ) : (
                    <input disabled value={patientData.gender} />
                  )}

                  <label>Blood Group:</label>
                  {isEditing ? (
                    <select
                      value={patientData.bloodGroup}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          bloodGroup: e.target.value,
                        })
                      }
                      style={{
                        width: "237px",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        marginRight: "50px",
                      }}
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  ) : (
                    <input disabled value={patientData.bloodGroup} />
                  )}
                </div>

                <div className="row">
                  <label>Date of Birth:</label>
                  <input disabled value={patientData.dateOfBirth} />

                  <label>Insurance:</label>
                  {isEditing ? (
                    <select
                      value={patientData.insurance}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          insurance: e.target.value,
                        })
                      }
                      style={{
                        width: "237px",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        marginRight: "50px",
                      }}
                    >
                      <option value="">Select Insurance type</option>
                      <option value="Private">Private</option>
                      <option value="Medicare">Medicare</option>
                      <option value="Medicaid">Medicaid</option>
                      <option value="None">None</option>
                    </select>
                  ) : (
                    <input disabled value={patientData.insurance} />
                  )}
                </div>

                <div className="row">
                  <label>Chronic Diseases:</label>
                  {isEditing ? (
                    <textarea
                      value={patientData.chronicDiseases}
                      onChange={(e) =>
                        setPatientData({
                          ...patientData,
                          chronicDiseases: e.target.value,
                        })
                      }
                      placeholder="Enter any chronic diseases..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "white",
                        resize: "vertical"
                      }}
                    />
                  ) : (
                    <textarea
                      disabled
                      value={patientData.chronicDiseases || "No chronic diseases recorded"}
                      style={{
                        width: "100%",
                        padding: "8px",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        backgroundColor: "#f8f9fa",
                        resize: "vertical"
                      }}
                    />
                  )}
                </div>
              </div>
            </section>

            <hr />

            <section className="contact-details">
              <h3>Contact Details:</h3>
              <div className="row">
                <label>Phone Number:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientData.phoneNumber}
                    onChange={(e) =>
                      setPatientData({
                        ...patientData,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                ) : (
                  <input disabled value={patientData.phoneNumber} />
                )}
              </div>

              <div className="row">
                <label>Email address:</label>
                <input disabled value={patientData.emailAddress} />
              </div>

              <div className="row">
                <label>Address:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientData.address}
                    onChange={(e) =>
                      setPatientData({
                        ...patientData,
                        address: e.target.value,
                      })
                    }
                  />
                ) : (
                  <input disabled value={patientData.address} />
                )}
              </div>
              {!isViewedByAdmin && (
                <button className="edit-button" onClick={HandleEdit}>
                  {isEditing ? "Save Changes" : "Edit profile"}
                </button>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default PatientProfile;
