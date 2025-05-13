import React, { useState, useEffect, useCallback } from "react";
import "./DoctorProfile.css";
import NavBar from "./NavBar.jsx";
import axios from "axios";

function DoctorProfile() {
  const [doctorData, setDoctorData] = useState({
    name: "",
    nationalID: "",
    gender: "",
    department: "",
    dateOfBirth: "",
    phoneNumber: "",
    emailAddress: "",
    address: "",
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

  const fetchDoctorData = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(""); // Clear error before fetch
      const response = await axios.get(
        `http://localhost:5267/doctor-profile?userId=${userId}`
      );

      if (!response.data) {
        throw new Error("No data received");
      }

      setDoctorData({
        name:
          response.data.name ||
          `${response.data.firstName} ${response.data.lastName}`,
        nationalID: response.data.ssn || "",
        gender: response.data.gender || "",
        department: response.data.department || "",
        dateOfBirth: response.data.birthdate || "",
        phoneNumber: response.data.phoneNumber || "",
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
    fetchDoctorData();
  }, [fetchDoctorData]);

  function HandleEdit() {
    if (isEditing) {
      saveProfileChanges();
    } else {
      setIsEditing(true);
    }
  }
  const saveProfileChanges = async () => {
    try {
      let base64Image = doctorData.profileImage;

      if (doctorData.profileImage instanceof File) {
        // Validate file type
        if (
          !["image/jpeg", "image/png"].includes(doctorData.profileImage.type)
        ) {
          setError("Only JPEG/PNG images allowed");
          return;
        }

        if (doctorData.profileImage.size > 2 * 1024 * 1024) {
          setError("Image must be smaller than 2MB");
          return;
        }

        base64Image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(doctorData.profileImage as File);
        });
      }

      const response = await axios.put(
        "http://localhost:5267/doctor-profile",
        {
          Id: userId,
          Name: doctorData.name,
          Gender: doctorData.gender,
          department: doctorData.department,
          PhoneNumber: doctorData.phoneNumber,
          EmailAddress: doctorData.emailAddress,
          Address: doctorData.address,
          ProfileImage: base64Image, // Send Base64 string
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
      <NavBar page="doctor" />

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
                {doctorData.profileImage ? (
                  <img
                    src={
                      doctorData.profileImage instanceof File
                        ? URL.createObjectURL(doctorData.profileImage)
                        : doctorData.profileImage
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
                      if (!file.type.startsWith("image/")) {
                        setError("Only image files are allowed");
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setError("Image must be smaller than 2MB");
                        return;
                      }

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setDoctorData((prev) => ({
                          ...prev,
                          profileImage: file, // Store File for preview
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
                      value={doctorData.name}
                      onChange={(e) =>
                        setDoctorData({
                          ...doctorData,
                          name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <input disabled value={doctorData.name} />
                  )}

                  <label>National ID:</label>
                  <input disabled value={doctorData.nationalID} />
                </div>

                <div className="row">
                  <label>Gender:</label>
                  {isEditing ? (
                    <select
                      value={doctorData.gender}
                      onChange={(e) =>
                        setDoctorData({
                          ...doctorData,
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
                    <input disabled value={doctorData.gender} />
                  )}

                  <label>Department:</label>
                  {isEditing ? (
                    <select
                      value={doctorData.department}
                      onChange={(e) =>
                        setDoctorData({
                          ...doctorData,
                          department: e.target.value,
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
                      <option value="">Select Department</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Endocrinology">Endocrinology</option>
                      <option value="Gastroenterology">Gastroenterology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Obstetrics">Obstetrics</option>
                      <option value="Oncology">Oncology</option>
                      <option value="Ophthalmology">Ophthalmology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Psychiatry">Psychiatry</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Urology">Urology</option>
                    </select>
                  ) : (
                    <input disabled value={doctorData.department} />
                  )}
                </div>

                <div className="row">
                  <label>Date of Birth:</label>
                  <input disabled value={doctorData.dateOfBirth} />
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
                    value={doctorData.phoneNumber}
                    onChange={(e) =>
                      setDoctorData({
                        ...doctorData,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                ) : (
                  <input disabled value={doctorData.phoneNumber} />
                )}
              </div>

              <div className="row">
                <label>Email address:</label>
                <input disabled value={doctorData.emailAddress} />
              </div>

              <div className="row">
                <label>Address:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={doctorData.address}
                    onChange={(e) =>
                      setDoctorData({
                        ...doctorData,
                        address: e.target.value,
                      })
                    }
                  />
                ) : (
                  <input disabled value={doctorData.address} />
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

export default DoctorProfile;
