import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { apiBaseUrl } from "../api/client";
import { getProducts, type ProductCard } from "../api/catalog";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartProvider";
import { money } from "../catalog/format";
import { ProductCardView } from "../components/catalog/ProductCardView";

export function CartPage() {
  const { cart, add, update, remove } = useCart();
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [suggestions, setSuggestions] = useState<ProductCard[]>([]);
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const empty = (cart?.items.length ?? 0) === 0;

  const ownedIds = cart?.items.map((item) => item.productId).join(",") ?? "";
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: "1", pageSize: "8", sort: "popular" });
    getProducts(params).then((page) => {
      if (cancelled) return;
      const owned = new Set(ownedIds.split(",").filter(Boolean).map(Number));
      setSuggestions(page.items.filter((item) => !owned.has(item.id)).slice(0, 4));
    }).catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [ownedIds]);

  return (
    <>
      <section className="page cart-page">
        <nav className="crumbs">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Giỏ hàng</span>
        </nav>
        <div className="cart-head">
          <div>
            <h1>Giỏ hàng</h1>
            <p className="muted">Xem lại máy rồi đặt. Tiền thu khi nhận hàng.</p>
          </div>
          <Link className="text-link" to="/laptops">Tiếp tục mua →</Link>
        </div>
        <div className="split">
          <div className="panel cart-box">
            <h2>{count} sản phẩm</h2>
            {empty ? <p className="muted">Giỏ hàng đang trống.</p> : null}
            {cart?.items.map((item) => (
              <article key={item.variantId} className="cart-line">
                <Link to={`/laptops/${item.slug}`}>
                  <img src={`${apiBaseUrl}${item.imageUrl}`} alt={item.productName} loading="lazy" />
                </Link>
                <div className="cart-info">
                  <div className="cart-title-row">
                    <Link to={`/laptops/${item.slug}`}><strong>{item.productName}</strong></Link>
                    <strong className="cart-price">{money(item.lineTotal)}</strong>
                  </div>
                  <p className="muted">{item.configurationName}</p>
                  <p className={item.stockQuantity > 0 ? "stock-line status-ok" : "stock-line status-bad"}>
                    <span className="stock-dot" />
                    {item.stockQuantity > 0 ? "Còn hàng" : "Hết hàng"}
                  </p>
                  <p className="muted">{item.brandName}</p>
                  <div className="cart-actions">
                    <div className="qty">
                      <button type="button" aria-label="Giảm số lượng" onClick={() => update(item, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Tăng số lượng" onClick={() => update(item, item.quantity + 1)} disabled={item.quantity >= item.stockQuantity}>+</button>
                    </div>
                    <button type="button" className="trash-btn" aria-label={`Xóa ${item.productName}`} onClick={() => remove(item)}>
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary-card pad order-summary">
            <h2>Tóm tắt đơn</h2>
            <Row label={`Tạm tính (${count} sản phẩm)`} value={money(cart?.subtotal ?? 0)} />
            {(cart?.discount ?? 0) > 0 ? <Row label="Giảm giá" value={`-${money(cart?.discount ?? 0)}`} sale /> : null}
            <Row label="Vận chuyển" value={(cart?.shippingFee ?? 0) === 0 ? "Miễn phí" : money(cart?.shippingFee ?? 0)} />
            <Row label="Tổng" value={money(cart?.total ?? 0)} strong />
            <p className="summary-hint">Mã giảm giá và cách thanh toán chọn ở bước sau.</p>
            <button className="btn-dark" type="button" disabled={empty || !ready} onClick={() => {
              if (!session) {
                navigate("/login", { state: { background: { pathname: location.pathname, search: location.search }, next: "/checkout" } });
                return;
              }
              navigate("/checkout");
            }}>Thanh toán</button>
          </aside>
        </div>
        {suggestions.length > 0 ? (
          <section className="cart-suggest">
            <div className="section-head">
              <div>
                <h2>Máy hay được xem cùng</h2>
                <p className="muted">Laptop khác đang bán trong kho.</p>
              </div>
              <Link to="/laptops">Xem tất cả laptop</Link>
            </div>
            <div className="product-grid cart-suggest-grid">
              {suggestions.map((product) => <ProductCardView key={product.id} product={product} onAdd={(item) => add(item.variantId)} />)}
            </div>
          </section>
        ) : null}
      </section>
    </>
  );
}

function Row({ label, value, strong = false, sale = false }: { label: string; value: string; strong?: boolean; sale?: boolean }) {
  return <p className={strong ? "summary-strong" : "summary-row"}><span>{label}</span><span className={sale ? "status-ok" : ""}>{value}</span></p>;
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6.2 4.5V3.2h3.6v1.3M4.2 4.5l.6 8.2h6.4l.6-8.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
