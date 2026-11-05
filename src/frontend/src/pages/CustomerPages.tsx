import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { apiBaseUrl, apiJson, ApiError } from "../api/client";
import { getProduct, type ProductCard, type ProductDetail, type Variant } from "../api/catalog";
import { useAuth } from "../auth/AuthProvider";
import { useCart } from "../cart/CartProvider";
import { money, stars } from "../catalog/format";
import { brandName, statusText } from "../catalog/labels";
import { ProductCardView } from "../components/catalog/ProductCardView";
import { readCompare, removeCompare } from "../compare/storage";
import { useWishlist } from "../wishlist/WishlistProvider";

type Profile = { fullName: string; email: string; orderCount: number; addressCount: number; wishlistCount: number };
type Address = { id: number; recipientName: string; phone: string; addressLine1: string; addressLine2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean };
type OrderItem = { productName: string; configurationName: string; imageUrl: string; quantity: number; lineTotal: number };
type Order = { code: string; status: string; createdAt: string; total: number; items: OrderItem[]; recipientName: string; phone: string; email: string; addressLine1: string; addressLine2?: string; city: string; state: string; postalCode: string; country: string; subtotal: number; shippingFee: number; discount: number; paymentMethod: string; voucherCode?: string };

function AccountShell({ crumb, children }: { crumb?: string; children: ReactNode }) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session) return;
    apiJson<Profile>("/api/account").then(setProfile).catch(() => setProfile(null));
  }, [session]);

  if (!session) return <section className="page"><Link to="/login" state={{ background: location }}>Đăng nhập để xem tài khoản.</Link></section>;

  const initial = (profile?.fullName || session.fullName || "V").trim().charAt(0).toUpperCase();
  return (
    <>
      <section className="account-hero">
        <div>
          <nav className="crumbs">
            <Link to="/">Trang chủ</Link><span>/</span>
            {crumb ? <><Link to="/account">Tài khoản</Link><span>/</span><span>{crumb}</span></> : <span>Tài khoản</span>}
          </nav>
          <h1>Tài khoản</h1>
          <p>Quản lý đơn hàng, hồ sơ và tùy chọn.</p>
        </div>
        <img src={`${apiBaseUrl}/catalog/apple-macbook-pro-14-m4.jpg`} alt="" loading="lazy" />
      </section>
      <section className="page account-page">
        <div className="account-layout">
          <aside className="panel account-nav">
            <div className="account-user">
              <span className="account-avatar">{initial}</span>
              <div>
                <strong>{profile?.fullName || session.fullName}</strong>
                <span className="muted">{profile?.email || session.email}</span>
              </div>
              <Link to="/account#ho-so" aria-label="Sửa hồ sơ"><PencilIcon /></Link>
            </div>
            <nav>
              <NavLink to="/account" icon={<GridIcon />}>Tổng quan</NavLink>
              <NavLink to="/account/orders" orders icon={<BoxNavIcon />}>Lịch sử đơn</NavLink>
              <NavLink to="/account/addresses" icon={<PinNavIcon />}>Địa chỉ</NavLink>
              <NavLink to="/account/wishlist" wish icon={<HeartNavIcon />}>Yêu thích</NavLink>
              <NavLink to="/account/security" icon={<LockNavIcon />}>Bảo mật</NavLink>
              {session.roles.includes("Admin") ? <NavLink to="/admin" icon={<GridIcon />}>Quản trị</NavLink> : null}
            </nav>
            <button className="btn-red" type="button" onClick={() => { logout(); navigate("/"); }}>Đăng xuất</button>
          </aside>
          <div className="account-main">{children}</div>
        </div>
      </section>
    </>
  );
}

