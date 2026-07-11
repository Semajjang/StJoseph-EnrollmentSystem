import { Suspense, lazy, useEffect, useState } from 'react';
import { AppShell } from './components/app/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnrollmentProvider } from './context/EnrollmentContext';
import { ToastProvider } from './components/ui';
import { LoadingScreen } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignupPage } from './pages/SignupPage';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const EnrollmentForm = lazy(() => import('./pages/EnrollmentForm').then((module) => ({ default: module.EnrollmentForm })));
const Requirements = lazy(() => import('./pages/Requirements').then((module) => ({ default: module.Requirements })));
const ApplicationStatus = lazy(() => import('./pages/ApplicationStatus').then((module) => ({ default: module.ApplicationStatus })));
const ChildProfile = lazy(() => import('./pages/ChildProfile').then((module) => ({ default: module.ChildProfile })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const Contact = lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard').then((module) => ({ default: module.StaffDashboard })));
const HomepageManager = lazy(() => import('./pages/HomepageManager').then((module) => ({ default: module.HomepageManager })));
const ContactManager = lazy(() => import('./pages/ContactManager').then((module) => ({ default: module.ContactManager })));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage').then((module) => ({ default: module.ActivityLogsPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const STAFF_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const GUARDIAN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;

function AppContent() {
  const { user, isLoading, isPasswordRecovery, logout } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [isLoginView, setIsLoginView] = useState(true);
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';
  const inactivityTimeoutDuration =
    user?.role === 'staff' ? STAFF_IDLE_TIMEOUT_MS : user?.role === 'admin' ? ADMIN_IDLE_TIMEOUT_MS : GUARDIAN_IDLE_TIMEOUT_MS;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Allow HTTP for localhost, 127.0.0.1, and private LAN IPs.
    const hostname = window.location.hostname;
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
    if (!isLocalHost && window.location.protocol === 'http:') {
      window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') setActivePage('adminDashboard');
    else if (isManagementRole) setActivePage('staffDashboard');
    else setActivePage('home');
  }, [isManagementRole, user?.role]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    let hasLoggedOut = false;

    const handleTimeout = () => {
      if (hasLoggedOut) return;
      hasLoggedOut = true;
      window.alert('Your session expired due to inactivity. Please sign in again.');
      void logout();
    };

    let timeoutHandle = window.setTimeout(handleTimeout, inactivityTimeoutDuration);

    const resetTimeout = () => {
      if (hasLoggedOut || document.visibilityState === 'hidden') return;
      window.clearTimeout(timeoutHandle);
      timeoutHandle = window.setTimeout(handleTimeout, inactivityTimeoutDuration);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimeout, { passive: true }));
    document.addEventListener('visibilitychange', resetTimeout);

    return () => {
      hasLoggedOut = true;
      window.clearTimeout(timeoutHandle);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimeout));
      document.removeEventListener('visibilitychange', resetTimeout);
    };
  }, [inactivityTimeoutDuration, logout, user]);

  if (isLoading && user) {
    return <LoadingScreen label="Loading your portal" />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  if (!user) {
    return isLoginView ? (
      <LoginPage onSwitchToSignup={() => setIsLoginView(false)} />
    ) : (
      <SignupPage onSwitchToLogin={() => setIsLoginView(true)} />
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage onNavigate={setActivePage} />;
      case 'enrollment':
        return <EnrollmentForm onNavigate={setActivePage} />;
      case 'requirements':
        return <Requirements onContinueToYourChild={() => setActivePage('yourChild')} onStartEnrollment={() => setActivePage('enrollment')} />;
      case 'status':
        return <ApplicationStatus onStartEnrollment={() => setActivePage('enrollment')} />;
      case 'yourChild':
        return <ChildProfile onStartEnrollment={() => setActivePage('enrollment')} />;
      case 'profile':
        return <ProfilePage />;
      case 'adminDashboard':
        return user.role === 'admin' ? <AdminDashboard /> : <StaffDashboard />;
      case 'staffDashboard':
        return <StaffDashboard />;
      case 'homepageManager':
        return <HomepageManager onPreviewHomepage={() => setActivePage('home')} />;
      case 'contactManager':
        return <ContactManager onPreviewContact={() => setActivePage('contact')} />;
      case 'activityLogs':
        return <ActivityLogsPage />;
      case 'contact':
        return <Contact />;
      default:
        return user.role === 'admin' ? <AdminDashboard /> : isManagementRole ? <StaffDashboard /> : <HomePage onNavigate={setActivePage} />;
    }
  };

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      <Suspense fallback={<LoadingScreen />}>{renderPage()}</Suspense>
    </AppShell>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <EnrollmentProvider>
          <AppContent />
        </EnrollmentProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
