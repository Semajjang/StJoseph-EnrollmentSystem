import { useState, useEffect } from 'react';
// ...existing code...
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnrollmentProvider } from './context/EnrollmentContext';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EnrollmentForm } from './pages/EnrollmentForm';
import { Requirements } from './pages/Requirements';
import { ApplicationStatus } from './pages/ApplicationStatus';
import { StaffDashboard } from './pages/StaffDashboard';
import { HomepageManager } from './pages/HomepageManager';
import { Contact } from './pages/Contact';
import { ContactManager } from './pages/ContactManager';
import { HomePage } from './pages/HomePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChildProfile } from './pages/ChildProfile';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
function AppContent() {
  const { user, isLoading, isPasswordRecovery } = useAuth();
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
  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
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
          />);
      case 'yourChild':
        return <ChildProfile onStartEnrollment={() => setActivePage('enrollment')} />;


      // Staff Pages
      case 'staffDashboard':
        return <StaffDashboard />;
      case 'homepageManager':
        return <HomepageManager onPreviewHomepage={() => setActivePage('home')} />;
      case 'contactManager':
        return <ContactManager onPreviewContact={() => setActivePage('contact')} />;
      case 'activityLogs':
        return <ActivityLogsPage />;
      // Shared Pages
      case 'contact':
        return <Contact />;
      default:
        return isManagementRole ?
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