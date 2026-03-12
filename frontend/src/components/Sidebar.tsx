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
        className={`fixed inset-0 z-40 bg-slate-950/35 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden bg-white shadow-lg transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Logo Area */}
      <div className="border-b border-blue-300/30 bg-gradient-to-br from-[#1D4ED8] via-[#3B82F6] to-[#93C5FD] p-6 text-white">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close navigation menu"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/30 bg-white/95 shadow-sm">
            {isLogoVisible ?
              <img
                src={schoolLogo}
                alt="School Logo"
                className="h-full w-full object-contain"
                onError={() => setIsLogoVisible(false)}
              /> :
              <span className="text-[10px] font-bold text-slate-400">LOGO</span>}
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-white">
              St. Joseph
            </h1>
            <p className="text-xs font-medium text-blue-50">Daycare Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="mb-4 px-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {isAdminRole ? 'Admin Portal' : isManagementRole ? 'Management Portal' : 'Guardian Portal'}
          </span>
        </div>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${isActive ? 'bg-[#BAE6FD] text-gray-800 shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>

                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>);

          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => handleNavigate('profile')}
          className={`mb-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${activePage === 'profile' ? 'bg-[#BAE6FD] text-gray-800 shadow-sm' : 'hover:bg-white text-gray-700'}`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm ${isManagementRole ? 'bg-[#DBEAFE]' : 'bg-[#BBF7D0]'}`}>

            <UserCircleIcon className="w-5 h-5 text-gray-700" />
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-gray-800 text-sm truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors">

          <LogOutIcon className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
    </>);

}