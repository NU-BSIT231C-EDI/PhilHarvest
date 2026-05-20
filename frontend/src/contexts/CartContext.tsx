import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { CartItem, Product } from "@/types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem("philharvest_cart");
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem("philharvest_cart", JSON.stringify(cart));
  } catch {}
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  const updateCart = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setCart((prev) => {
      const next = updater(prev);
      saveCart(next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (product: Product) => {
      updateCart((prev) => {
        const existing = prev.find((item) => item.productId === product.id);
        if (existing) {
          return prev.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            price: product.price,
            unit: product.unit,
            quantity: 1,
            sellerName: product.sellerName,
            image: product.images[0] ?? "",
          },
        ];
      });
    },
    [updateCart]
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      updateCart((prev) => prev.filter((item) => item.productId !== productId));
    },
    [updateCart]
  );

  const updateQuantity = useCallback(
    (productId: string, delta: number) => {
      updateCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
      );
    },
    [updateCart]
  );

  const clearCart = useCallback(() => {
    updateCart(() => []);
  }, [updateCart]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
