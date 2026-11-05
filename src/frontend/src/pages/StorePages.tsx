import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { apiBaseUrl, apiJson } from "../api/client";
import { getBrands, getHelpPages, getOffers, getProducts, type Brand, type HelpPage, type Offer, type ProductCard } from "../api/catalog";
import { ProductCardView } from "../components/catalog/ProductCardView";
import { useCart } from "../cart/CartProvider";
import { money } from "../catalog/format";

export function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  useEffect(() => { getBrands().then(setBrands).catch(() => setBrands([])); }, []);
  const total = brands.reduce((sum, brand) => sum + brand.productCount, 0);

  return (
    <>
      <section className="list-hero">
        <div>
          <p className="hero-kicker">THƯƠNG HIỆU</p>
          <h1>Chọn hãng trước</h1>
          <p>{brands.length} hãng, {total} máy đang bán. Bấm một hãng để xem đúng dòng máy đó.</p>
        </div>
        <img className="hero-art" src={`${apiBaseUrl}/catalog/apple-macbook-pro-14-m4.jpg`} alt="" loading="lazy" />
      </section>
      <nav className="crumbs page-crumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Thương hiệu</span></nav>
      <section className="page">
        {brands.length === 0 ? <p className="empty-note">Chưa có hãng.</p> : null}
        <div className="brand-grid">
          {brands.map((brand) => (
            <Link key={brand.id} className="brand-card panel" to={`/laptops?brand=${brand.slug}`}>
              <img src={`${apiBaseUrl}${brand.imageUrl ?? ""}`} alt="" loading="lazy" />
              <div>
                <strong>{brand.name}</strong>
                <span className="muted">{brand.productCount} máy đang bán</span>
                {brand.fromPrice ? <span className="price">Từ {money(brand.fromPrice)}</span> : null}
                {brandNote(brand) ? <span className="muted">{brandNote(brand)}</span> : null}
                <span className="account-more">Xem máy →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export function DealsPage() {
  const cart = useCart();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [items, setItems] = useState<ProductCard[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    getOffers().then(setOffers).catch(() => setOffers([]));
    const query = new URLSearchParams({ deals: "true", sort: "popular", pageSize: "12" });
    getProducts(query).then((result) => setItems(result.items.filter((item) => item.compareAtPrice != null && item.compareAtPrice > item.price))).catch(() => setItems([]));
  }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(code);
  }

  return (
    <>
      <section className="list-hero">
        <div>
          <p className="hero-kicker">ƯU ĐÃI</p>
          <h1>Giá đã giảm</h1>
          <p>Mã nhập ở trang thanh toán. Máy bên dưới đang bán thấp hơn giá niêm yết.</p>
        </div>
        <img className="hero-art" src={`${apiBaseUrl}/catalog/dell-xps-13-plus.jpg`} alt="" loading="lazy" />
      </section>
      <nav className="crumbs page-crumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Ưu đãi</span></nav>
      <section className="page">
        <div className="section-head">
          <div>
            <h2>Mã giảm giá</h2>
            <p className="muted">Chỉ mã còn hiệu lực. Không tự trừ vào giỏ.</p>
          </div>
          <Link to="/checkout">Đến thanh toán</Link>
        </div>
        {offers.length === 0 ? <p className="empty-note">Chưa có mã đang mở.</p> : null}
        <div className="offer-grid">
          {offers.map((offer) => (
            <article key={offer.code} className="panel offer-card">
              <p className="hero-kicker">{offer.discountType === "Percent" ? "Phần trăm" : "Số tiền"}</p>
              <strong>{offerText(offer)}</strong>
              <p className="muted">{offer.minOrderAmount > 0 ? `Đơn từ ${money(offer.minOrderAmount)}` : "Không yêu cầu đơn tối thiểu"}{offer.endsAt ? ` · đến ${new Date(offer.endsAt).toLocaleDateString("vi-VN")}` : ""}</p>
              <div className="offer-code">
                <span>{offer.code}</span>
                <button type="button" onClick={() => copy(offer.code)}>{copied === offer.code ? "Đã chép" : "Chép mã"}</button>
              </div>
            </article>
          ))}
        </div>
        <div className="section-head">
          <div>
            <h2>Máy đang giảm giá</h2>
            <p className="muted">{items.length} máy có giá thấp hơn giá niêm yết.</p>
          </div>
          <Link to="/laptops">Xem mọi laptop</Link>
        </div>
        {items.length === 0 ? <p className="empty-note">Chưa có máy giảm giá.</p> : null}
        <div className="product-grid">
          {items.map((product) => <ProductCardView key={product.id} product={product} onAdd={(item) => cart.add(item.variantId)} />)}
        </div>
      </section>
    </>
  );
}

function brandNote(brand: Brand) {
  const text = brand.description?.trim() ?? "";
  if (!text || text.toLocaleLowerCase("vi") === `laptop ${brand.name}`.toLocaleLowerCase("vi")) return "";
  return text;
}

function offerText(offer: Offer) {
  if (offer.discountType === "Percent") {
    const cap = offer.maxDiscount ? `, tối đa ${money(offer.maxDiscount)}` : "";
    return `Giảm ${offer.discountValue}%${cap}`;
  }
  return `Giảm ${money(offer.discountValue)}`;
}

const topics = ["Đơn hàng", "Đổi trả", "Bảo hành", "Tài khoản", "Khác"];

const helpCopy: Record<string, string> = {
  warranty: "Thời hạn bảo hành ghi trong thông số của từng laptop, theo chính sách của hãng. Velora không bán thêm gói bảo hành riêng. Dòng Bảo hành nằm trên đúng cấu hình đang bán.",
  privacy: "Velora lưu họ tên, email, số điện thoại, địa chỉ và đơn hàng để giao máy. Mật khẩu được băm, không lưu dạng gốc. Website không gửi email và không lưu thẻ, vì đơn thanh toán khi nhận hàng.",
  terms: "Đặt hàng là yêu cầu mua máy. Giá, phí vận chuyển và tồn kho lấy tại lúc đặt. Thanh toán khi nhận hàng, chưa thu tiền online. Thẻ và chuyển khoản đang phát triển nên không chọn được. Hủy đơn đang chờ xác nhận thì số lượng được trả lại kho.",
  returns: "Đơn đang chờ xác nhận có thể hủy trên trang đơn. Kho được hoàn nếu đơn đó đã trừ tồn. Đơn đã xác nhận, đang giao hoặc đã giao thì gửi tin ở form bên cạnh, cửa hàng xem trong hệ thống. Website chưa gửi email xác nhận.",
  help: "Tìm laptop theo tên, hãng hoặc chip. Theo dõi đơn trong tài khoản sau khi đăng nhập. So sánh tối đa 3 máy, danh sách chỉ lưu trên trình duyệt này. Tin nhắn gửi ở form được lưu cho cửa hàng, chưa có email trả lời.",
  about: "Velora là cửa hàng laptop nhiều hãng. Thương hiệu, danh mục, giá và tồn kho lấy từ cơ sở dữ liệu. Một máy có thể thuộc nhiều nhu cầu sử dụng. Ảnh máy nằm trên website, không lấy từ đường dẫn bên ngoài.",
};

export function SupportPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<HelpPage[]>([]);
  const [term, setTerm] = useState("");
  const [form, setForm] = useState({ name: "", email: "", topic: "Đơn hàng", message: "" });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { getHelpPages().then(setPages).catch(() => setPages([])); }, []);

  function search(event: FormEvent) {
    event.preventDefault();
    const query = term.trim();
    navigate(query ? `/laptops?search=${encodeURIComponent(query)}` : "/laptops");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await apiJson<{ message: string }>("/api/pages/contact", { method: "POST", body: JSON.stringify(form) });
      setNote(result.message);
      setForm({ name: "", email: "", topic: "Đơn hàng", message: "" });
    } catch {
      setNote("");
      setError("Chưa gửi được. Kiểm tra lại các ô rồi thử lần nữa.");
    }
  }

  return (
    <>
      <section className="list-hero">
        <div>
          <p className="hero-kicker">HỖ TRỢ</p>
          <h1>Xem đơn, hỏi máy</h1>
          <p>Theo dõi đơn trong tài khoản. Tin nhắn được lưu cho cửa hàng, website chưa gửi email.</p>
          <form className="support-search" onSubmit={search}>
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Tìm chip, hãng, tên máy..." aria-label="Tìm laptop" />
            <button className="btn-light" type="submit">Tìm</button>
          </form>
        </div>
        <img className="hero-art" src={`${apiBaseUrl}/catalog/lenovo-thinkpad-x1-carbon.jpg`} alt="" loading="lazy" />
      </section>
      <nav className="crumbs page-crumbs"><Link to="/">Trang chủ</Link><span>/</span><span>Hỗ trợ</span></nav>
      <section className="page">
        <div className="support-links">
          <Link className="panel support-link" to="/account/orders"><BoxIcon /><span><strong>Theo dõi đơn</strong><span className="muted">Trạng thái nằm trong lịch sử đơn.</span></span></Link>
          <Link className="panel support-link" to="/pages/returns"><RefreshIcon /><span><strong>Đổi trả</strong><span className="muted">Hủy đơn chờ xác nhận thì kho được trả lại.</span></span></Link>
          <Link className="panel support-link" to="/pages/warranty"><ShieldIcon /><span><strong>Bảo hành</strong><span className="muted">Thời hạn ghi trên thông số từng máy.</span></span></Link>
          <Link className="panel support-link" to="/compare"><ScaleIcon /><span><strong>So sánh máy</strong><span className="muted">Tối đa 3 cấu hình trên trình duyệt này.</span></span></Link>
        </div>
        <div className="support-split">
          <form className="panel pad account-form" onSubmit={submit}>
            <h2>Gửi câu hỏi</h2>
            <p className="muted">Cửa hàng đọc tin trong hệ thống. Không có email xác nhận.</p>
            <label className="field"><span>Họ tên *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label className="field"><span>Email *</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
            <label className="field"><span>Chủ đề *</span>
              <select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })}>
                {topics.map((topic) => <option key={topic}>{topic}</option>)}
              </select>
            </label>
            <label className="field"><span>Nội dung *</span><textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required /></label>
            <button className="btn-dark" type="submit">Gửi tin</button>
            {note ? <p className="status-ok">{note}</p> : null}
            {error ? <p className="status-bad">{error}</p> : null}
          </form>
          <div className="support-faq">
            {pages.map((page) => (
              <details key={page.slug} className="panel pad faq-item">
                <summary>{page.title}</summary>
                <p>{helpCopy[page.slug] ?? page.body}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function BoxIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M4 7.2 11 4l7 3.2v7.2L11 18l-7-3.6z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function RefreshIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M6 8H4V5.5M5 8a6 6 0 1 1-1 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function ShieldIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 3.2 17.5 5.6v5.4c0 3.4-2.6 5.6-6.5 7.4-3.9-1.8-6.5-4-6.5-7.4V5.6z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function ScaleIcon() {
  return <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M11 4v14M6 18h10M11 6 6 10M11 6l5 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