export function AccountPage() {
  const { session } = useAuth();
  const location = useLocation();
  const history = location.pathname.startsWith("/account/orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!session) return;
    apiJson<Profile>("/api/account").then((next) => { setProfile(next); setName(next.fullName); });
    apiJson<Order[]>("/api/orders").then(setOrders).catch(() => setOrders([]));
  }, [session]);

  const shown = orders.filter((order) => !filter || order.status === filter);

  return (
    <AccountShell crumb={history ? "Lịch sử đơn" : undefined}>
            <div className="account-stats">
              <Link className="panel account-stat" to="/account/orders"><StatBagIcon /><span><strong>{profile?.orderCount ?? 0}</strong><span className="muted">Đơn hàng</span><span className="account-more">Xem đơn →</span></span></Link>
              <Link className="panel account-stat" to="/account/addresses"><PinNavIcon /><span><strong>{profile?.addressCount ?? 0}</strong><span className="muted">Địa chỉ</span><span className="account-more">Quản lý địa chỉ →</span></span></Link>
              <Link className="panel account-stat" to="/account/wishlist"><HeartNavIcon /><span><strong>{profile?.wishlistCount ?? 0}</strong><span className="muted">Yêu thích</span><span className="account-more">Xem yêu thích →</span></span></Link>
              <Link className="panel account-stat" to="/pages/warranty"><ShieldNavIcon /><span><strong>Bảo hành</strong><span className="muted">Theo chính sách hãng</span><span className="account-more">Xem thêm →</span></span></Link>
            </div>
            {history ? (
              <section className="account-panel">
                <div className="account-panel-head">
                  <div>
                    <h2>Lịch sử đơn</h2>
                    <p className="muted">Theo dõi đơn, xem chi tiết. Chưa thu tiền online.</p>
                  </div>
                  <select aria-label="Lọc đơn" value={filter} onChange={(event) => setFilter(event.target.value)}>
                    <option value="">Tất cả đơn</option>
                    <option value="Pending">Chờ xác nhận</option>
                    <option value="Confirmed">Đã xác nhận</option>
                    <option value="Processing">Đang xử lý</option>
                    <option value="Shipped">Đang giao</option>
                    <option value="Delivered">Đã giao</option>
                    <option value="Cancelled">Đã hủy</option>
                  </select>
                </div>
                {shown.length === 0 ? <p className="empty-note">Chưa có đơn ở bộ lọc này.</p> : null}
                <div className="account-orders">
                  {shown.map((order) => <OrderCard key={order.code} order={order} />)}
                </div>
              </section>
            ) : (
              <form id="ho-so" className="panel pad account-profile" onSubmit={async (event) => {
                event.preventDefault();
                await apiJson("/api/account", { method: "PUT", body: JSON.stringify({ fullName: name }) });
                setProfile((current) => current ? { ...current, fullName: name } : current);
                setSaved("Đã lưu hồ sơ.");
              }}>
                <h2>Hồ sơ</h2>
                <p className="muted">{profile?.email}</p>
                <label className="field">Họ tên<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                <button className="btn-green" type="submit">Lưu</button>
                {saved ? <p className="status-ok">{saved}</p> : null}
              </form>
            )}
    </AccountShell>
  );
}

function OrderCard({ order }: { order: Order }) {
  const thumbs = order.items.slice(0, 3);
  const extra = order.items.length - thumbs.length;
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const when = new Date(order.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <article className="account-order">
      <div>
        <div className="account-order-top">
          <div>
            <strong>Đơn {order.code}</strong>
            <p className="muted">Đặt lúc {when}</p>
          </div>
          <div className="account-order-meta">
            <span className={orderBadge(order.status)}>{statusText(order.status)}</span>
            <span className="muted">{count} sản phẩm</span>
          </div>
        </div>
        <div className="account-order-body">
          <div className="account-thumbs">
            {thumbs.map((item) => <img key={item.productName} src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />)}
            {extra > 0 ? <span className="account-more-thumb">+{extra}</span> : null}
          </div>
          <div>
            {order.items.slice(0, 3).map((item) => <p key={item.productName}>{item.productName}</p>)}
            {extra > 0 ? <p className="muted">+{extra} sản phẩm nữa</p> : null}
          </div>
        </div>
      </div>
      <div className="account-order-side">
        <strong>{money(order.total)}</strong>
        <Link className="btn-dark" to={`/account/orders/${order.code}`}>Xem chi tiết →</Link>
      </div>
    </article>
  );
}

function orderBadge(status: string) {
  if (status === "Cancelled") return "badge badge-red";
  if (status === "Pending") return "badge badge-amber";
  if (status === "Shipped" || status === "Processing") return "badge badge-blue";
  return "badge badge-green";
}

