import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserRole = "customer" | "contract" | "seller" | "logistics" | "admin" | null;

interface AuthStore {
  role: UserRole;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      role: (typeof window !== "undefined" ? (localStorage.getItem("demoRole") as UserRole) : null),
      setRole: (role) => {
        if (role) localStorage.setItem("demoRole", role);
        else localStorage.removeItem("demoRole");
        set({ role });
      },
      logout: () => {
        localStorage.removeItem("demoRole");
        set({ role: null });
      },
    }),
    { name: "philharvest-auth" }
  )
);
