import { Suspense, lazy, useEffect, useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EnrollmentProvider } from './context/EnrollmentContext';
import {
  loadMfaSession,
  MfaSession,
  saveMfaSession
} from './lib/adminMfa';
import { AdminMfaGatePage } from './pages/AdminMfaGatePage';
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

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EEF5FF]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#BAE6FD] border-t-transparent" />
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isPasswordRecovery, logout } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [isLoginView, setIsLoginView] = useState(true);
  const [mfaSession, setMfaSession] = useState<MfaSession | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';
  const requiresMfa = user?.role === 'guardian' || user?.role === 'staff';
  const inactivityTimeoutDuration = user?.role === 'staff' ?
    STAFF_IDLE_TIMEOUT_MS :
    user?.role === 'admin' ?
      ADMIN_IDLE_TIMEOUT_MS :
      GUARDIAN_IDLE_TIMEOUT_MS;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!isLocalHost && window.location.protocol === 'http:') {
      window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }, []);

  useEffect(() => {
    if (!user || !requiresMfa) {
      setMfaSession(null);
      return;
    }

    setMfaSession(loadMfaSession(user.id));
  }, [requiresMfa, user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      setActivePage('adminDashboard');
    } else if (isManagementRole) {
      setActivePage('staffDashboard');
    } else {
      setActivePage('home');
    }
  }, [isManagementRole, user?.role]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activePage]);

  useEffect(() => {
    if (typeof window === 'undefined' || !user) {
      return;
    }

    let hasLoggedOut = false;

    const handleTimeout = () => {
      if (hasLoggedOut) {
        return;
      }

      hasLoggedOut = true;
      setMfaSession(null);
      window.alert('Your session expired due to inactivity. Please sign in again.');
      void logout();
    };

    let timeoutHandle = window.setTimeout(handleTimeout, inactivityTimeoutDuration);

    const resetTimeout = () => {
      if (hasLoggedOut || document.visibilityState === 'hidden') {
        return;
      }

      window.clearTimeout(timeoutHandle);
      timeoutHandle = window.setTimeout(handleTimeout, inactivityTimeoutDuration);
    };

    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimeout, { passive: true });
    });
    document.addEventListener('visibilitychange', resetTimeout);

    return () => {
      hasLoggedOut = true;
      window.clearTimeout(timeoutHandle);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimeout);
      });
      document.removeEventListener('visibilitychange', resetTimeout);
    };
  }, [inactivityTimeoutDuration, logout, mfaSession, user]);

  if (isLoading && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFBEB]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#BAE6FD] border-t-transparent" />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  if (!user) {
    return isLoginView ?
      <LoginPage onSwitchToSignup={() => setIsLoginView(false)} /> :
      <SignupPage onSwitchToLogin={() => setIsLoginView(true)} />;
  }

  if (requiresMfa && !mfaSession) {
    return (
      <AdminMfaGatePage
        onVerify={(session) => {
          saveMfaSession(user.id, session);
          setMfaSession(session);
          setActivePage(user.role === 'staff' ? 'staffDashboard' : 'home');
        }}
      />
    );
  }


  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage onNavigate={setActivePage} />;
      case 'enrollment':
        return <EnrollmentForm onSuccess={() => setActivePage('requirements')} />;
      case 'requirements':
        return <Requirements onContinueToYourChild={() => setActivePage('yourChild')} />;
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
        return user.role === 'admin' ?
          <AdminDashboard /> :
          isManagementRole ?
            <StaffDashboard /> :
            <HomePage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-800 shadow-lg ring-1 ring-black/5 transition hover:bg-gray-50 md:hidden"
        aria-label="Open navigation menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="min-h-screen pt-16 transition-all duration-300 md:ml-[260px] md:pt-0">
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <EnrollmentProvider>
        <AppContent />
      </EnrollmentProvider>
    </AuthProvider>
  );
}