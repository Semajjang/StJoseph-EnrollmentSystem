import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  HouseIcon,
  LogOutIcon,
  MessageSquareIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  BarChart3Icon,
  PhoneIcon,
  Building2Icon,
  UserCircleIcon } from
'lucide-react';
import schoolLogo from '../../school-logo.png';
interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';
  const [isLogoVisible, setIsLogoVisible] = useState(true);

  const handleLogout = () => {
    void logout();
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
    id: 'status',
    label: 'Application Status',
    icon: BarChart3Icon
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: PhoneIcon
  }];

  const managementNavItems = [
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
    id: 'contact',
    label: 'Contact Preview',
    icon: PhoneIcon
  }];

  const navItems = isManagementRole ? managementNavItems : studentNavItems;
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col overflow-hidden bg-white shadow-lg">
      {/* Logo Area */}
      <div className="border-b border-blue-300/30 bg-gradient-to-br from-[#1D4ED8] via-[#3B82F6] to-[#93C5FD] p-6 text-white">
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
            {isManagementRole ? 'Management Portal' : 'Guardian Portal'}
          </span>
        </div>
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
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
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
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
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors">

          <LogOutIcon className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>);

}