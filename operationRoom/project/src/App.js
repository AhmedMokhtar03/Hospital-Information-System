import DoctorRegistrationPage from "./pages/DoctorRegistrationPage";
import PatientRegistrationPage from "./pages/PatientRegistrationPage";
import PatientProfilePage from "./pages/PatientProfilePage";
import DoctorProfilePage from "./pages/DoctorProfilePage";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import LogInPage from "./pages/LogInPage";
import HomePage from "./pages/HomePage";
import PrivateRoute from "./components/PrivateRoute";
import AdminProfilePage from "./pages/AdminProfilePage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/login" element={<LogInPage />} />
        <Route path="/doctor-register" element={<DoctorRegistrationPage />} />
        <Route path="/patient-register" element={<PatientRegistrationPage />} />

        <Route element={<PrivateRoute />}>
        <Route path="/patient-profile" element={<PatientProfilePage />} />
        <Route path="/doctor-profile" element={<DoctorProfilePage />} />
        <Route path="/admin-profile" element={<AdminProfilePage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
