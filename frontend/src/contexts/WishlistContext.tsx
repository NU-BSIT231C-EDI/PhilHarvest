import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { WishlistItem, Product } from "@/types";

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

function loadWishlist(): WishlistItem[] {
  try {
    const stored = localStorage.getItem("philharvest_wishlist");
    return stored ? (JSON.parse(stored) as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]) {
  try {
    localStorage.setItem("philharvest_wishlist", JSON.stringify(items));
  } catch {}
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(loadWishlist);

  const updateWishlist = useCallback((updater: (prev: WishlistItem[]) => WishlistItem[]) => {
    setWishlist((prev) => {
      const next = updater(prev);
      saveWishlist(next);
      return next;
    });
  }, []);

  const addToWishlist = useCallback(
    (product: Product) => {
      updateWishlist((prev) => {
        if (prev.find((i) => i.productId === product.id)) return prev;
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            price: product.price,
            unit: product.unit,
            image: product.images[0] ?? "",
            sellerName: product.sellerName,
            addedAt: new Date().toISOString().split("T")[0],
          },
        ];
      });
    },
    [updateWishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: string) => {
      updateWishlist((prev) => prev.filter((i) => i.productId !== productId));
    },
    [updateWishlist]
  );

  const isInWishlist = useCallback(
    (productId: string) => wishlist.some((i) => i.productId === productId),
    [wishlist]
  );

  const wishlistCount = wishlist.length;

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, wishlistCount }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