function NavLink({ to, orders = false, wish = false, icon, children }: { to: string; orders?: boolean; wish?: boolean; icon: ReactNode; children: string }) {
  const location = useLocation();
  const active = orders ? location.pathname.startsWith("/account/orders") : wish ? location.pathname.includes("wishlist") : location.pathname === to;
  return <Link className={active ? "active" : ""} to={to}>{icon}{children}</Link>;
}

function PencilIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.2 3.2 12.8 6.8 5.6 14H2v-3.6z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}

function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function BoxNavIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5.5 8 3l5.5 2.5v5.5L8 13.5 2.5 11z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function PinNavIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13.5s3.6-2.9 3.6-5.5a3.6 3.6 0 1 0-7.2 0c0 2.6 3.6 5.5 3.6 5.5z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="7.8" r="1" fill="currentColor" /></svg>;
}

function HeartNavIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13s-4.5-2.7-4.5-5.4A2.4 2.4 0 0 1 8 6a2.4 2.4 0 0 1 4.5 1.6C12.5 10.3 8 13 8 13z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function LockNavIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function StatBagIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 6.2h10l-.8 8H4.8z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 6.2V5a2 2 0 0 1 4 0v1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function ShieldNavIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2.8 14.2 5v4.2c0 3-2.1 4.8-5.2 6-3.1-1.2-5.2-3-5.2-6V5z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

