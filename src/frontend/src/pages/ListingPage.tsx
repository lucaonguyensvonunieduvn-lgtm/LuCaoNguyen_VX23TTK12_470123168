import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiBaseUrl } from "../api/client";
import { getFilters, getProducts, type CatalogFilters, type FilterOption, type ProductCard } from "../api/catalog";
import { ProductCardView } from "../components/catalog/ProductCardView";
import { useCart } from "../cart/CartProvider";
import { money } from "../catalog/format";

const sorts = [
  ["popular", "Phổ biến"],
  ["newest", "Mới nhất"],
  ["price-asc", "Giá tăng dần"],
  ["price-desc", "Giá giảm dần"],
  ["best-selling", "Bán chạy"],
  ["rating", "Đánh giá"],
  ["name", "Tên"],
];

const pageSize = 8;
const hiddenKeys = new Set(["page", "pageSize", "sort", "deals"]);

export function ListingPage({ deals = false }: { deals?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<CatalogFilters | null>(null);
  const [items, setItems] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const cart = useCart();
  const page = Number(params.get("page") ?? "1");
  const boundMin = filters?.minPrice ?? 0;
  const boundMax = filters?.maxPrice ?? 0;
  const minPrice = Number(params.get("minPrice") ?? boundMin);
  const maxPrice = Number(params.get("maxPrice") ?? boundMax);

  useEffect(() => {
    getFilters().then(setFilters).catch(() => setFilters(null));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(params);
    if (deals) query.set("deals", "true");
    if (!query.get("sort")) query.set("sort", "popular");
    query.set("pageSize", String(pageSize));
    getProducts(query).then((result) => {
      setItems(result.items);
      setTotal(result.total);
    }).catch(() => {
      setItems([]);
      setTotal(0);
    });
  }, [params, deals]);

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params);
    const current = next.get(key)?.split(",").filter(Boolean) ?? [];
    const updated = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    if (updated.length === 0) next.delete(key);
    else next.set(key, updated.join(","));
    next.delete("page");
    setParams(next);
  }

  function removeValue(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (key === "minPrice" || key === "maxPrice" || key === "search" || key === "inStock") next.delete(key);
    else {
      const updated = (next.get(key)?.split(",") ?? []).filter((item) => item !== value);
      if (updated.length === 0) next.delete(key);
      else next.set(key, updated.join(","));
    }
    next.delete("page");
    setParams(next);
  }

  function setSort(sort: string) {
    const next = new URLSearchParams(params);
    next.set("sort", sort);
    next.delete("page");
    setParams(next);
  }

  function setPrice(min: number, max: number) {
    const next = new URLSearchParams(params);
    if (min <= boundMin) next.delete("minPrice");
    else next.set("minPrice", String(Math.round(min)));
    if (max >= boundMax) next.delete("maxPrice");
    else next.set("maxPrice", String(Math.round(max)));
    next.delete("page");
    setParams(next);
  }

  function go(number: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(number));
    setParams(next);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const selected = (key: string) => params.get(key)?.split(",") ?? [];
  const chips = [...params.entries()].flatMap(([key, value]) => {
    if (hiddenKeys.has(key)) return [];
    if (key === "minPrice") return [{ key, value, label: `Từ ${money(Number(value))}` }];
    if (key === "maxPrice") return [{ key, value, label: `Đến ${money(Number(value))}` }];
    if (key === "inStock") return [{ key, value, label: "Còn hàng" }];
    if (key === "search") return [{ key, value, label: `Tìm: ${value}` }];
    return value.split(",").filter(Boolean).map((part) => ({ key, value: part, label: part }));
  });

  return (
    <>
      <section className="list-hero">
        <div>
          <p className="hero-kicker">{deals ? "ƯU ĐÃI" : "LAPTOP"}</p>
          <h1>{deals ? "Máy đang giảm giá" : "Tìm laptop tiếp theo"}</h1>
          <p>{deals ? "Giá đã giảm, tồn kho lấy từ kho." : "Hiệu năng mạnh. Nhiều cách dùng."}</p>
          <div className="hero-points">
            <Link to="/laptops?category=business"><WorkIcon />Làm việc</Link>
            <Link to="/laptops?category=gaming"><PlayIcon />Chơi game</Link>
            <Link to="/laptops?category=creator"><CreateIcon />Sáng tạo</Link>
            <Link to="/laptops?category=student"><BagIcon />Học tập</Link>
          </div>
        </div>
        <img className="hero-art" src={`${apiBaseUrl}/catalog/apple-macbook-pro-14-m4.jpg`} alt="" loading="lazy" />
      </section>
      <nav className="crumbs page-crumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>{deals ? "Ưu đãi" : "Laptop"}</span>
      </nav>
      <section className="listing">
        <aside className={open ? "filters open" : "filters"}>
          <div className="filter-head">
            <strong>Bộ lọc</strong>
            <button type="button" className="text-link" onClick={() => setParams(new URLSearchParams())}>Xóa hết</button>
          </div>
          <FilterGroup title="Hãng" options={filters?.brands ?? []} selected={selected("brand")} onToggle={(value) => toggle("brand", value)} />
          <details className="filter-group" open>
            <summary>Giá</summary>
            <p className="muted">{money(shown(minPrice, boundMin))} – {money(shown(maxPrice, boundMax))}</p>
            <input
              className="price-slider"
              type="range"
              min={boundMin}
              max={boundMax}
              step={500000}
              value={Math.min(maxPrice || boundMax, boundMax)}
              aria-label="Giá tối đa"
              disabled={boundMax <= boundMin}
              onChange={(event) => setPrice(minPrice, Number(event.target.value))}
            />
            <div className="price-inputs">
              <input type="number" min={boundMin} max={boundMax} step={500000} value={Math.round(minPrice || boundMin)} aria-label="Giá thấp nhất" onChange={(event) => setPrice(Number(event.target.value), maxPrice)} />
              <span>–</span>
              <input type="number" min={boundMin} max={boundMax} step={500000} value={Math.round(maxPrice || boundMax)} aria-label="Giá cao nhất" onChange={(event) => setPrice(minPrice, Number(event.target.value))} />
            </div>
          </details>
          <FilterGroup title="CPU" options={filters?.cpus ?? []} selected={selected("cpu")} onToggle={(value) => toggle("cpu", value)} />
          <FilterGroup title="GPU" options={filters?.gpus ?? []} selected={selected("gpu")} onToggle={(value) => toggle("gpu", value)} />
          <FilterGroup title="RAM" options={filters?.rams ?? []} selected={selected("ram")} onToggle={(value) => toggle("ram", value)} />
          <FilterGroup title="Ổ cứng" options={filters?.storages ?? []} selected={selected("storage")} onToggle={(value) => toggle("storage", value)} />
          <FilterGroup title="Màn hình" options={filters?.displaySizes ?? []} selected={selected("displaySize")} onToggle={(value) => toggle("displaySize", value)} />
          <FilterGroup title="Tần số quét" options={filters?.refreshRates ?? []} selected={selected("refreshRate")} onToggle={(value) => toggle("refreshRate", value)} />
          <FilterGroup title="Nhu cầu" options={filters?.categories ?? []} selected={selected("category")} onToggle={(value) => toggle("category", value)} />
          <label className="check-line">
            <input type="checkbox" checked={params.get("inStock") === "true"} onChange={() => toggle("inStock", "true")} />
            <span>Chỉ còn hàng</span>
          </label>
        </aside>
        <div className="listing-results">
          <button className="btn-line filter-toggle" type="button" onClick={() => setOpen((value) => !value)}>Bộ lọc</button>
          <div className="list-toolbar">
            <strong>Tìm thấy {total} máy</strong>
            <div className="list-tools">
              <select className="sort-select" value={params.get("sort") ?? "popular"} onChange={(event) => setSort(event.target.value)} aria-label="Sắp xếp">
                {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="view-toggle">
                <button type="button" className={view === "grid" ? "current" : ""} aria-label="Lưới" onClick={() => setView("grid")}>
                  <GridIcon />
                </button>
                <button type="button" className={view === "list" ? "current" : ""} aria-label="Danh sách" onClick={() => setView("list")}>
                  <ListIcon />
                </button>
              </div>
            </div>
          </div>
          {chips.length > 0 ? (
            <div className="chips">
              {chips.map((chip) => (
                <button key={`${chip.key}-${chip.value}`} type="button" className="chip" onClick={() => removeValue(chip.key, chip.value)}>{chip.label} ×</button>
              ))}
              <button type="button" className="text-link" onClick={() => setParams(new URLSearchParams())}>Xóa hết</button>
            </div>
          ) : null}
          {items.length === 0 ? <div className="empty-note">Không có laptop khớp bộ lọc.</div> : null}
          <div className={view === "list" ? "product-grid as-list" : "product-grid"}>
            {items.map((product) => <ProductCardView key={product.id} product={product} onAdd={(item) => cart.add(item.variantId)} />)}
          </div>
          <div className="pager">
            <button type="button" className="page-btn" aria-label="Trang trước" disabled={page <= 1} onClick={() => go(page - 1)}>‹</button>
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <button key={number} type="button" className={number === page ? "page-btn current" : "page-btn"} onClick={() => go(number)}>{number}</button>
            ))}
            <button type="button" className="page-btn" aria-label="Trang sau" disabled={page >= pages} onClick={() => go(page + 1)}>›</button>
          </div>
        </div>
      </section>
    </>
  );
}

function shown(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function FilterGroup({ title, options, selected, onToggle }: { title: string; options: FilterOption[]; selected: string[]; onToggle: (value: string) => void }) {
  if (options.length === 0) return null;
  return (
    <details className="filter-group" open>
      <summary>{title}</summary>
      {options.map((option) => (
        <label key={option.value} className="check-line">
          <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} />
          <span>{option.value}</span>
          <span className="muted">{option.count}</span>
        </label>
      ))}
    </details>
  );
}

function WorkIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 6v3l2 1" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function PlayIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="5" width="12" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M7 8h.01M11 8h.01M7 11h4" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function CreateIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 13.5 5 10l6-6 2.5 2.5-6 6z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function BagIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 7h8l-.6 7H5.6zM7 7V5.5A2 2 0 0 1 9 3.5 2 2 0 0 1 11 5.5V7" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="currentColor" /></svg>;
}
function ListIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" strokeWidth="1.6" /></svg>;
}
