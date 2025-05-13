import { Outlet, Navigate } from 'react-router-dom';

const PrivateRoute = () => {
    const userId = localStorage.getItem('userId');
    const userType = localStorage.getItem('userType');

  
    if (!userId || !userType) {
        return <Navigate to="/login" />;
    }

    const currentPath = window.location.pathname;
    const isDoctorPath = currentPath.startsWith('/doctor-profile');
    const isPatientPath = currentPath.startsWith('/patient-profile');

    if (userType === 'doctor' && !isDoctorPath) {
        return <Navigate to="/doctor-profile" />;
    } else if (userType === 'patient' && !isPatientPath) {
        return <Navigate to="/patient-profile" />;
    }

    return <Outlet />;
};

export default PrivateRoute;