export function OrderDetailPage() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<Order>(`/api/orders/${code}`).then(setOrder).catch(() => setOrder(null)).finally(() => setReady(true));
  }, [code]);

  async function cancel() {
    try {
      setOrder(await apiJson<Order>(`/api/orders/${code}/cancel`, { method: "POST" }));
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không hủy được đơn.");
    }
  }

  const country = order?.country === "Vietnam" ? "Việt Nam" : order?.country;
  const when = order ? new Date(order.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "";

  return (
    <AccountShell crumb={code}>
      {!ready ? <p className="empty-note">Đang tải đơn...</p> : null}
      {ready && !order ? <p className="empty-note">Không thấy đơn này.</p> : null}
      {order ? (
        <article className="panel pad account-detail">
          <div className="account-panel-head">
            <div>
              <h2>Đơn {order.code}</h2>
              <p className="muted">Đặt lúc {when}</p>
            </div>
            <span className={orderBadge(order.status)}>{statusText(order.status)}</span>
          </div>
          <div className="detail-lines">
            {order.items.map((item) => (
              <div key={`${item.productName}-${item.configurationName}`} className="detail-line">
                <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
                <div>
                  <strong>{item.productName}</strong>
                  <p className="muted">{item.configurationName} · {item.quantity}</p>
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="detail-totals">
            <p className="summary-row"><span>Tạm tính</span><span>{money(order.subtotal)}</span></p>
            {(order.discount ?? 0) > 0 ? <p className="summary-row"><span>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ""}</span><span>-{money(order.discount)}</span></p> : null}
            <p className="summary-row"><span>Vận chuyển</span><span>{order.shippingFee === 0 ? "Miễn phí" : money(order.shippingFee)}</span></p>
            <p className="summary-strong"><span>Tổng</span><span>{money(order.total)}</span></p>
          </div>
          <p className="pay-plain"><strong>Thanh toán khi nhận hàng</strong><span className="muted">Chưa thu tiền online.</span></p>
          <p className="ship-plain"><PinIcon /><span><strong>{order.recipientName}</strong><span className="muted">{order.phone}</span><span className="muted">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}</span><span className="muted">{order.city}, {order.state} {order.postalCode}</span><span className="muted">{country}</span></span></p>
          {error ? <p className="status-bad">{error}</p> : null}
          <div className="detail-actions">
            <Link className="btn-line" to="/account/orders">Về lịch sử đơn</Link>
            {order.status === "Pending" ? <button className="btn-red" type="button" onClick={cancel}>Hủy đơn</button> : null}
          </div>
        </article>
      ) : null}
    </AccountShell>
  );
}

export function AddressesPage() {
  const empty = { id: 0, recipientName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "Vietnam", isDefault: false };
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState(empty);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { apiJson<Address[]>("/api/account/addresses").then(setAddresses).catch(() => setAddresses([])); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiJson("/api/account/addresses", { method: "POST", body: JSON.stringify(form) });
      setAddresses(await apiJson<Address[]>("/api/account/addresses"));
      setForm(empty);
      setNote(form.id ? "Đã cập nhật địa chỉ." : "Đã lưu địa chỉ.");
    } catch (caught) {
      setNote("");
      setError(caught instanceof ApiError ? caught.message : "Không lưu được địa chỉ.");
    }
  }

  async function remove(id: number) {
    setError("");
    try {
      await apiJson(`/api/account/addresses/${id}`, { method: "DELETE" });
      setAddresses(await apiJson<Address[]>("/api/account/addresses"));
      if (form.id === id) setForm(empty);
      setNote("Đã xóa địa chỉ.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không xóa được địa chỉ.");
    }
  }

  return (
    <AccountShell crumb="Địa chỉ">
      <div className="account-panel-head">
        <div>
          <h2>Địa chỉ</h2>
          <p className="muted">Địa chỉ đã lưu dùng khi đặt hàng.</p>
        </div>
      </div>
      <div className="address-book">
        <div className="address-list">
          {addresses.length === 0 ? <p className="empty-note">Chưa có địa chỉ đã lưu.</p> : null}
          {addresses.map((address) => (
            <article key={address.id} className="panel pad address-card">
              <p><strong>{address.recipientName}</strong> {address.isDefault ? <span className="badge badge-green">Mặc định</span> : null}</p>
              <p>{address.phone}</p>
              <p>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}</p>
              <p className="muted">{address.city}, {address.state} {address.postalCode}</p>
              <div className="address-actions">
                <button className="btn-blue" type="button" onClick={() => { setForm({ ...address, addressLine2: address.addressLine2 ?? "" }); setNote(""); setError(""); }}>Sửa</button>
                <button className="btn-red" type="button" onClick={() => remove(address.id)}>Xóa</button>
              </div>
            </article>
          ))}
        </div>
        <form className="panel pad account-form" onSubmit={save}>
          <h2>{form.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}</h2>
          {([
            ["recipientName", "Người nhận"],
            ["phone", "Số điện thoại"],
            ["addressLine1", "Địa chỉ"],
            ["addressLine2", "Địa chỉ 2"],
            ["city", "Thành phố"],
            ["state", "Tỉnh / thành"],
            ["postalCode", "Mã bưu chính"],
            ["country", "Quốc gia"],
          ] as const).map(([key, label]) => (
            <label key={key} className="field"><span>{label}{key === "addressLine2" ? "" : " *"}</span><input value={form[key] ?? ""} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required={key !== "addressLine2"} /></label>
          ))}
          <label className="check-line"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Đặt làm địa chỉ mặc định</label>
          {note ? <p className="status-ok">{note}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
          <div className="detail-actions">
            <button className="btn-green" type="submit">{form.id ? "Cập nhật" : "Lưu địa chỉ"}</button>
            {form.id ? <button className="btn-line" type="button" onClick={() => setForm(empty)}>Hủy sửa</button> : null}
          </div>
        </form>
      </div>
    </AccountShell>
  );
}

export function SecurityPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    try {
      await apiJson("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage("Đã đổi mật khẩu. Website không gửi email.");
    } catch (caught) {
      const text = caught instanceof ApiError ? caught.message : "";
      setError(text.includes("password") ? "Mật khẩu hiện tại chưa đúng, hoặc mật khẩu mới chưa đủ điều kiện." : "Không đổi được mật khẩu.");
    }
  }

  return (
    <AccountShell crumb="Bảo mật">
      <form className="panel pad account-form" onSubmit={submit}>
        <h2>Bảo mật</h2>
        <p className="muted">Mật khẩu mới tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        <label className="field"><span>Mật khẩu hiện tại *</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrent(event.target.value)} required /></label>
        <label className="field"><span>Mật khẩu mới *</span><input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNext(event.target.value)} required /></label>
        <label className="field"><span>Nhập lại mật khẩu mới *</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirm(event.target.value)} required /></label>
        {message ? <p className="status-ok">{message}</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
        <button className="btn-dark" type="submit">Đổi mật khẩu</button>
      </form>
    </AccountShell>
  );
}

