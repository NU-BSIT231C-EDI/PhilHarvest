import { useState } from "react";
import { useLocation } from "wouter";
import { Users, ChevronUp } from "lucide-react";
import type { UserRole } from "@/types";

const roles: { role: UserRole | "public"; label: string; path: string; color: string }[] = [
  { role: "public", label: "Public", path: "/", color: "bg-slate-600" },
  { role: "customer", label: "Customer", path: "/customer/dashboard", color: "bg-blue-600" },
  { role: "seller", label: "Seller", path: "/seller/dashboard", color: "bg-secondary" },
  { role: "logistics", label: "Logistics", path: "/logistics/dashboard", color: "bg-orange-500" },
  { role: "admin", label: "Admin", path: "/admin/dashboard", color: "bg-primary" },
];

export default function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const [activeRole, setActiveRole] = useState<string>(() => localStorage.getItem("demoRole") || "public");

  const current = roles.find((r) => r.role === activeRole) || roles[0];

  function handleSelect(r: typeof roles[0]) {
    setActiveRole(r.role);
    localStorage.setItem("demoRole", r.role);
    navigate(r.path);
    setOpen(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" data-testid="role-switcher">
      {open && (
        <div className="mb-2 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
          {roles.map((r) => (
            <button
              key={r.role}
              onClick={() => handleSelect(r)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors text-left ${
                activeRole === r.role ? "bg-muted text-primary" : "text-foreground"
              }`}
              data-testid={`button-role-${r.role}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
              {r.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${current.color}`}
        data-testid="button-role-switcher-toggle"
      >
        <Users className="w-4 h-4" />
        <span>Demo: {current.label}</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
