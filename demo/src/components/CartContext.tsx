import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "../types";

const CART_STORAGE_KEY = "sepetiq-demo-cart";

export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function calculateSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.product.fiyat * item.quantity,
    0,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!storedCart) return;

    try {
      setItems(JSON.parse(storedCart) as CartItem[]);
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  const addItem = (product: Product) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem) {
        const nextItems = currentItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, addedAt: new Date().toISOString() }
            : item,
        );
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
        return nextItems;
      }

      const nextItems = [
        ...currentItems,
        {
          product,
          quantity: 1,
          addedAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  };

  const removeItem = (productId: string) => {
    setItems((currentItems) => {
      const nextItems = currentItems.filter(
        (item) => item.product.id !== productId,
      );
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
      return nextItems;
    });
  };

  const clearCart = () => {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    setItems([]);
  };

  const value = useMemo(() => {
    const subtotal = calculateSubtotal(items);
    const discount = subtotal > 0 ? Math.round(subtotal * 0.08) : 0;
    const shipping = subtotal === 0 || subtotal >= 750 ? 0 : 49;

    return {
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      shipping,
      total: Math.max(subtotal - discount + shipping, 0),
      addItem,
      removeItem,
      clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);

  if (!value) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return value;
}