export function WishlistPage() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const cart = useCart();
  const wishes = useWishlist();
  useEffect(() => { apiJson<ProductCard[]>("/api/account/wishlist").then(setItems).catch(() => setItems([])); }, [wishes.ids]);
  const shown = wishes.ready ? items.filter((item) => wishes.has(item.id)) : items;

  return (
    <AccountShell crumb="Yêu thích">
      <div className="account-panel-head">
        <div>
          <h2>Yêu thích</h2>
          <p className="muted">Bấm lại icon tim trên máy để bỏ yêu thích.</p>
        </div>
      </div>
      {shown.length === 0 ? <p className="empty-note">Chưa có laptop yêu thích. <Link to="/laptops">Xem laptop</Link></p> : null}
      <div className="wish-grid">
        {shown.map((item) => (
          <ProductCardView key={item.id} product={item} onAdd={(product) => cart.add(product.variantId)} />
        ))}
      </div>
    </AccountShell>
  );
}

export function OrderSuccessPage() {
  const { code = "" } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiJson<Order>(`/api/orders/${code}`).then(setOrder).catch(() => setMissing(true));
  }, [code]);

  async function copyCode() {
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
    setCopied(true);
  }

  const when = order ? new Date(order.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "";
  const country = order?.country === "Vietnam" ? "Việt Nam" : order?.country;

  return (
    <section className="page success-page">
      <div className="success-mark" aria-hidden="true"><span><CheckIcon /></span></div>
      <h1>Đặt hàng thành công</h1>
      <p className="muted success-lead">Cảm ơn bạn đã mua tại {brandName}. Đơn đã được tạo và đang chờ xác nhận. Chưa thu tiền online.</p>
      <div className="order-code">
        <span>Mã đơn</span>
        <strong>{code}</strong>
        <button type="button" aria-label="Chép mã đơn" onClick={copyCode}>{copied ? "Đã chép" : <CopyIcon />}</button>
      </div>
      {missing ? <p className="checkout-login">Không thấy đơn này. Hãy <Link to="/login" state={{ background: location }}>đăng nhập</Link> bằng tài khoản đã đặt.</p> : null}
      {order ? (
        <article className="panel success-card">
          <div className="success-items">
            <h2>Tóm tắt đơn</h2>
            <p className="muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm · Đặt lúc {when}</p>
            {order.items.map((item) => (
              <div key={`${item.productName}-${item.configurationName}`} className="success-line">
                <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
                <div>
                  <strong>{item.productName}</strong>
                  <p className="muted">{item.configurationName}</p>
                  <p className="muted">Số lượng: {item.quantity}</p>
                </div>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="success-side">
            <div className={order.status === "Cancelled" ? "success-status bad" : "success-status"}>
              <BoxIcon />
              <div>
                <strong>{statusText(order.status)}</strong>
                <span className="muted">{statusNote(order.status)}</span>
              </div>
            </div>
            <p className="summary-row"><span>Tạm tính ({order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm)</span><span>{money(order.subtotal)}</span></p>
            {(order.discount ?? 0) > 0 ? <p className="summary-row"><span>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ""}</span><span className="status-ok">-{money(order.discount)}</span></p> : null}
            <p className="summary-row"><span>Vận chuyển</span><span>{order.shippingFee === 0 ? "Miễn phí" : money(order.shippingFee)}</span></p>
            <p className="summary-strong"><span>Tổng</span><span>{money(order.total)}</span></p>
            <h3>Thanh toán</h3>
            <p className="pay-plain"><strong>Thanh toán khi nhận hàng</strong><span className="muted">Chưa thu tiền online.</span></p>
            <h3>Địa chỉ giao hàng</h3>
            <p className="ship-plain"><PinIcon /><span><strong>{order.recipientName}</strong><span className="muted">{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ""}</span><span className="muted">{order.city}, {order.state} {order.postalCode}</span><span className="muted">{country}</span></span></p>
          </div>
        </article>
      ) : null}
      <div className="success-actions">
        <Link className="btn-dark" to="/account/orders"><DocIcon /> Xem đơn <ArrowIcon /></Link>
        <Link className="btn-line" to="/laptops"><BagIcon /> Tiếp tục mua <ArrowIcon /></Link>
      </div>
      <div className="success-notes">
        <p><MailIcon /><span><strong>Chưa gửi email</strong><span className="muted">Mã đơn nằm trong tài khoản.</span></span></p>
        <p><TruckIcon /><span><strong>Theo dõi đơn</strong><span className="muted">Trạng thái cập nhật trong lịch sử đơn.</span></span></p>
        <p><HelpIcon /><span><strong>Cần hỗ trợ?</strong><Link to="/support">Liên hệ hỗ trợ →</Link></span></p>
      </div>
    </section>
  );
}

function statusNote(status: string) {
  if (status === "Pending") return "Đơn đang chờ xác nhận. Chưa thu tiền online.";
  if (status === "Shipped") return "Đơn đang trên đường giao.";
  if (status === "Delivered") return "Đơn đã giao.";
  if (status === "Cancelled") return "Đơn đã hủy.";
  return "Đơn đang được xử lý.";
}

function CheckIcon() {
  return <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 14.5 12 19.5 21 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="8" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M4 11H3.4A1.4 1.4 0 0 1 2 9.6V3.4A1.4 1.4 0 0 1 3.4 2h6.2A1.4 1.4 0 0 1 11 3.4V4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function BoxIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 6.2 9 3.5l6 2.7v6.2L9 15.1 3 12.4zM3 6.2 9 9l6-2.8M9 9v6.1" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}

function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 15.2s4.2-3.4 4.2-6.4a4.2 4.2 0 1 0-8.4 0c0 3 4.2 6.4 4.2 6.4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="9" cy="8.6" r="1.3" fill="currentColor" /></svg>;
}

function DocIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h5.2L12.5 5.8V13.5H4z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M9 2.6V6h3.4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function BagIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 5.2h9.6l-.7 7.2H3.9z" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 5.2V4a2 2 0 0 1 4 0v1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function MailIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.4" y="4.2" width="13.2" height="9.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3 5.2 9 9.6l6-4.4" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function TruckIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6h8.2v6.2H2zM10.2 8.2h2.6L15 10.5v1.7h-4.8" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="5.2" cy="13.6" r="1" fill="currentColor" /><circle cx="12.4" cy="13.6" r="1" fill="currentColor" /></svg>;
}

function HelpIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.2 9.2a4.8 4.8 0 0 1 9.6 0v2.2a1.4 1.4 0 0 1-1.4 1.4H11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><circle cx="9" cy="14.4" r="0.7" fill="currentColor" /></svg>;
}

export function ComparePage() {
  const [picks, setPicks] = useState(readCompare());
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const cart = useCart();
  useEffect(() => {
    Promise.all(picks.map((pick) => getProduct(pick.slug).catch(() => null))).then((result) => setProducts(result.filter((item): item is ProductDetail => item !== null)));
  }, [picks]);

  const slots = [0, 1, 2];
  const chosen = slots.map((index) => products[index] ?? null);
  return (
    <>
      <section className="compare-hero">
        <div>
          <h1>So sánh laptop</h1>
          <p>Đặt các máy cạnh nhau để thấy khác biệt. Tối đa 3 máy, chỉ lưu trên trình duyệt này.</p>
        </div>
        <img src={`${apiBaseUrl}/catalog/apple-macbook-air-13-m3.jpg`} alt="" loading="lazy" />
      </section>
      <section className="page compare-page">
        <div className="compare-points">
          <div><CompareIcon kind="search" /><div><strong>Chọn dễ hơn</strong><span className="muted">Đối chiếu thông số trên cùng một bảng</span></div></div>
          <div><CompareIcon kind="shield" /><div><strong>Số liệu từ kho</strong><span className="muted">Giá, tồn kho và cấu hình đang bán</span></div></div>
          <div><CompareIcon kind="scale" /><div><strong>Thấy chỗ hơn kém</strong><span className="muted">Ô xanh cao hơn, ô hồng thấp hơn khi so được bằng số</span></div></div>
        </div>
        {products.length === 0 ? <div className="empty-note">Bấm So sánh ở trang laptop để thêm máy.</div> : null}
        <div className="compare-grid">
          {chosen.map((product, index) => {
            if (!product) {
              return <Link key={`empty-${index}`} className="compare-card compare-empty" to="/laptops">Thêm laptop</Link>;
            }
            const pick = picks.find((item) => item.slug === product.slug);
            const variant = product.variants.find((item) => item.id === pick?.variantId) ?? product.variants[0];
            const onSale = variant.compareAtPrice !== null && variant.compareAtPrice > variant.price;
            const saved = onSale ? (variant.compareAtPrice ?? 0) - variant.price : 0;
            const badge = compareBadge(product, onSale);
            return (
              <article key={product.id} className="compare-card">
                <div className="compare-card-top">
                  {badge ? <span className={badge.className}>{badge.text}</span> : <span />}
                  <button type="button" className="compare-remove" aria-label={`Bỏ ${product.name}`} onClick={() => setPicks(removeCompare(product.slug))}>×</button>
                </div>
                <img src={`${apiBaseUrl}${product.images[0] ?? ""}`} alt={product.name} loading="lazy" />
                <h2>{product.name}</h2>
                <p className="stars">{stars(product.rating)} <span>({product.reviewCount})</span></p>
                <p className="price-row">
                  <span className={onSale ? "price price-sale" : "price"}>{money(variant.price)}</span>
                  {onSale ? <span className="price-old">{money(variant.compareAtPrice ?? 0)}</span> : null}
                  {onSale ? <span className="save-note">Tiết kiệm {money(saved)}</span> : null}
                </p>
                <button className="btn-dark card-button" type="button" disabled={variant.stockQuantity < 1} onClick={() => cart.add(variant.id)}>
                  <CompareIcon kind="cart" /> {variant.stockQuantity > 0 ? "Thêm vào giỏ" : "Hết hàng"}
                </button>
              </article>
            );
          })}
        </div>
        {products.length > 0 ? (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Thông số</th>
                  {chosen.map((product, index) => <th key={product?.id ?? `head-${index}`}>{product?.name ?? ""}</th>)}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => {
                  const values = chosen.map((product) => product ? valueFor(product, row.slug, picks.find((item) => item.slug === product.slug)?.variantId) : "");
                  return (
                    <tr key={row.slug}>
                      <th><span className="cmp-label"><CompareIcon kind={row.icon} />{row.label}</span></th>
                      {values.map((value, index) => (
                        <td key={`${row.slug}-${index}`} className={cellTone(row.slug, values, index)}>{value || "—"}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="compare-foot">
          <div>
            <h2>Chưa chốt được?</h2>
            <p className="muted">Xem thêm laptop trong kho, hoặc gửi câu hỏi ở trang hỗ trợ.</p>
          </div>
          <div className="button-row">
            <Link className="btn-dark" to="/laptops">Xem tất cả laptop</Link>
            <Link className="btn-line" to="/support">Nhờ tư vấn</Link>
          </div>
        </div>
      </section>
    </>
  );
}

const compareRows = [
  { slug: "cpu", label: "CPU", icon: "cpu" },
  { slug: "gpu", label: "GPU", icon: "gpu" },
  { slug: "ram", label: "RAM", icon: "ram" },
  { slug: "storage", label: "Ổ cứng", icon: "storage" },
  { slug: "display", label: "Màn hình", icon: "display" },
  { slug: "refresh-rate", label: "Tần số quét", icon: "refresh" },
  { slug: "weight", label: "Khối lượng", icon: "weight" },
  { slug: "battery", label: "Pin", icon: "battery" },
  { slug: "ports", label: "Cổng kết nối", icon: "ports" },
  { slug: "warranty", label: "Bảo hành", icon: "warranty" },
];

function compareBadge(product: ProductDetail, onSale: boolean) {
  if (onSale) return { text: "Giảm giá", className: "badge badge-hot" };
  if (product.isFeatured) return { text: "Bán chạy", className: "badge badge-dark" };
  if (product.isNew) return { text: "Mới", className: "badge badge-green" };
  if (product.categories[0]) return { text: product.categories[0], className: "badge badge-blue" };
  return null;
}

function valueFor(product: ProductDetail, slug: string, variantId?: number) {
  const variant = product.variants.find((item) => item.id === variantId) ?? product.variants[0];
  if (!variant) return "";
  if (slug === "display") return ["display-size", "resolution", "panel"].map((item) => specOf(product, variant, item)).filter(Boolean).join(" · ");
  return specOf(product, variant, slug);
}

function cellTone(slug: string, values: string[], index: number) {
  const higher = slug === "ram" || slug === "storage" || slug === "refresh-rate" || slug === "battery";
  const lower = slug === "weight";
  if (!higher && !lower) return "";
  const scores = values.map((value) => measure(slug, value));
  const present = scores.filter((score): score is number => score !== null);
  if (present.length < 2) return "";
  const best = higher ? Math.max(...present) : Math.min(...present);
  const worst = higher ? Math.min(...present) : Math.max(...present);
  if (best === worst || scores[index] === null) return "";
  if (scores[index] === best) return "cmp-best";
  if (scores[index] === worst) return "cmp-weak";
  return "";
}

function measure(slug: string, value: string) {
  const match = value.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  let amount = Number(match[1]);
  const text = value.toLowerCase();
  if ((slug === "storage" || slug === "ram") && text.includes("tb")) amount *= 1024;
  return amount;
}

function CompareIcon({ kind }: { kind: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 18 18", "aria-hidden": true as const };
  if (kind === "cart") {
    return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h1.4l1.2 7.2a1 1 0 0 0 1 .8h6.2a1 1 0 0 0 1-.8L14 4.5H4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><circle cx="6.2" cy="13.2" r="1" fill="currentColor" /><circle cx="11.2" cy="13.2" r="1" fill="currentColor" /></svg>;
  }
  if (kind === "search") return <svg {...common}><circle cx="8" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M11.2 11.2 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
  if (kind === "shield") return <svg {...common}><path d="M9 2.2 14.2 4.2v4.6c0 2.8-2.1 4.8-5.2 6.4-3.1-1.6-5.2-3.6-5.2-6.4V4.2z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
  if (kind === "scale") return <svg {...common}><path d="M9 3v12M5 15h8M9 4.5 4.5 8.5M9 4.5 13.5 8.5M3.2 8.5h2.6M12.2 8.5h2.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "cpu") return <svg {...common}><rect x="5.5" y="5.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7.2 3.2v2M10.8 3.2v2M7.2 12.8v2M10.8 12.8v2M3.2 7.2h2M3.2 10.8h2M12.8 7.2h2M12.8 10.8h2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "gpu") return <svg {...common}><rect x="2.5" y="5" width="13" height="8" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="9" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
  if (kind === "ram") return <svg {...common}><rect x="3" y="5" width="12" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 13v1.5M9 13v1.5M12 13v1.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "storage") return <svg {...common}><rect x="3" y="4" width="12" height="10" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 7h6M6 10h4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "display") return <svg {...common}><rect x="2.5" y="3.5" width="13" height="8.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M7 14.5h4M9 12v2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "refresh") return <svg {...common}><path d="M5 6.5H3.2V4.5M3.6 6.5a5.2 5.2 0 1 1-.8 3.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "weight") return <svg {...common}><path d="M6 4.5h6l1.2 2.2H4.8zM4 7h10v6.2H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
  if (kind === "battery") return <svg {...common}><rect x="2.5" y="6" width="11.5" height="6.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M14 8v2.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  if (kind === "ports") return <svg {...common}><rect x="3" y="6" width="12" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 8.2v1.6M9 8.2v1.6M12 8.2v1.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
  return <svg {...common}><path d="M9 2.2 14.2 4.2v4.6c0 2.8-2.1 4.8-5.2 6.4-3.1-1.6-5.2-3.6-5.2-6.4V4.2z" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function specOf(product: ProductDetail, variant: Variant, slug: string) {
  return variant.specifications.find((spec) => spec.slug === slug)?.value
    ?? product.specifications.find((spec) => spec.slug === slug)?.value
    ?? "";
}

export function ContentPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<{ title: string; body: string } | null>(null);
  useEffect(() => { apiJson<{ title: string; body: string }>(`/api/pages/${slug}`).then(setPage).catch(() => setPage(null)); }, [slug]);
  return <section className="page narrow"><h1 className="page-title">{page?.title ?? "Trang"}</h1><p>{page?.body}</p></section>;
}
