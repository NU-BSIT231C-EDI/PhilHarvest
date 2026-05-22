import { create } from "zustand";
import { persist } from "zustand/middleware";

type UserRole = "customer" | "contract" | "seller" | "logistics" | "admin" | null;
export type UserType = "small_business" | "big_business" | null;

interface AuthStore {
  role: UserRole;
  userType: UserType;
  setRole: (role: UserRole) => void;
  setUserType: (type: UserType) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      role: (typeof window !== "undefined" ? (localStorage.getItem("demoRole") as UserRole) : null),
      userType: (typeof window !== "undefined" ? (localStorage.getItem("demoUserType") as UserType) : null),
      setRole: (role) => {
        if (role) localStorage.setItem("demoRole", role);
        else localStorage.removeItem("demoRole");
        set({ role });
      },
      setUserType: (type) => {
        if (type) localStorage.setItem("demoUserType", type);
        else localStorage.removeItem("demoUserType");
        set({ userType: type });
      },
      logout: () => {
        localStorage.removeItem("demoRole");
        localStorage.removeItem("demoUserType");
        set({ role: null, userType: null });
      },
    }),
    { name: "philharvest-auth" }
  )
);
