import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Building,
  Building2,
  CalendarRange,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  Target,
  UserCircle,
  Users,
  Workflow,
  BookOpen,
} from 'lucide-react'
import type { UserRole } from '@/modules/core/types/enums'
import { hasPermission } from '@/modules/core/services/permissions'

export interface NavItemConfig {
  id: string
  href: string
  label: string
  icon: LucideIcon
  roles?: UserRole[]
  permissions?: string[]
}

export interface NavGroupConfig {
  id: string
  label: string
  items: NavItemConfig[]
}

/** Single source of truth for dashboard navigation (existing routes only). */
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      {
        id: 'dashboard',
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'talent_manager', 'freelancer', 'client'],
      },
      {
        id: 'profile',
        href: '/profile',
        label: 'My profile',
        icon: UserCircle,
        roles: ['freelancer'],
      },
      {
        id: 'notifications',
        href: '/notifications',
        label: 'Notifications',
        icon: Bell,
        roles: ['admin', 'talent_manager', 'freelancer', 'client'],
      },
    ],
  },
  {
    id: 'demand',
    label: 'Demand',
    items: [
      {
        id: 'opportunities',
        href: '/opportunities',
        label: 'Opportunities',
        icon: Megaphone,
        roles: ['admin', 'talent_manager', 'freelancer', 'client'],
        permissions: ['opportunities:read'],
      },
      {
        id: 'crm-pipeline',
        href: '/crm/pipeline',
        label: 'Pipeline',
        icon: GitBranch,
        roles: ['admin', 'talent_manager'],
        permissions: ['crm:read'],
      },
      {
        id: 'crm-leads',
        href: '/crm/leads',
        label: 'Leads',
        icon: Target,
        roles: ['admin', 'talent_manager'],
        permissions: ['crm:read'],
      },
      {
        id: 'crm-companies',
        href: '/crm/companies',
        label: 'Companies',
        icon: Building,
        roles: ['admin', 'talent_manager'],
        permissions: ['crm:read'],
      },
      {
        id: 'crm-contracts',
        href: '/crm/contracts',
        label: 'Contracts',
        icon: FileText,
        roles: ['admin', 'talent_manager'],
        permissions: ['crm:read'],
      },
    ],
  },
  {
    id: 'supply',
    label: 'Supply',
    items: [
      {
        id: 'talent',
        href: '/talent',
        label: 'Talent roster',
        icon: Users,
        roles: ['admin', 'talent_manager'],
        permissions: ['talent:read', 'freelancers:read'],
      },
      {
        id: 'assignments',
        href: '/assignments',
        label: 'Assignments',
        icon: CalendarRange,
        roles: ['admin', 'talent_manager'],
        permissions: ['assignment:read'],
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery',
    items: [
      {
        id: 'projects',
        href: '/projects',
        label: 'Projects',
        icon: Briefcase,
        roles: ['admin', 'talent_manager', 'freelancer', 'client'],
        permissions: ['projects:read'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'workflows',
        href: '/workflows',
        label: 'Workflows',
        icon: Workflow,
        roles: ['admin', 'talent_manager'],
        permissions: ['workflow:read'],
      },
      {
        id: 'whatsapp',
        href: '/whatsapp',
        label: 'WhatsApp',
        icon: MessageCircle,
        roles: ['admin', 'talent_manager'],
        permissions: ['whatsapp:read'],
      },
      {
        id: 'ai-agents',
        href: '/ai/agents',
        label: 'AI Agents',
        icon: Bot,
        roles: ['admin', 'talent_manager'],
        permissions: ['agent:run'],
      },
      {
        id: 'knowledge',
        href: '/knowledge',
        label: 'Knowledge',
        icon: BookOpen,
        roles: ['admin', 'talent_manager'],
        permissions: ['ai:summary'],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      {
        id: 'payments',
        href: '/payments',
        label: 'Payments',
        icon: CreditCard,
        roles: ['admin', 'talent_manager', 'freelancer'],
        permissions: ['payments:read'],
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'analytics',
        href: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        roles: ['admin', 'talent_manager'],
        permissions: ['analytics:read'],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    items: [
      {
        id: 'organization',
        href: '/organization',
        label: 'Organization',
        icon: Building2,
        roles: ['admin'],
      },
      {
        id: 'settings',
        href: '/settings',
        label: 'Settings',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
]

function itemVisible(item: NavItemConfig, role: UserRole): boolean {
  if (item.roles && !item.roles.includes(role)) return false
  if (item.permissions?.length) {
    return item.permissions.some((permission) => hasPermission(role, permission))
  }
  return true
}

export function getNavGroupsForRole(role: UserRole): NavGroupConfig[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => itemVisible(item, role)),
  })).filter((group) => group.items.length > 0)
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getActiveNavGroupIds(pathname: string, role: UserRole): string[] {
  const groups = getNavGroupsForRole(role)
  return groups
    .filter((group) => group.items.some((item) => isNavItemActive(pathname, item.href)))
    .map((group) => group.id)
}
