import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { apiBaseUrl, apiJson } from "../api/client";
import { getProduct, type ProductDetail, type Variant } from "../api/catalog";
import { ProductCardView } from "../components/catalog/ProductCardView";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartProvider";
import { money, stars } from "../catalog/format";
import { specText } from "../catalog/labels";
import { toggleCompare } from "../compare/storage";
import { useWishlist } from "../wishlist/WishlistProvider";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [canSlide, setCanSlide] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const cart = useCart();
  const { session } = useAuth();
  const wishes = useWishlist();

  useEffect(() => {
    setMissing(false);
    setZoom(false);
    getProduct(slug).then((next) => {
      setProduct(next);
      setVariantId(next.variants[0]?.id ?? null);
      setPhoto(0);
    }).catch(() => {
      setProduct(null);
      setMissing(true);
    });
  }, [slug]);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => setCanSlide(el.scrollWidth > el.clientWidth + 8);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [product]);

  useEffect(() => {
    if (!zoom) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setZoom(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const variant = useMemo(() => product?.variants.find((item) => item.id === variantId) ?? product?.variants[0], [product, variantId]);
  if (!product || !variant) {
    return missing ? <section className="page"><div className="empty-note">Laptop này không còn bán.</div></section> : <section className="page" />;
  }
  const laptop = product;
  const groups = groupOptions(product.variants);
  const onSale = variant.compareAtPrice !== null && variant.compareAtPrice > variant.price;
  const saved = onSale ? (variant.compareAtPrice ?? 0) - variant.price : 0;
  const savedPercent = onSale && variant.compareAtPrice ? Math.round((saved / variant.compareAtPrice) * 100) : 0;
  const category = product.categories[0];
  const images = product.images.length > 0 ? product.images : [""];
  const specs = variant.specifications.concat(product.specifications);
  const line = [valueOf(product, variant, "cpu"), valueOf(product, variant, "ram"), valueOf(product, variant, "display-size"), valueOf(product, variant, "storage")].filter(Boolean).join(" | ");
  const headline = category?.toLowerCase().includes("gaming") ? "Chơi game không giới hạn" : product.name;

  async function review(event: FormEvent) {
    event.preventDefault();
    try {
      await apiJson(`/api/products/${laptop.slug}/reviews`, { method: "POST", body: JSON.stringify({ rating, comment }) });
      setProduct(await getProduct(laptop.slug));
      setComment("");
      setMessage("Đã gửi đánh giá.");
    } catch {
      setMessage("Chưa gửi được đánh giá.");
    }
  }

  function scrollReviews() {
    document.getElementById("danh-gia")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <section className="page detail-page">
        <nav className="crumbs">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/laptops">Laptop</Link>
          {category ? <><span>/</span><Link to={`/laptops?category=${encodeURIComponent(category)}`}>{category}</Link></> : null}
          <span>/</span>
          <Link to={`/laptops?brand=${product.brandSlug}`}>{product.brandName}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>
        <div className="buy-grid">
          <div className="gallery">
            <div className="thumbs">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" className={index === photo ? "current" : ""} onClick={() => setPhoto(index)}>
                  <img src={`${apiBaseUrl}${image}`} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            <div className="photo-frame">
              <img className="detail-photo" src={`${apiBaseUrl}${images[photo] ?? ""}`} alt={product.name} loading="lazy" />
              <button className="zoom-btn" type="button" aria-label="Phóng to ảnh" onClick={() => setZoom(true)}>
                <IconExpand />
              </button>
            </div>
          </div>
          <div className="buy-box">
            <p className="muted brand-kicker">{product.brandName}</p>
            <h1>{product.name}</h1>
            <p className="muted spec-line">{line}</p>
            <p className="stars">
              {stars(product.rating)} <span>{product.rating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
              <button type="button" className="text-link" onClick={scrollReviews}>Viết đánh giá</button>
            </p>
            <div className="detail-badges">
              {onSale ? <span className="badge badge-hot">Giảm giá</span> : null}
              {product.isFeatured ? <span className="badge badge-dark">Bán chạy</span> : null}
              {product.isNew ? <span className="badge badge-green">Mới</span> : null}
              {category ? <span className="badge badge-blue">{category}</span> : null}
            </div>
            <p className="price-row">
              <span className={onSale ? "price price-sale" : "price"}>{money(variant.price)}</span>
              {onSale ? <span className="price-old">{money(variant.compareAtPrice ?? 0)}</span> : null}
              {onSale ? <span className="save-note">Tiết kiệm {money(saved)} ({savedPercent}%)</span> : null}
            </p>
            <p className="buy-copy">{product.description || product.shortDescription}</p>
            <p className={variant.stockQuantity > 0 ? "stock-line status-ok" : "stock-line status-bad"}>
              <span className="stock-dot" />
              {variant.stockQuantity > 0 ? `Còn ${variant.stockQuantity} máy` : "Hết hàng"}
            </p>
            <div className="option-grid">
              {Object.entries(groups).map(([slugKey, values]) => (
                <label key={slugKey} className="field">
                  {specText(slugKey)}
                  <select value={variant.specifications.find((spec) => spec.slug === slugKey)?.value ?? ""} onChange={(event) => choose(product.variants, variant, slugKey, event.target.value, setVariantId)}>
                    {values.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="button-row">
              <button className="btn-dark" type="button" disabled={variant.stockQuantity < 1} onClick={() => cart.add(variant.id)}>
                <IconCart /> Thêm vào giỏ
              </button>
              <button className={wishes.has(product.id) ? "btn-line liked" : "btn-line"} type="button" aria-pressed={wishes.has(product.id)} onClick={() => session ? wishes.toggle(product.id) : setMessage("Hãy đăng nhập để lưu yêu thích.")}>
                <IconHeart filled={wishes.has(product.id)} /> Yêu thích
              </button>
              <button className="btn-line" type="button" onClick={() => { toggleCompare({ slug: product.slug, variantId: variant.id }); navigate("/compare"); }}>
                <IconCompare /> So sánh
              </button>
            </div>
            {message ? <p className="muted">{message}</p> : null}
            <div className="mini-trust">
              <div className="trust-item">
                <IconTruck />
                <div><strong>Vận chuyển</strong><span className="muted">Miễn phí từ 1.250.000 ₫</span></div>
              </div>
              <div className="trust-item">
                <IconShield />
                <div><strong>Bảo hành</strong><span className="muted">{valueOf(product, variant, "warranty") || "Theo hãng"}</span></div>
              </div>
              <div className="trust-item">
                <IconReturn />
                <div><strong>Đổi trả</strong><span className="muted">Hoàn kho khi hủy đơn</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="highlight-row">
          <Highlight icon={<IconChip />} title="Hiệu năng" text={valueOf(product, variant, "cpu") || "Xem thông số"} />
          <Highlight icon={<IconDisplay />} title="Màn hình" text={[valueOf(product, variant, "display-size"), valueOf(product, variant, "refresh-rate")].filter(Boolean).join(" · ") || "Xem thông số"} />
          <Highlight icon={<IconGpu />} title="Đồ họa" text={valueOf(product, variant, "gpu") || "Xem thông số"} />
          <Highlight icon={<IconGem />} title="Thiết kế" text={[valueOf(product, variant, "weight"), valueOf(product, variant, "panel")].filter(Boolean).join(" · ") || product.brandName} />
        </div>

        <section id="tong-quan" className="overview-grid">
          <div>
            <h2>{headline}</h2>
            <p>{product.description}</p>
          </div>
          <img src={`${apiBaseUrl}${images[0] ?? ""}`} alt="" loading="lazy" />
          <ul className="spec-points">
            {specs.slice(0, 8).map((spec) => (
              <li key={`point-${spec.slug}-${spec.value}`}><IconCheck />{spec.value}</li>
            ))}
          </ul>
        </section>

        <section className="spec-review">
          <div id="thong-so" className="detail-card">
            <h2>Thông số</h2>
            <table className="spec-table">
              <tbody>
                {specs.map((spec) => (
                  <tr key={`${spec.slug}-${spec.value}`}><th>{specText(spec.name)}</th><td>{spec.value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div id="danh-gia" className="detail-card">
            <div className="review-head">
              <h2>Đánh giá khách hàng</h2>
              <button className="btn-line review-write" type="button" onClick={() => document.getElementById("viet-danh-gia")?.scrollIntoView({ behavior: "smooth" })}>Viết đánh giá</button>
            </div>
            <div className="rating-summary">
              <p className="score">{product.reviewCount > 0 ? product.rating.toFixed(1) : "0"}</p>
              <div>
                <p className="stars">{stars(product.rating)}</p>
                <p className="muted">Dựa trên {product.reviewCount} đánh giá</p>
              </div>
            </div>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = product.reviews.filter((item) => item.rating === star).length;
              const percent = product.reviewCount === 0 ? 0 : Math.round((count / product.reviewCount) * 100);
              return (
                <p key={star} className="rating-line">
                  <span>{star}</span>
                  <progress className="rating-bar" value={percent} max={100} />
                  <span className="muted">{percent}%</span>
                </p>
              );
            })}
            {product.reviews.map((item) => (
              <article key={item.id} className="review-card">
                <span className="avatar">{item.authorName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <div className="review-meta">
                    <strong>{item.authorName}</strong>
                    <span className="muted">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="stars">{stars(item.rating)}</div>
                  <p>{item.comment}</p>
                </div>
              </article>
            ))}
            {product.reviews.length === 0 ? <p className="muted">Chưa có đánh giá.</p> : null}
            <div id="viet-danh-gia">
              {product.canReview ? (
                <form className="stack" onSubmit={review}>
                  <label className="field">Số sao
                    <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                      {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="field">Nhận xét
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} required />
                  </label>
                  <button className="btn-dark" type="submit">Gửi đánh giá</button>
                </form>
              ) : <p className="muted">Chỉ đánh giá được sau khi đơn chứa máy này đã giao. Mỗi khách một đánh giá cho một dòng máy.</p>}
            </div>
          </div>
        </section>

        <section id="lien-quan" className="related-block">
          <div className="section-head">
            <div>
              <h2>Laptop liên quan</h2>
              <p className="muted">Máy cùng nhu cầu, lấy từ kho.</p>
            </div>
            <Link to="/laptops">Xem tất cả laptop</Link>
          </div>
          <div className="related-wrap">
            {canSlide ? <button className="rail-nav prev" type="button" aria-label="Máy trước" onClick={() => rail.current?.scrollBy({ left: -260, behavior: "smooth" })}>‹</button> : null}
            <div className="related-rail" ref={rail}>
              {product.related.map((item) => <ProductCardView key={item.id} product={item} onAdd={(card) => cart.add(card.variantId)} />)}
            </div>
            {canSlide ? <button className="rail-nav next" type="button" aria-label="Máy sau" onClick={() => rail.current?.scrollBy({ left: 260, behavior: "smooth" })}>›</button> : null}
          </div>
          {product.related.length === 0 ? <p className="muted">Chưa có máy liên quan.</p> : null}
        </section>
      </section>
      {zoom ? (
        <button className="lightbox" type="button" aria-label="Đóng ảnh" onClick={() => setZoom(false)}>
          <img src={`${apiBaseUrl}${images[photo] ?? ""}`} alt={product.name} />
        </button>
      ) : null}
    </>
  );
}

function valueOf(product: ProductDetail, variant: Variant, slug: string) {
  return variant.specifications.find((spec) => spec.slug === slug)?.value
    ?? product.specifications.find((spec) => spec.slug === slug)?.value
    ?? "";
}

function Highlight({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="highlight"><span className="highlight-icon">{icon}</span><strong>{title}</strong><span className="muted">{text}</span></div>;
}

function groupOptions(variants: Variant[]) {
  const groups: Record<string, string[]> = {};
  for (const variant of variants) {
    for (const spec of variant.specifications) {
      groups[spec.slug] ??= [];
      if (!groups[spec.slug].includes(spec.value)) groups[spec.slug].push(spec.value);
    }
  }
  return groups;
}

function choose(variants: Variant[], current: Variant, slug: string, value: string, setVariantId: (id: number) => void) {
  const wanted = new Map(current.specifications.map((spec) => [spec.slug, spec.slug === slug ? value : spec.value]));
  const match = variants.find((variant) => variant.specifications.every((spec) => wanted.get(spec.slug) === spec.value))
    ?? variants.find((variant) => variant.specifications.some((spec) => spec.slug === slug && spec.value === value));
  if (match) setVariantId(match.id);
}

function IconCart() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h1.4l1.2 7.2a1 1 0 0 0 1 .8h6.2a1 1 0 0 0 1-.8L14 4.5H4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="6.2" cy="13.2" r="1" fill="currentColor" /><circle cx="11.2" cy="13.2" r="1" fill="currentColor" /></svg>;
}

function IconHeart({ filled = false }: { filled?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.2 2.6 8.1a3.2 3.2 0 0 1 4.5-4.5L8 4.4l.9-.8a3.2 3.2 0 0 1 4.5 4.5z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function IconCompare() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h6M7 2l2 2-2 2M13 12H7M9 10l-2 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function IconTruck() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.5 6.5h9v7h-9zM11.5 9h3.2L17 11.5V13.5h-5.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="6" cy="15" r="1.2" fill="currentColor" /><circle cx="14" cy="15" r="1.2" fill="currentColor" /></svg>;
}

function IconShield() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 16 5v5.2c0 3.2-2.4 5.4-6 7.3-3.6-1.9-6-4.1-6-7.3V5z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function IconReturn() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 7H3.5V4.5M4 7a6.5 6.5 0 1 1-1 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function IconChip() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="6" y="6" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 3.5v2.5M12 3.5v2.5M8 14v2.5M12 14v2.5M3.5 8h2.5M3.5 12h2.5M14 8h2.5M14 12h2.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function IconDisplay() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="9" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 16.5h4M10 13v3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function IconGpu() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M12 8h3M12 10h3M12 12h3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function IconGem() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 8 7 4h6l3 4-6 9zM4 8h12M10 17 7.2 8 10 4l2.8 4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}

function IconCheck() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M5 8.2 7 10.1 11 6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

function IconExpand() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
