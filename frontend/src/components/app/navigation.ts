import type { LucideIcon } from 'lucide-react';
import {
  BabyIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  HouseIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  ScrollTextIcon,
} from 'lucide-react';
import type { UserRole } from '../../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

const guardianNav: NavItem[] = [
  { id: 'home', label: 'Home', icon: HouseIcon },
  { id: 'enrollment', label: 'Enrollment', icon: ClipboardListIcon },
  { id: 'requirements', label: 'Requirements', icon: FolderOpenIcon },
  { id: 'yourChild', label: 'My Children', icon: BabyIcon },
  { id: 'contact', label: 'Messages', icon: MessageCircleIcon },
];

const staffNav: NavItem[] = [
  { id: 'staffDashboard', label: 'Applications', icon: InboxIcon },
  { id: 'homepageManager', label: 'Homepage', icon: HouseIcon },
  { id: 'contactManager', label: 'Messages', icon: MessageCircleIcon },
  { id: 'activityLogs', label: 'Activity Log', icon: ScrollTextIcon },
];

const adminNav: NavItem[] = [
  { id: 'adminDashboard', label: 'Admin', icon: LayoutDashboardIcon },
  { id: 'staffDashboard', label: 'Applications', icon: InboxIcon },
  { id: 'homepageManager', label: 'Homepage', icon: HouseIcon },
  { id: 'contactManager', label: 'Messages', icon: MessageCircleIcon },
  { id: 'activityLogs', label: 'Activity Log', icon: ScrollTextIcon },
];

export function getNavForRole(role: UserRole | undefined): { items: NavItem[]; portalLabel: string } {
  if (role === 'admin') return { items: adminNav, portalLabel: 'Admin Portal' };
  if (role === 'staff') return { items: staffNav, portalLabel: 'Management Portal' };
  return { items: guardianNav, portalLabel: 'Guardian Portal' };
}
