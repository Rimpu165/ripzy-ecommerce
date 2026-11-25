export type Role = "CUSTOMER" | "STAFF" | "MANAGER" | "SUPER_ADMIN";

export const ADMIN_ROLES: Role[] = ["STAFF", "MANAGER", "SUPER_ADMIN"];

/**
 * Fine-grained permissions. Every admin API route and admin page must check one
 * of these (never a raw role string) so access rules live in exactly one place.
 */
export type Permission =
  | "dashboard.view"
  | "orders.view"
  | "orders.update"
  | "orders.refund"
  | "returns.manage"
  | "inventory.view"
  | "inventory.adjust"
  | "products.manage"
  | "catalog.manage" // categories, brands, attributes
  | "reviews.moderate"
  | "coupons.manage"
  | "banners.manage"
  | "pages.manage"
  | "customers.view"
  | "customers.manage"
  | "staff.manage"
  | "reports.view"
  | "settings.manage"
  | "audit.view"
  | "notifications.view";

const STAFF_PERMS: Permission[] = [
  "dashboard.view",
  "orders.view",
  "orders.update",
  "inventory.view",
  "returns.manage",
  "notifications.view",
];

const MANAGER_PERMS: Permission[] = [
  ...STAFF_PERMS,
  "orders.refund",
  "inventory.adjust",
  "products.manage",
  "catalog.manage",
  "reviews.moderate",
  "coupons.manage",
  "banners.manage",
  "pages.manage",
  "customers.view",
  "reports.view",
];

const SUPER_ADMIN_PERMS: Permission[] = [
  ...MANAGER_PERMS,
  "customers.manage",
  "staff.manage",
  "settings.manage",
  "audit.view",
];

const MATRIX: Record<Role, Permission[]> = {
  CUSTOMER: [],
  STAFF: STAFF_PERMS,
  MANAGER: MANAGER_PERMS,
  SUPER_ADMIN: SUPER_ADMIN_PERMS,
};

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (MATRIX[role as Role] ?? []).includes(permission);
}

export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role as Role);
}

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in AdminShell
  permission: Permission;
}

/** Single source of truth for the admin sidebar. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", permission: "dashboard.view" },
  { href: "/admin/orders", label: "Orders", icon: "ShoppingBag", permission: "orders.view" },
  { href: "/admin/returns", label: "Returns & Refunds", icon: "Undo2", permission: "returns.manage" },
  { href: "/admin/products", label: "Products & Stock", icon: "Package", permission: "inventory.view" },
  { href: "/admin/categories", label: "Categories & Brands", icon: "Layers", permission: "catalog.manage" },
  { href: "/admin/coupons", label: "Coupons", icon: "Ticket", permission: "coupons.manage" },
  { href: "/admin/banners", label: "Banners", icon: "Image", permission: "banners.manage" },
  { href: "/admin/pages", label: "CMS Pages", icon: "FileText", permission: "pages.manage" },
  { href: "/admin/reviews", label: "Reviews", icon: "Star", permission: "reviews.moderate" },
  { href: "/admin/customers", label: "Customers", icon: "Users", permission: "customers.view" },
  { href: "/admin/staff", label: "Staff & Roles", icon: "ShieldCheck", permission: "staff.manage" },
  { href: "/admin/reports", label: "Reports", icon: "BarChart3", permission: "reports.view" },
  { href: "/admin/notifications", label: "Notifications", icon: "Bell", permission: "notifications.view" },
  { href: "/admin/audit", label: "Audit Log", icon: "ScrollText", permission: "audit.view" },
  { href: "/admin/settings", label: "Settings", icon: "Settings", permission: "settings.manage" },
];
