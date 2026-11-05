import { apiJson } from "./client";

export type CartLine = {
  itemId: number | null;
  variantId: number;
  productId: number;
  productName: string;
  slug: string;
  brandName: string;
  configurationName: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
  lineTotal: number;
};

export type Cart = {
  items: CartLine[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  voucherCode: string | null;
  voucherMessage: string | null;
};

export type QuoteItem = { variantId: number; quantity: number };

export function quoteCart(items: QuoteItem[], voucherCode?: string) {
  return apiJson<Cart>("/api/cart/quote", { method: "POST", body: JSON.stringify({ items, voucherCode }) });
}

export function getCart() {
  return apiJson<Cart>("/api/cart");
}

export function addCartItem(variantId: number, quantity: number) {
  return apiJson<Cart>("/api/cart/items", { method: "POST", body: JSON.stringify({ variantId, quantity }) });
}

export function updateCartItem(itemId: number, quantity: number) {
  return apiJson<Cart>("/api/cart/items/" + itemId, { method: "PUT", body: JSON.stringify({ variantId: 0, quantity }) });
}

export function removeCartItem(itemId: number) {
  return apiJson<Cart>("/api/cart/items/" + itemId, { method: "DELETE" });
}

export function mergeCart(items: QuoteItem[], voucherCode?: string) {
  return apiJson<Cart>("/api/cart/merge", { method: "POST", body: JSON.stringify({ items, voucherCode }) });
}

export function applyVoucher(code: string) {
  return apiJson<Cart>("/api/cart/voucher", { method: "POST", body: JSON.stringify({ code }) });
}
