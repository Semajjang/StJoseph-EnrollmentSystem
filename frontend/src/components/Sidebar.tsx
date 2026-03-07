import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  HouseIcon,
  LogOutIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  BarChart3Icon,
  PhoneIcon,
  Building2Icon,
  UserCircleIcon } from
'lucide-react';
interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const isManagementRole = user?.role === 'admin' || user?.role === 'staff';

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

  const adminNavItems = [
  {
    id: 'staffDashboard',
    label: 'Classroom Overview',
    icon: Building2Icon
  },
  {
    id: 'contact',
    label: 'Contact',
    icon: PhoneIcon
  }];

  const navItems = isManagementRole ? adminNavItems : studentNavItems;
  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white shadow-lg flex flex-col z-50">
      {/* Logo Area */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400">LOGO</span>
            <img
              src="/school-logo.png"
              alt="School Logo"
              className="w-full h-full object-contain"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="font-extrabold text-gray-800 text-lg leading-tight">
              St. Joseph
            </h1>
            <p className="text-xs text-gray-500 font-medium">Daycare Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="mb-4 px-4">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${isManagementRole ? 'bg-[#FBCFE8]' : 'bg-[#BBF7D0]'}`}>

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