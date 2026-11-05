export function money(value: number) {
  const amount = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value);
  return `${amount} ₫`;
}

export function stars(value: number) {
  const full = Math.round(value);
  return `${"★".repeat(full)}${"☆".repeat(Math.max(0, 5 - full))}`;
}
