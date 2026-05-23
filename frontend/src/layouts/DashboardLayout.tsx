import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Package, Truck, MapPin,
  Users, Settings, Bell, MessageSquare, Star, BarChart2, Leaf,
  Menu, X, LogOut, ChevronRight, FileText, Map, UserCheck,
  History, Camera, ClipboardList, PlusCircle, Archive, Megaphone,
  Monitor, TrendingUp, Network, Inbox, Building2, Send, Handshake, PackageSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import RoleSwitcher from "@/components/shared/RoleSwitcher";
import type { UserRole } from "@/types";

type NavItem = { label: string; href: string; icon: React.ElementType; badge?: number };
type NavGroup = { group: string; items: NavItem[] };

const navConfig: Record<string, NavGroup[]> = {
  customer: [
    {
      group: "Main",
      items: [
        { label: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
        { label: "Browse Products", href: "/customer/browse", icon: ShoppingBag },
        { label: "My Cart", href: "/customer/cart", icon: ShoppingCart, badge: 3 },
      ],
    },
    {
      group: "Orders",
      items: [
        { label: "My Orders", href: "/customer/orders", icon: Package },
        { label: "Wishlist", href: "/customer/wishlist", icon: Star },
        { label: "My Reviews", href: "/customer/reviews", icon: MessageSquare },
      ],
    },
    {
      group: "Account",
      items: [
        { label: "Notifications", href: "/customer/notifications", icon: Bell, badge: 3 },
        { label: "Profile Settings", href: "/customer/profile", icon: Settings },
      ],
    },
  ],
  seller: [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/seller/dashboard", icon: LayoutDashboard },
        { label: "Sales Reports", href: "/seller/reports", icon: TrendingUp },
      ],
    },
    {
      group: "Products",
      items: [
        { label: "My Products", href: "/seller/products", icon: Archive },
        { label: "Add Product", href: "/seller/products/new", icon: PlusCircle },
        { label: "Inventory", href: "/seller/inventory", icon: ClipboardList },
      ],
    },
    {
      group: "Orders",
      items: [
        { label: "Orders", href: "/seller/orders", icon: Package, badge: 5 },
        { label: "Shipment Requests", href: "/seller/shipments", icon: Truck },
      ],
    },
    {
      group: "Contracts",
      items: [
        { label: "Incoming Requests", href: "/seller/contracts/incoming", icon: Inbox },
        { label: "Active Contracts",  href: "/seller/contracts/active",   icon: Handshake },
        { label: "Contract Inventory", href: "/seller/contracts/inventory", icon: PackageSearch },
      ],
    },
    {
      group: "Communication",
      items: [
        { label: "Messages", href: "/seller/messages", icon: MessageSquare },
        { label: "Reviews & Ratings", href: "/seller/reviews", icon: Star },
        { label: "Farm Profile", href: "/seller/profile", icon: Settings },
      ],
    },
  ],
  admin: [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Reports & Analytics", href: "/admin/reports", icon: BarChart2 },
      ],
    },
    {
      group: "Management",
      items: [
        { label: "User Management", href: "/admin/users", icon: Users },
        { label: "Product Monitoring", href: "/admin/products", icon: Archive },
        { label: "Order Monitoring", href: "/admin/orders", icon: Package },
        { label: "Logistics Monitoring", href: "/admin/logistics", icon: Truck },
      ],
    },
    {
      group: "EDI",
      items: [
        { label: "EDI Dashboard", href: "/admin/edi/dashboard", icon: Network },
        { label: "Transaction Inbox", href: "/admin/edi/transactions", icon: Inbox },
        { label: "Trading Partners", href: "/admin/edi/companies", icon: Building2 },
        { label: "Outbound Builder", href: "/admin/edi/outbound", icon: Send },
      ],
    },
    {
      group: "Contracts",
      items: [
        { label: "Contract Monitoring", href: "/admin/contracts", icon: Handshake },
        { label: "Company Onboarding", href: "/admin/onboarding", icon: UserCheck },
      ],
    },
    {
      group: "Platform",
      items: [
        { label: "Content Management", href: "/admin/content", icon: Megaphone },
        { label: "System Settings", href: "/admin/settings", icon: Monitor },
      ],
    },
  ],
};

const roleLabels: Record<string, string> = {
  customer: "Customer Portal",
  seller: "Seller Portal",
  logistics: "Logistics Portal",
  admin: "Admin Panel",
};

const mockUsers: Record<string, { name: string; email: string; initials: string }> = {
  customer: { name: "Ana Reyes", email: "ana.reyes@email.com", initials: "AR" },
  seller: { name: "Mang Jose Santos", email: "jose.santos@philharvest.ph", initials: "JS" },
  admin: { name: "Admin User", email: "admin@philharvest.ph", initials: "AU" },
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title?: string;
}

function SidebarContent({ role, onClose }: { role: UserRole; onClose?: () => void }) {
  const [location] = useLocation();
  const groups = navConfig[role] || [];
  const user = mockUsers[role];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground">
          <div className="w-7 h-7 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span>PhilHarvest</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role label */}
      <div className="px-4 py-2">
        <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
          {roleLabels[role]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {groups.map((group) => (
          <div key={group.group}>
            <p className="px-2 mb-1 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                    data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <Badge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs px-1.5 py-0 min-w-5 justify-center">
                        {item.badge}
                      </Badge>
                    ) : isActive ? (
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors cursor-pointer">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
          </div>
          <LogOut className="w-4 h-4 text-sidebar-foreground/40 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-r border-sidebar-border">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-sidebar-border">
          <SidebarContent role={role} onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
              data-testid="button-mobile-sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && <h1 className="font-semibold text-foreground text-base">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${role}/notifications`}>
              <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors" data-testid="button-header-notifications">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-destructive rounded-full" />
              </button>
            </Link>
            <Avatar className="w-8 h-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {mockUsers[role]?.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <RoleSwitcher />
    </div>
  );
}
