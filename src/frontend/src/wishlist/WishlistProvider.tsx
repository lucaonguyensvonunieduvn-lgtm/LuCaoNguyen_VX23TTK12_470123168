import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiJson } from "../api/client";
import type { ProductCard } from "../api/catalog";
import { useAuth } from "../auth/AuthProvider";

type WishlistContextValue = {
  ids: number[];
  ready: boolean;
  has: (productId: number) => boolean;
  toggle: (productId: number) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [ids, setIds] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const ticket = useRef(0);

  useEffect(() => {
    const current = ++ticket.current;
    if (!session) {
      setIds([]);
      setReady(true);
      return;
    }
    setReady(false);
    apiJson<ProductCard[]>("/api/account/wishlist")
      .then((items) => {
        if (current === ticket.current) setIds(items.map((item) => item.id));
      })
      .catch(() => {
        if (current === ticket.current) setIds([]);
      })
      .finally(() => {
        if (current === ticket.current) setReady(true);
      });
  }, [session]);

  const value = useMemo<WishlistContextValue>(() => ({
    ids,
    ready,
    has: (productId) => ids.includes(productId),
    async toggle(productId) {
      const current = ++ticket.current;
      const liked = ids.includes(productId);
      if (liked) {
        await apiJson(`/api/account/wishlist/${productId}`, { method: "DELETE" });
        if (current === ticket.current) setIds((list) => list.filter((id) => id !== productId));
      } else {
        await apiJson(`/api/account/wishlist/${productId}`, { method: "POST" });
        if (current === ticket.current) setIds((list) => list.includes(productId) ? list : [...list, productId]);
      }
      setReady(true);
    },
  }), [ids, ready]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error("WishlistProvider is missing.");
  return value;
}
