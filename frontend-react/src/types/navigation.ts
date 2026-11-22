import { LucideIcon } from 'lucide-react';
import { UserRole } from './auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeColor?: 'default' | 'primary' | 'warning' | 'danger';
  children?: {
    label: string;
    href: string;
  }[];
}

export interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}
