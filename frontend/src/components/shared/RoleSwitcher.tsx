import { useState } from "react";
import { useLocation } from "wouter";
import { Users, ChevronUp } from "lucide-react";
import type { UserRole } from "@/types";
import { useAuthStore } from "@/store/auth";

type RoleEntry = { role: UserRole | "public"; userType?: "small_business" | "big_business"; label: string; path: string; color: string };

const roles: RoleEntry[] = [
  { role: "public", label: "Public", path: "/", color: "bg-slate-600" },
  { role: "customer", userType: "small_business", label: "Customer (SMB)", path: "/customer/dashboard", color: "bg-blue-600" },
  { role: "customer", userType: "big_business", label: "Customer (Corp)", path: "/customer/dashboard", color: "bg-indigo-600" },
  { role: "seller", label: "Seller", path: "/seller/dashboard", color: "bg-secondary" },
  { role: "logistics", label: "Logistics", path: "/logistics/dashboard", color: "bg-orange-500" },
  { role: "admin", label: "Admin", path: "/admin/dashboard", color: "bg-primary" },
];

export default function RoleSwitcher() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { setRole, setUserType } = useAuthStore();
  const [activeKey, setActiveKey] = useState<string>(() => {
    const role = localStorage.getItem("demoRole") || "public";
    const type = localStorage.getItem("demoUserType");
    return role === "customer" && type === "big_business" ? "customer-big" : role;
  });

  const current = roles.find((r) => {
    const key = r.userType === "big_business" ? "customer-big" : r.role;
    return key === activeKey;
  }) || roles[0];

  function handleSelect(r: RoleEntry) {
    const key = r.userType === "big_business" ? "customer-big" : r.role ?? "public";
    setActiveKey(key);
    if (r.role) {
      setRole(r.role as UserRole);
      setUserType(r.userType ?? null);
    } else {
      setRole(null);
      setUserType(null);
    }
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
                (r.userType === "big_business" ? "customer-big" : r.role) === activeKey ? "bg-muted text-primary" : "text-foreground"
              }`}
              data-testid={`button-role-${r.userType === "big_business" ? "customer-big" : r.role}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
              {r.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95 ${current?.color ?? "bg-slate-600"}`}
        data-testid="button-role-switcher-toggle"
      >
        <Users className="w-4 h-4" />
        <span>Demo: {current?.label ?? "Public"}</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
    </div>
  );
}
