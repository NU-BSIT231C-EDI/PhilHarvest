import { create } from "zustand";
import { persist } from "zustand/middleware";
import { products as initialProducts } from "@/data/mockData";
import { contracts as initialContracts } from "@/data/mockData";
import type { Product, CartItem, Contract, ContractStatus } from "@/types";

interface ProductStore {
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleAvailability: (id: string) => void;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set) => ({
      products: initialProducts,
      addProduct: (product) =>
        set((state) => ({ products: [product, ...state.products] })),
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      deleteProduct: (id) =>
        set((state) => ({ products: state.products.filter((p) => p.id !== id) })),
      toggleAvailability: (id) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p
          ),
        })),
    }),
    { name: "philharvest-products" }
  )
);

interface CartStore {
  items: CartItem[];
  appliedCoupon: { code: string; discount: number; type: "percent" | "fixed" } | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: { code: string; discount: number; type: "percent" | "fixed" }) => void;
  removeCoupon: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      appliedCoupon: null,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                ),
        })),
      clearCart: () => set({ items: [], appliedCoupon: null }),
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      removeCoupon: () => set({ appliedCoupon: null }),
    }),
    { name: "philharvest-cart" }
  )
);

interface ContractStore {
  contracts: Contract[];
  addContract: (contract: Contract) => void;
  updateContractStatus: (id: string, status: ContractStatus, notes?: string) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  saveDraft: (contract: Partial<Contract>) => void;
  draft: Partial<Contract> | null;
}

export const useContractStore = create<ContractStore>()(
  persist(
    (set) => ({
      contracts: initialContracts,
      draft: null,
      addContract: (contract) =>
        set((state) => ({ contracts: [contract, ...state.contracts] })),
      updateContractStatus: (id, status, notes) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id
              ? { ...c, status, negotiationNotes: notes || c.negotiationNotes, updatedAt: new Date().toISOString() }
              : c
          ),
        })),
      updateContract: (id, updates) =>
        set((state) => ({
          contracts: state.contracts.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),
      saveDraft: (draft) => set({ draft }),
    }),
    { name: "philharvest-contracts" }
  )
);
