import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { Loader2 } from 'lucide-react';
import SignUp, { AuthUser } from './pages/SignUp';
import Login from './pages/Login';
import { PatientProvider } from './context/PatientContext';
import { AuthProvider } from './context/AuthContext';
import ClinicSignup from './pages/ClinicSignup';
import DoctorSign from './pages/DoctorSign';
import UserSign from './pages/UserSign';
import { DoctorProfile } from './types/auth';

// Lazy load pages for better performance
const MedChat = React.lazy(() => import('./pages/MedChat'));
const Conhecimento = React.lazy(() => import('./pages/Conhecimento'));
// const Transcricao = React.lazy(() => import('./pages/Transcricao')); // Temporarily disabled

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const storedDoctor = localStorage.getItem('oasis_doctor_profile');
      if (storedDoctor) {
        setDoctor(JSON.parse(storedDoctor) as DoctorProfile);
      }
      const storedUser = localStorage.getItem('oasis_auth_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser) as AuthUser);
      }
    } catch {
      // ignore
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('oasis_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('oasis_auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (doctor) {
      localStorage.setItem('oasis_doctor_profile', JSON.stringify(doctor));
    } else {
      localStorage.removeItem('oasis_doctor_profile');
    }
  }, [doctor]);

  const handleDoctorSign = (profile: DoctorProfile) => {
    setDoctor(profile);
    setUser(null);
  };

  const handleDoctorReset = () => {
    setDoctor(null);
    setUser(null);
    localStorage.removeItem('oasis_doctor_profile');
  };

  const handleLogin = (authUser: AuthUser) => {
    setUser(authUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (isAuthLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <AuthProvider>
        {!user ? (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route
              path="/signup"
              element={<SignUp doctor={doctor} onResetDoctor={handleDoctorReset} onLogin={handleLogin} />}
            />
            <Route path="/signup/doctor" element={<DoctorSign onComplete={handleDoctorSign} />} />
            <Route path="/signup/user" element={<UserSign />} />
            <Route path="/clinics/create" element={<ClinicSignup />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <PatientProvider>
            <MainLayout user={user} onLogout={handleLogout}>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/main" element={<MedChat />} />
                  <Route path="/conhecimento" element={<Conhecimento />} />
                  <Route path="/transcricao" element={<Navigate to="/main" replace />} />
                  <Route path="/clinics/create" element={<ClinicSignup />} />
                  <Route path="/" element={<Navigate to="/main" replace />} />
                  <Route path="*" element={<Navigate to="/main" replace />} />
                </Routes>
              </Suspense>
            </MainLayout>
          </PatientProvider>
        )}
      </AuthProvider>
    </Router>
  );
}

export default App;
