import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import type { AuthUser } from '../pages/SignUp';

interface MainLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      <TopBar 
        doctorName={user.doctorName} 
        clinicName={user.clinicName}
        doctorTreatment={user.doctorTreatment}
        onLogout={onLogout} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="relative">
          <Sidebar />
        </div>
        
        <div className="flex-1 p-2 relative">
          <main className="h-full overflow-auto bg-white rounded-lg border border-slate-200/60 shadow-sm">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
