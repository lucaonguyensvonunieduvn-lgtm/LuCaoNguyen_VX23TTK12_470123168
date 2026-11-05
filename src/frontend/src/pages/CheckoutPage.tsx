import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { apiBaseUrl, apiJson, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartProvider";
import { money } from "../catalog/format";

type Address = {
  id: number;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export function CheckoutPage() {
  const { session, ready } = useAuth();
  const { cart, setVoucher, update, remove, refresh } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const dismissed = (location.state as { loginDismissed?: boolean } | null)?.loginDismissed;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Vietnam",
    saveAddress: true,
  });

  useEffect(() => {
    if (!ready || session || dismissed) return;
    if (location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/forgot-password") return;
    navigate("/login", { state: { background: { pathname: "/checkout", search: location.search }, next: "/checkout" } });
  }, [ready, session, dismissed, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    apiJson<Address[]>("/api/account/addresses").then((addresses) => {
      if (cancelled) return;
      const address = addresses.find((item) => item.isDefault) ?? addresses[0];
      setForm((current) => ({
        ...current,
        email: session.email,
        fullName: address?.recipientName || session.fullName,
        phone: address?.phone ?? current.phone,
        addressLine1: address?.addressLine1 ?? current.addressLine1,
        addressLine2: address?.addressLine2 ?? current.addressLine2,
        city: address?.city ?? current.city,
        state: address?.state ?? current.state,
        postalCode: address?.postalCode ?? current.postalCode,
        country: address?.country || "Vietnam",
      }));
    }).catch(() => {
      if (!cancelled) setForm((current) => ({ ...current, email: session.email, fullName: current.fullName || session.fullName }));
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function place(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!session) {
      navigate("/login", { state: { background: { pathname: "/checkout", search: location.search }, next: "/checkout" } });
      return;
    }
    try {
      const order = await apiJson<{ code: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ ...form, voucherCode: cart?.voucherCode }),
      });
      await refresh();
      navigate(`/order-success/${order.code}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không đặt được đơn.");
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const empty = count === 0;

  return (
    <section className="page checkout-page">
      <div className="checkout-head">
        <div>
          <h1>Thanh toán</h1>
          <p className="muted">Hoàn tất đơn. Chưa trừ tiền online.</p>
        </div>
        <ol className="checkout-steps">
          <li className="current"><span>1</span> Thông tin</li>
          <li><span>2</span> Thanh toán</li>
          <li><span>3</span> Đặt hàng</li>
        </ol>
      </div>
      {!session ? <p className="checkout-login">Hãy <Link to="/login" state={{ background: { pathname: "/checkout", search: location.search }, next: "/checkout" }}>đăng nhập</Link> trước khi đặt hàng.</p> : null}
      <form className="split" onSubmit={place}>
        <div className="stack">
          <section className="panel pad checkout-card">
            <h2><UserIcon /> Thông tin khách</h2>
            <p className="muted">Dùng để liên hệ khi giao hàng.</p>
            <div className="checkout-2">
              <Field label="Họ tên" required value={form.fullName} onChange={(value) => set("fullName", value)} />
              <Field label="Email" required type="email" value={form.email} onChange={(value) => set("email", value)} />
              <Field label="Điện thoại" required value={form.phone} onChange={(value) => set("phone", value)} />
            </div>
          </section>
          <section className="panel pad checkout-card">
            <h2><PinIcon /> Địa chỉ giao hàng</h2>
            <p className="muted">Đơn được giao đến địa chỉ này.</p>
            <div className="checkout-fields">
              <Field label="Địa chỉ" required value={form.addressLine1} onChange={(value) => set("addressLine1", value)} />
              <Field label="Địa chỉ 2 (không bắt buộc)" value={form.addressLine2} onChange={(value) => set("addressLine2", value)} placeholder="Căn hộ, tòa nhà..." />
              <div className="checkout-3">
                <Field label="Thành phố" required value={form.city} onChange={(value) => set("city", value)} />
                <Field label="Tỉnh / thành" required value={form.state} onChange={(value) => set("state", value)} />
                <Field label="Mã bưu chính" required value={form.postalCode} onChange={(value) => set("postalCode", value)} />
              </div>
              <label className="field"><span>Quốc gia *</span>
                <select value={form.country} onChange={(event) => set("country", event.target.value)}>
                  <option value="Vietnam">Việt Nam</option>
                </select>
              </label>
              <label className="check-line checkout-save">
                <input type="checkbox" checked={form.saveAddress} onChange={(event) => set("saveAddress", event.target.checked)} />
                <span>Lưu địa chỉ này cho lần sau</span>
              </label>
            </div>
          </section>
          <section className="panel pad checkout-card">
            <h2><TagIcon /> Mã giảm giá</h2>
            <p className="muted">Nhập mã nếu có, để trừ vào đơn.</p>
            <div className="voucher-row">
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Nhập mã giảm giá" aria-label="Mã giảm giá" />
              <button className="btn-line" type="button" onClick={() => setVoucher(code)}>Áp dụng</button>
            </div>
            {cart?.voucherMessage ? <p className={cart.voucherCode ? "status-ok" : "status-bad"}>{cart.voucherMessage}</p> : null}
          </section>
          <section className="panel pad checkout-card">
            <h2><CardIcon /> Phương thức thanh toán</h2>
            <p className="muted">Chọn cách thanh toán cho đơn này.</p>
            <div className="pay-choice disabled">
              <input type="radio" name="pay" disabled />
              <CardIcon />
              <span className="pay-copy">
                <span className="pay-title"><strong>Thẻ tín dụng / ghi nợ</strong><span className="badge badge-amber">Đang phát triển</span></span>
                <span className="muted">Thanh toán online chưa mở.</span>
              </span>
            </div>
            <div className="pay-choice disabled">
              <input type="radio" name="pay" disabled />
              <BankIcon />
              <span className="pay-copy">
                <span className="pay-title"><strong>Chuyển khoản</strong><span className="badge badge-amber">Đang phát triển</span></span>
                <span className="muted">Chuyển khoản chưa mở.</span>
              </span>
            </div>
            <label className="pay-choice selected">
              <input type="radio" name="pay" checked readOnly />
              <BoxIcon />
              <span className="pay-copy">
                <strong>Đặt hàng khi nhận</strong>
                <span className="muted">Đặt đơn ngay. Thu tiền lúc giao, chưa trừ tiền online.</span>
              </span>
            </label>
          </section>
        </div>
        <aside className="stack">
          <section className="summary-card pad checkout-summary">
            <div className="checkout-summary-head">
              <h2><CartIcon /> Tóm tắt đơn</h2>
              <span className="muted">{count} sản phẩm</span>
            </div>
            {empty ? <p className="muted">Giỏ đang trống. <Link to="/laptops">Xem laptop</Link></p> : null}
            {cart?.items.map((item) => (
              <article key={item.variantId} className="checkout-line">
                <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
                <div>
                  <div className="checkout-line-top">
                    <strong>{item.productName}</strong>
                    <button type="button" aria-label={`Xóa ${item.productName}`} onClick={() => remove({ itemId: item.itemId, variantId: item.variantId })}>×</button>
                  </div>
                  <p className="muted">{item.configurationName}</p>
                  <div className="checkout-line-bot">
                    <div className="qty">
                      <button type="button" aria-label="Giảm số lượng" disabled={item.quantity <= 1} onClick={() => update({ itemId: item.itemId, variantId: item.variantId }, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Tăng số lượng" disabled={item.quantity >= item.stockQuantity} onClick={() => update({ itemId: item.itemId, variantId: item.variantId }, item.quantity + 1)}>+</button>
                    </div>
                    <strong>{money(item.lineTotal)}</strong>
                  </div>
                </div>
              </article>
            ))}
            <p className="summary-row"><span>Tạm tính ({count} sản phẩm)</span><span>{money(cart?.subtotal ?? 0)}</span></p>
            <p className="summary-row"><span>Giảm giá{cart?.voucherCode ? ` (${cart.voucherCode})` : ""}</span><span className={(cart?.discount ?? 0) > 0 ? "status-ok" : ""}>{(cart?.discount ?? 0) > 0 ? `-${money(cart?.discount ?? 0)}` : money(0)}</span></p>
            <p className="summary-row"><span>Vận chuyển</span><span>{(cart?.shippingFee ?? 0) === 0 ? "Miễn phí" : money(cart?.shippingFee ?? 0)}</span></p>
            <p className="summary-strong"><span>Tổng</span><span>{money(cart?.total ?? 0)}</span></p>
            {error ? <p className="status-bad">{error}</p> : null}
            <button className="btn-dark" type="submit" disabled={!session || empty}><LockIcon /> Đặt hàng <ArrowIcon /></button>
            <p className="summary-hint">Chưa thu tiền online. Liên hệ sau khi đơn được xác nhận.</p>
          </section>
          <section className="panel pad checkout-trust">
            <p><TruckIcon /><span><strong>Miễn phí vận chuyển</strong><span className="muted">Đơn từ 1.250.000 ₫</span></span></p>
            <p><ShieldIcon /><span><strong>Bảo hành</strong><span className="muted">Theo chính sách của hãng</span></span></p>
            <p><BoxIcon /><span><strong>Đổi trả</strong><span className="muted">Hoàn kho khi hủy đơn chờ xử lý</span></span></p>
          </section>
        </aside>
      </form>
    </section>
  );
}

function Field({ label, value, onChange, required = false, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) {
  return (
    <label className="field"><span>{label}{required ? " *" : ""}</span>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function UserIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="6.2" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M4.2 14.2a4.8 4.8 0 0 1 9.6 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 15.2s4.2-3.4 4.2-6.4a4.2 4.2 0 1 0-8.4 0c0 3 4.2 6.4 4.2 6.4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="8.6" r="1.3" fill="currentColor" /></svg>;
}

function TagIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.2 9.2 8.8 3.6h5.2v5.2l-5.6 5.6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><circle cx="11.6" cy="6.2" r="0.8" fill="currentColor" /></svg>;
}

function CardIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.2" y="4.4" width="13.6" height="9.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2.2 7.6h13.6" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function BankIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 7.2 9 4l6 3.2M4.2 7.4v5.2M7.4 7.4v5.2M10.6 7.4v5.2M13.8 7.4v5.2M3 13.2h12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

function BoxIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 6.2 9 3.5l6 2.7v6.2L9 15.1 3 12.4zM3 6.2 9 9l6-2.8M9 9v6.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}

function CartIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 4h1.6l1.2 7.2h7.4l1.2-4.6H5.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="7.2" cy="14" r="0.9" fill="currentColor" /><circle cx="12.4" cy="14" r="0.9" fill="currentColor" /></svg>;
}

function LockIcon() {
  return <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><rect x="4" y="8" width="10" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6.2 8V6.2a2.8 2.8 0 0 1 5.6 0V8" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TruckIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6h8.2v6.2H2zM10.2 8.2h2.6L15 10.5v1.7h-4.8" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="5.2" cy="13.6" r="1" fill="currentColor" /><circle cx="12.4" cy="13.6" r="1" fill="currentColor" /></svg>;
}

function ShieldIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.8 14.2 5v4.2c0 3-2.1 4.8-5.2 6-3.1-1.2-5.2-3-5.2-6V5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6.6 9.1 8.2 10.6 11.4 7.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}
