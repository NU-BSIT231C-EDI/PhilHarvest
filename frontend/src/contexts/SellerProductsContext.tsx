import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Product } from "@/types";
import { products as initialProducts } from "@/data/mockData";

const SELLER_ID = "s1";
const SELLER_NAME = "Santos Family Farm";
const SELLER_REGION = "Benguet, CAR";

interface SellerProductsContextType {
  sellerProducts: Product[];
  addProduct: (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRegion" | "rating" | "reviewCount" | "createdAt">) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

const SellerProductsContext = createContext<SellerProductsContextType | null>(null);

function loadProducts(): Product[] {
  try {
    const stored = localStorage.getItem("philharvest_seller_products");
    if (stored) return JSON.parse(stored) as Product[];
  } catch {}
  return initialProducts.filter((p) => p.sellerId === SELLER_ID);
}

function saveProducts(products: Product[]) {
  try {
    localStorage.setItem("philharvest_seller_products", JSON.stringify(products));
  } catch {}
}

export function SellerProductsProvider({ children }: { children: ReactNode }) {
  const [sellerProducts, setSellerProducts] = useState<Product[]>(loadProducts);

  const updateState = useCallback((updater: (prev: Product[]) => Product[]) => {
    setSellerProducts((prev) => {
      const next = updater(prev);
      saveProducts(next);
      return next;
    });
  }, []);

  const addProduct = useCallback(
    (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRegion" | "rating" | "reviewCount" | "createdAt">) => {
      updateState((prev) => {
        const newProduct: Product = {
          ...data,
          id: `p-seller-${Date.now()}`,
          sellerId: SELLER_ID,
          sellerName: SELLER_NAME,
          sellerRegion: SELLER_REGION,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString().split("T")[0],
        };
        return [newProduct, ...prev];
      });
    },
    [updateState]
  );

  const updateProduct = useCallback(
    (id: string, data: Partial<Product>) => {
      updateState((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    },
    [updateState]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      updateState((prev) => prev.filter((p) => p.id !== id));
    },
    [updateState]
  );

  return (
    <SellerProductsContext.Provider value={{ sellerProducts, addProduct, updateProduct, deleteProduct }}>
      {children}
    </SellerProductsContext.Provider>
  );
}

export function useSellerProducts() {
  const ctx = useContext(SellerProductsContext);
  if (!ctx) throw new Error("useSellerProducts must be used within a SellerProductsProvider");
  return ctx;
}
