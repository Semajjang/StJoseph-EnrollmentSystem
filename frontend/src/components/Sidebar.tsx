import { useState } from 'react';
// ...existing code...
import { useAuth } from '../context/AuthContext';
import {
  HouseIcon,
  LogOutIcon,
  MessageSquareIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  PhoneIcon,
  Building2Icon,
  BabyIcon,
  ScrollTextIcon,
  XIcon,
  UserCircleIcon } from
'lucide-react';
import schoolLogo from '../../school-logo.png';
interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}
export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';
  const isAdminRole = user?.role === 'admin';
  const [isLogoVisible, setIsLogoVisible] = useState(true);

  const handleLogout = () => {
    onClose();
    void logout();
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onClose();
  };

  const studentNavItems = [
  {
    id: 'home',
    label: 'Home',
    icon: HouseIcon
  },
  {
    id: 'enrollment',
    label: 'Enrollment',
    icon: ClipboardListIcon
  },
  {
    id: 'requirements',
    label: 'Requirements',
    icon: FolderOpenIcon
  },
  {
    id: 'yourChild',
    label: 'Your Children',
    icon: BabyIcon
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: PhoneIcon
  }];

  const staffNavItems = [
  {
    id: 'staffDashboard',
    label: 'Staff Dashboard',
    icon: Building2Icon
  },
  {
    id: 'homepageManager',
    label: 'Homepage Manager',
    icon: HouseIcon
  },
  {
    id: 'contactManager',
    label: 'Contact Manager',
    icon: MessageSquareIcon
  },
  {
    id: 'activityLogs',
    label: 'Activity Logs',
    icon: ScrollTextIcon
  }];

  const adminNavItems = [
  {
    id: 'adminDashboard',
    label: 'Admin Dashboard',
    icon: Building2Icon
  },
  {
    id: 'staffDashboard',
    label: 'Requirements Manager',
    icon: FolderOpenIcon
  },
  {
    id: 'homepageManager',
    label: 'Homepage Manager',
    icon: HouseIcon
  },
  {
    id: 'contactManager',
    label: 'Contact Manager',
    icon: MessageSquareIcon
  },
  {
    id: 'activityLogs',
    label: 'Activity Logs',
    icon: ScrollTextIcon
  }];

  const managementNavItems = isAdminRole ? adminNavItems : staffNavItems;
  const navItems = isManagementRole ? managementNavItems : studentNavItems;
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden bg-[#0F172A] shadow-2xl transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo Area */}
      <div className="border-b border-white/5 p-5">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close navigation menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white shadow-sm">
            {isLogoVisible ?
              <img
                src={schoolLogo}
                alt="School Logo"
                className="h-full w-full object-contain"
                onError={() => setIsLogoVisible(false)}
              /> :
              <span className="text-[9px] font-bold text-slate-400">LOGO</span>}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold leading-tight text-white truncate">
              St. Joseph
            </h1>
            <p className="text-xs text-slate-400">Daycare Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {isAdminRole ? 'Admin Portal' : isManagementRole ? 'Management Portal' : 'Guardian Portal'}
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/40'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">{item.label}</span>
                </button>
              </li>);
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className={`mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
            activePage === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <UserCircleIcon className="h-4 w-4" />
          </div>
          <div className="overflow-hidden">
            <p className={`text-xs font-semibold truncate ${activePage === 'profile' ? 'text-white' : 'text-slate-300'}`}>
              {user?.name}
            </p>
            <p className="text-[10px] capitalize text-slate-500">{user?.role}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400">
          <LogOutIcon className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
    </>);
}