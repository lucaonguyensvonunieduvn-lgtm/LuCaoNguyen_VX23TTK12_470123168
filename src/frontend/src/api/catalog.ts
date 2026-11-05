import { apiJson } from "./client";

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
  imageUrl: string;
  specLine: string;
  price: number;
  compareAtPrice: number | null;
  variantId: number;
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
};

export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number };

export type SpecValue = { group: string; name: string; slug: string; value: string };

export type Variant = {
  id: number;
  sku: string;
  configurationName: string;
  colorName: string;
  colorHex: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  specifications: SpecValue[];
};

export type Review = { id: number; authorName: string; rating: number; comment: string; createdAt: string };

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  isNew: boolean;
  categories: string[];
  images: string[];
  specifications: SpecValue[];
  variants: Variant[];
  rating: number;
  reviewCount: number;
  reviews: Review[];
  related: ProductCard[];
  canReview: boolean;
};

export type FilterOption = { value: string; count: number };

export type CatalogFilters = {
  brands: FilterOption[];
  categories: FilterOption[];
  cpus: FilterOption[];
  gpus: FilterOption[];
  rams: FilterOption[];
  storages: FilterOption[];
  displaySizes: FilterOption[];
  refreshRates: FilterOption[];
  minPrice: number;
  maxPrice: number;
};

export type Brand = { id: number; name: string; slug: string; description?: string; imageUrl?: string; fromPrice?: number; productCount: number };
export type Category = { id: number; name: string; slug: string; description: string; productCount: number };

export type HomeData = { hero: ProductCard | null; categories: Category[]; featured: ProductCard[]; brands: Brand[] };

export function getHome() {
  return apiJson<HomeData>("/api/home");
}

export function getFilters() {
  return apiJson<CatalogFilters>("/api/filters");
}

export function getProducts(params: URLSearchParams) {
  const query = params.toString();
  return apiJson<Paged<ProductCard>>(`/api/products${query ? `?${query}` : ""}`);
}

export function getProduct(slug: string) {
  return apiJson<ProductDetail>(`/api/products/${slug}`);
}

export type Offer = { code: string; discountType: string; discountValue: number; minOrderAmount: number; maxDiscount?: number | null; endsAt?: string | null };
export type HelpPage = { slug: string; title: string; body: string };

export function getBrands() {
  return apiJson<Brand[]>("/api/brands");
}

export function getCategories() {
  return apiJson<Category[]>("/api/categories");
}

export function getOffers() {
  return apiJson<Offer[]>("/api/offers");
}

export function getHelpPages() {
  return apiJson<HelpPage[]>("/api/pages");
}
