import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiBaseUrl } from "../api/client";
import { getHome, type HomeData, type ProductCard } from "../api/catalog";
import { ProductCardView } from "../components/catalog/ProductCardView";
import { useCart } from "../cart/CartProvider";

const categoryArt: Record<string, string> = {
  business: "/catalog/lenovo-thinkpad-x1-carbon.jpg",
  gaming: "/catalog/asus-rog-strix-g16.jpg",
  student: "/catalog/apple-macbook-air-13-m3.jpg",
  "2-in-1": "/catalog/hp-spectre-x360-14.jpg",
  creator: "/catalog/apple-macbook-pro-14-m4.jpg",
};

export function HomePage() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const cart = useCart();

  useEffect(() => {
    getHome().then(setHome).catch(() => setError("Không tải được danh mục. Hãy chạy backend rồi tải lại trang."));
  }, []);

  const slides = slidesOf(home);
  const current = slides[slide] ?? slides[0];
  const points = (current?.specLine ?? "").split("|").map((part) => part.trim()).filter(Boolean);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">THẾ HỆ MỚI</p>
          <h1>{current?.name ?? "Laptop tiếp theo của bạn"}</h1>
          <p>Hiệu năng rõ ràng cho công việc, học tập và giải trí.</p>
          <div className="hero-points">
            <HeroPoint icon="chip" text={points[0] ?? "Chip đời mới"} />
            <HeroPoint icon="display" text={points[1] ?? "Màn hình sắc"} />
            <HeroPoint icon="battery" text={points[2] ?? "Pin dùng lâu"} />
          </div>
          <div className="hero-actions">
            <Link className="btn-light" to={current ? `/laptops/${current.slug}` : "/laptops"}>Mua ngay</Link>
            <Link className="text-link light-link" to="/laptops">Xem thêm</Link>
          </div>
          {slides.length > 1 ? (
            <div className="hero-dots">
              {slides.map((item, index) => (
                <button key={item.id} type="button" className={index === slide ? "current" : ""} aria-label={item.name} onClick={() => setSlide(index)} />
              ))}
            </div>
          ) : null}
        </div>
        {current ? (
          <div className="hero-stage">
            <img className="hero-art" src={`${apiBaseUrl}${current.imageUrl}`} alt={current.name} loading="lazy" />
            <p className="hero-caption">Vận hành bởi<br />{points[0] ?? current.name}</p>
          </div>
        ) : null}
      </section>
      <section className="trust-bar">
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true"><TruckIcon /></span>
          <div><strong>Miễn phí vận chuyển</strong><div className="muted">Đơn từ 1.250.000 ₫</div></div>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true"><ShieldIcon /></span>
          <div><strong>Bảo hành 1 năm</strong><div className="muted">Bảo hành hãng ghi trên máy</div></div>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true"><ReturnIcon /></span>
          <div><strong>Đổi trả dễ dàng</strong><div className="muted">Hủy đơn chờ xử lý được hoàn kho</div></div>
        </div>
        <div className="trust-item">
          <span className="trust-icon" aria-hidden="true"><SupportIcon /></span>
          <div><strong>Hỗ trợ rõ ràng</strong><div className="muted">Theo dõi đơn ngay trên web</div></div>
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Mua theo nhu cầu</h2>
            <p className="muted">Chọn laptop đúng cách bạn dùng máy.</p>
          </div>
          <Link to="/laptops">Xem mọi danh mục</Link>
        </div>
        <div className="category-grid">
          {home?.categories.map((category) => (
            <Link key={category.id} to={`/laptops?category=${category.slug}`} className="category-card">
              <img src={`${apiBaseUrl}${categoryArt[category.slug] ?? "/catalog/dell-xps-13-plus.jpg"}`} alt="" loading="lazy" />
              <div>
                <strong>{category.name}</strong>
                <span className="muted">{category.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Laptop nổi bật</h2>
            <p className="muted">Máy được chọn sẵn, giá và tồn kho lấy từ kho.</p>
          </div>
          <Link to="/laptops">Xem tất cả laptop</Link>
        </div>
        {error ? <div className="empty-note">{error}</div> : null}
        <div className="product-grid">
          {home?.featured.slice(0, 4).map((product) => (
            <ProductCardView key={product.id} product={product} onAdd={(item) => cart.add(item.variantId)} />
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Thương hiệu hàng đầu</h2>
            <p className="muted">Các hãng lấy từ kho dữ liệu.</p>
          </div>
        </div>
        <div className="brand-row">
          {home?.brands.map((brand) => (
            <Link key={brand.id} to={`/laptops?brand=${brand.slug}`} data-brand={brand.slug}>{brand.name}</Link>
          ))}
        </div>
      </section>
    </>
  );
}

function slidesOf(home: HomeData | null) {
  if (!home) return [];
  const slides: ProductCard[] = [];
  if (home.hero) slides.push(home.hero);
  for (const product of home.featured) {
    if (slides.length >= 3) break;
    if (!slides.some((item) => item.id === product.id)) slides.push(product);
  }
  return slides;
}

function HeroPoint({ icon, text }: { icon: "chip" | "display" | "battery"; text: string }) {
  return (
    <div>
      {icon === "chip" ? <ChipIcon /> : null}
      {icon === "display" ? <DisplayIcon /> : null}
      {icon === "battery" ? <BatteryIcon /> : null}
      <span>{text}</span>
    </div>
  );
}

function ChipIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="6" y="6" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 3v3M13 3v3M9 16v3M13 16v3M3 9h3M3 13h3M16 9h3M16 13h3" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function DisplayIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="4" width="16" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 18h6" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function BatteryIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="7" width="14" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M17 10h2v2h-2" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function TruckIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 5h9v8H2zM11 8h4l3 3v2h-7z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="5.5" cy="15" r="1.2" /><circle cx="14.5" cy="15" r="1.2" /></svg>;
}

function ShieldIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 16 5v5c0 3.4-2.4 5.6-6 7.5-3.6-1.9-6-4.1-6-7.5V5z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function ReturnIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6 4 9l3 3M4 9h8a4 4 0 1 1 0 8H9" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function SupportIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10a6 6 0 0 1 12 0v4a2 2 0 0 1-2 2h-2v-5h4M4 11h4v5H6a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
