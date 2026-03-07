import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnrollmentProvider } from './context/EnrollmentContext';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EnrollmentForm } from './pages/EnrollmentForm';
import { Requirements } from './pages/Requirements';
import { ApplicationStatus } from './pages/ApplicationStatus';
import { StaffDashboard } from './pages/StaffDashboard';
import { Contact } from './pages/Contact';
import { HomePage } from './pages/HomePage';
function AppContent() {
  const { user, isLoading } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [isLoginView, setIsLoginView] = useState(true);
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';
  // Reset active page when role changes
  useEffect(() => {
    if (isManagementRole) {
      setActivePage('staffDashboard');
    } else {
      setActivePage('home');
    }
  }, [isManagementRole]);
  if (isLoading && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBEB]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#BAE6FD] border-t-transparent"></div>
      </div>);

  }
  if (!user) {
    return isLoginView ?
    <LoginPage onSwitchToSignup={() => setIsLoginView(false)} /> :

    <SignupPage onSwitchToLogin={() => setIsLoginView(true)} />;

  }
  const renderPage = () => {
    switch (activePage) {
      // Student Pages
      case 'home':
        return <HomePage onNavigate={setActivePage} />;
      case 'enrollment':
        return <EnrollmentForm onSuccess={() => setActivePage('status')} />;
      case 'requirements':
        return <Requirements />;
      case 'status':
        return (
          <ApplicationStatus
            onStartEnrollment={() => setActivePage('enrollment')}
            onGoToRequirements={() => setActivePage('requirements')} />);


      // Admin Pages
      case 'staffDashboard':
        return <StaffDashboard />;
      // Shared Pages
      case 'contact':
        return <Contact />;
      default:
        return isManagementRole ?
<<<<<<< HEAD
        <StaffDashboard /> :

        <HomePage onNavigate={setActivePage} />;

    }
  };
  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="ml-[260px] min-h-screen transition-all duration-300">
        {renderPage()}
      </main>
    </div>);

}
export function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <AppContent />
      </EnrollmentProvider>
    </AuthProvider>);

}