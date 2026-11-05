import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { addCartItem, applyVoucher, getCart, mergeCart, quoteCart, removeCartItem, updateCartItem, type Cart, type QuoteItem } from "../api/cart";
import { useAuth } from "../auth/AuthProvider";

const storageKey = "laptop-store-cart";
const voucherKey = "laptop-store-voucher";

type LocalItem = QuoteItem;

type CartContextValue = {
  cart: Cart | null;
  count: number;
  add: (variantId: number, quantity?: number) => Promise<void>;
  update: (line: { itemId: number | null; variantId: number }, quantity: number) => Promise<void>;
  remove: (line: { itemId: number | null; variantId: number }) => Promise<void>;
  setVoucher: (code: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readLocal(): LocalItem[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as LocalItem[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      if (session) {
        const pending = readLocal();
        const voucher = localStorage.getItem(voucherKey) ?? undefined;
        const next = pending.length > 0 ? await mergeCart(pending, voucher) : await getCart();
        localStorage.removeItem(storageKey);
        localStorage.removeItem(voucherKey);
        if (!cancelled) setCart(next);
        return;
      }

      const next = await quoteCart(readLocal(), localStorage.getItem(voucherKey) ?? undefined);
      if (!cancelled) setCart(next);
    }
    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    count: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    async add(variantId, quantity = 1) {
      if (session) {
        setCart(await addCartItem(variantId, quantity));
        return;
      }
      const next = readLocal();
      const line = next.find((item) => item.variantId === variantId);
      if (line) line.quantity += quantity;
      else next.push({ variantId, quantity });
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCart(await quoteCart(next, localStorage.getItem(voucherKey) ?? undefined));
    },
    async update(line, quantity) {
      if (session && line.itemId) {
        setCart(await updateCartItem(line.itemId, quantity));
        return;
      }
      const next = readLocal().flatMap((item) => item.variantId === line.variantId ? (quantity < 1 ? [] : [{ ...item, quantity }]) : [item]);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCart(await quoteCart(next, localStorage.getItem(voucherKey) ?? undefined));
    },
    async remove(line) {
      if (session && line.itemId) {
        setCart(await removeCartItem(line.itemId));
        return;
      }
      const next = readLocal().filter((item) => item.variantId !== line.variantId);
      localStorage.setItem(storageKey, JSON.stringify(next));
      setCart(await quoteCart(next, localStorage.getItem(voucherKey) ?? undefined));
    },
    async setVoucher(code) {
      if (session) {
        setCart(await applyVoucher(code));
        return;
      }
      if (code) localStorage.setItem(voucherKey, code);
      else localStorage.removeItem(voucherKey);
      setCart(await quoteCart(readLocal(), code || undefined));
    },
    async refresh() {
      if (session) setCart(await getCart());
      else setCart(await quoteCart(readLocal(), localStorage.getItem(voucherKey) ?? undefined));
    },
  }), [cart, session]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("CartProvider is missing.");
  return value;
}
