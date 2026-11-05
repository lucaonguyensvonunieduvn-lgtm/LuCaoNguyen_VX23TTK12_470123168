const key = "laptop-store-compare";

export type ComparePick = { slug: string; variantId: number };

export function readCompare(): ComparePick[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as ComparePick[];
  } catch {
    return [];
  }
}

export function toggleCompare(pick: ComparePick) {
  const current = readCompare().filter((item) => item.slug !== pick.slug);
  current.push(pick);
  const next = current.slice(-3);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

export function removeCompare(slug: string) {
  const next = readCompare().filter((item) => item.slug !== slug);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
