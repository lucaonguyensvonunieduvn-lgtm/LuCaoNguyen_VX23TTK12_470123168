import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, NavLink, Outlet, useNavigate, useParams, useSearchParams } from "react-router";
import { apiBaseUrl, apiJson, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { money } from "../catalog/format";
import { brandName, statusText, stockText } from "../catalog/labels";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DashOrder = { code: string; recipientName: string; total: number; status: string; createdAt: string; paymentMethod: string; items: { productName: string; imageUrl: string }[] };
type Dashboard = {
  revenue: number;
  orders: number;
  customers: number;
  lowStock: number;
  trend: { date: string; revenue: number; orders: number }[];
  revenueByBrand: { name: string; revenue: number }[];
  recentOrders: DashOrder[];
  lowStockProducts: { name: string; category: string; imageUrl: string; stock: number }[];
  topProducts: { name: string; imageUrl?: string; price: number; sold: number; revenue: number }[];
};

export function AdminLayout() {
  const { session, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  if (!ready) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!session.roles.includes("Admin")) return <section className="page"><h1>Bạn không có quyền vào khu vực này.</h1></section>;
  const initial = (session.fullName || "A").trim().charAt(0).toUpperCase();
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link to="/" className="logo light-logo">{brandName}</Link>
        <nav>
          <NavLink to="/admin" end><DashIcon />Tổng quan</NavLink>
          <NavLink to="/admin/products"><BoxIcon />Sản phẩm</NavLink>
          <NavLink to="/admin/brands"><TagIcon />Thương hiệu</NavLink>
          <NavLink to="/admin/categories"><GridIcon />Danh mục</NavLink>
          <NavLink to="/admin/orders"><CartIcon />Đơn hàng</NavLink>
          <NavLink to="/admin/customers"><UsersIcon />Khách hàng</NavLink>
          <NavLink to="/admin/vouchers"><TicketIcon />Mã giảm giá</NavLink>
          <NavLink to="/admin/reviews"><StarIcon />Đánh giá</NavLink>
          <NavLink to="/admin/reports"><ChartIcon />Báo cáo</NavLink>
        </nav>
        <Link className="admin-promo" to="/">
          <img src={`${apiBaseUrl}/catalog/apple-macbook-pro-14-m4.jpg`} alt="" loading="lazy" />
          <span>Xem cửa hàng</span>
        </Link>
        <button className="btn-line" type="button" onClick={() => { logout(); navigate("/"); }}>Đăng xuất</button>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <form onSubmit={(event) => { event.preventDefault(); navigate(`/admin/orders?search=${encodeURIComponent(term)}`); }}>
            <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Tìm đơn, khách..." aria-label="Tìm trong quản trị" />
          </form>
          <div className="admin-user">
            <span>{initial}</span>
            <div><strong>{session.fullName}</strong><small>Quản trị</small></div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Dashboard | null>(null);
  const [previous, setPrevious] = useState<Dashboard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([
      apiJson<Dashboard>(`/api/admin/dashboard?${bounds(days)}`),
      apiJson<Dashboard>(`/api/admin/dashboard?${bounds(days, days)}`),
    ]).then(([current, prior]) => {
      if (cancelled) return;
      setData(current);
      setPrevious(prior);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [days]);

  if (failed) return <p className="pad">Không tải được tổng quan.</p>;
  if (!data) return <p className="pad">Đang tải tổng quan...</p>;
  const brandTotal = data.revenueByBrand.reduce((sum, item) => sum + item.revenue, 0);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));

  return (
    <section className="dash-page">
      <div className="dash-head">
        <div>
          <p className="muted">Xin chào</p>
          <h1>Tổng quan</h1>
          <p className="muted">Doanh thu tính đơn đã xác nhận, đang xử lý, đang giao và đã giao.</p>
        </div>
        <label className="dash-range">
          <span>{start.toLocaleDateString("vi-VN")} – {end.toLocaleDateString("vi-VN")}</span>
          <select aria-label="Khoảng thời gian" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>7 ngày</option>
            <option value={30}>30 ngày</option>
            <option value={90}>90 ngày</option>
          </select>
        </label>
      </div>
      <div className="dash-kpis">
        <Kpi label="Doanh thu" value={money(data.revenue)} note={changeText(data.revenue, previous?.revenue)} series={data.trend.map((point) => point.revenue)} color="#2563eb" />
        <Kpi label="Đơn hàng" value={String(data.orders)} note={changeText(data.orders, previous?.orders)} series={data.trend.map((point) => point.orders)} color="#7c3aed" />
        <Kpi label="Khách hàng" value={String(data.customers)} note="Toàn bộ tài khoản" color="#16a34a" />
        <Kpi label="Sắp hết hàng" value={String(data.lowStock)} note="Còn từ 5 máy trở xuống" color="#e11d48" />
      </div>
      <div className="dash-split">
        <article className="panel pad">
          <h2>Xu hướng bán</h2>
          <p className="muted">Doanh thu và số đơn trong kỳ.</p>
          <div className="chart">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.trend}>
                <CartesianGrid stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={24} />
                <YAxis yAxisId="revenue" tickFormatter={shortMoney} width={48} />
                <YAxis yAxisId="orders" orientation="right" allowDecimals={false} width={28} />
                <Tooltip labelFormatter={(label) => dayLabel(String(label))} formatter={(value, name) => [name === "Doanh thu" ? money(Number(value)) : value, name]} />
                <Bar yAxisId="orders" dataKey="orders" name="Đơn" fill="#c4b5fd" radius={[4, 4, 0, 0]} barSize={8} />
                <Area yAxisId="revenue" dataKey="revenue" name="Doanh thu" stroke="#2563eb" fill="#93c5fd" fillOpacity={0.35} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel pad">
          <div className="account-panel-head">
            <h2>Doanh thu theo hãng</h2>
            <Link to="/admin/reports">Xem báo cáo</Link>
          </div>
          {brandTotal === 0 ? <p className="muted">Chưa có doanh thu trong kỳ.</p> : (
            <div className="donut-wrap">
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={data.revenueByBrand} dataKey="revenue" nameKey="name" innerRadius={68} outerRadius={88} paddingAngle={2}>
                    {data.revenueByBrand.map((item) => <Cell key={item.name} fill={brandColor(item.name)} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center"><strong>{money(brandTotal)}</strong><span>Doanh thu</span></div>
            </div>
          )}
          <div className="brand-share">
            {data.revenueByBrand.map((item) => (
              <p key={item.name}><i className={`swatch swatch-${item.name.toLowerCase()}`} /><span>{item.name}</span><strong>{money(item.revenue)}</strong><span>{brandTotal === 0 ? "0%" : `${Math.round(item.revenue / brandTotal * 1000) / 10}%`}</span></p>
            ))}
          </div>
        </article>
      </div>
      <article className="panel pad dash-orders">
        <div className="account-panel-head">
          <div><h2>Đơn gần đây</h2><p className="muted">Đơn mới trong kỳ.</p></div>
          <Link to="/admin/orders">Xem tất cả đơn</Link>
        </div>
          <div className="table-wrap">
            <table className="data-table dash-table">
              <thead><tr><th>Mã</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.code}>
                    <td><Link to={`/admin/orders/${order.code}`}>{order.code}</Link></td>
                    <td>{order.recipientName}</td>
                    <td>{order.items[0] ? <img src={`${apiBaseUrl}${order.items[0].imageUrl}`} alt="" loading="lazy" /> : null}</td>
                    <td>{money(order.total)}</td>
                    <td>Khi nhận hàng</td>
                    <td><span className={orderBadge(order.status)}>{statusText(order.status)}</span></td>
                    <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        {data.recentOrders.length === 0 ? <p className="muted">Chưa có đơn trong kỳ.</p> : null}
      </article>
      <div className="dash-split">
        <article className="panel pad">
          <div className="account-panel-head">
            <h2>Sắp hết hàng</h2>
            <Link to="/admin/products">Xem sản phẩm</Link>
          </div>
          <div className="low-list">
            {data.lowStockProducts.map((item, index) => (
              <div key={`${item.name}-${index}`} className="low-row">
                <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
                <div>
                  <strong>{item.name}</strong>
                  <span className="muted">{item.category}</span>
                  <svg className="stock-meter" viewBox="0 0 100 6" aria-hidden="true">
                    <rect className="stock-track" x="0" y="1" width="100" height="4" rx="2" />
                    <rect className={item.stock <= 2 ? "stock-fill hot" : "stock-fill"} x="0" y="1" width={Math.min(100, (item.stock / 5) * 100)} height="4" rx="2" />
                  </svg>
                </div>
                <span>còn {item.stock}</span>
              </div>
            ))}
          </div>
          {data.lowStockProducts.length === 0 ? <p className="muted">Không có máy sắp hết.</p> : null}
        </article>
        <article className="panel pad">
        <div className="account-panel-head">
          <h2>Bán chạy</h2>
          <Link to="/admin/reports">Xem báo cáo</Link>
        </div>
        <div className="low-list">
          {data.topProducts.map((item, index) => (
            <div key={item.name} className="low-row">
              {item.imageUrl ? <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" /> : <span />}
              <div>
                <strong>{index + 1}. {item.name}</strong>
                <span className="muted">{money(item.price)} · đã bán {item.sold} · {money(item.revenue)}</span>
              </div>
            </div>
          ))}
        </div>
        {data.topProducts.length === 0 ? <p className="muted">Chưa có máy bán trong kỳ.</p> : null}
        </article>
      </div>
    </section>
  );
}

function Kpi({ label, value, note, series, color }: { label: string; value: string; note?: string | null; series?: number[]; color: string }) {
  return (
    <article className="panel dash-kpi">
      <p className="muted">{label}</p>
      <strong>{value}</strong>
      {note ? <span className="muted">{note}</span> : null}
      {series && series.some((item) => item > 0) ? (
        <div className="spark">
          <ResponsiveContainer width="100%" height={46}>
            <ComposedChart data={series.map((item, index) => ({ index, item }))}>
              <Line dataKey="item" stroke={color} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </article>
  );
}

function bounds(days: number, shift = 0) {
  const to = new Date();
  to.setUTCHours(0, 0, 0, 0);
  to.setUTCDate(to.getUTCDate() + 1 - shift);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
}

function changeText(current: number, previous?: number) {
  if (previous === undefined || previous === 0) return null;
  const value = Math.round(((current - previous) / previous) * 1000) / 10;
  return `${value > 0 ? "+" : ""}${value}% so với kỳ trước`;
}

function dayLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function shortMoney(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} tr`;
  return String(value);
}

function brandColor(name: string) {
  const colors: Record<string, string> = { Apple: "#111827", Dell: "#2563eb", Lenovo: "#e11d48", ASUS: "#f59e0b", HP: "#16a34a", Acer: "#65a30d", MSI: "#7c3aed", Microsoft: "#0891b2" };
  return colors[name] ?? "#6b7280";
}

function orderBadge(status: string) {
  if (status === "Cancelled") return "badge badge-red";
  if (status === "Pending") return "badge badge-amber";
  if (status === "Shipped" || status === "Processing") return "badge badge-blue";
  return "badge badge-green";
}

function DashIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2.5h5v5H2zM9 2.5h5v3H9zM9 7.5h5v6H9zM2 9.5h5v4H2z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
function BoxIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5.5 8 3l5.5 2.5v5.5L8 13.5 2.5 11z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
function TagIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.2 7.8 3h4.7v4.7L7 13.2z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="2" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /><rect x="9" y="9" width="5" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}
function CartIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h1.4l1.1 6.4h6.6l1-4.1H4.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}
function UsersIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="6" cy="5.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2.8 12.5a3.2 3.2 0 0 1 6.4 0M10 6.2a1.8 1.8 0 0 1 0 3.2M11 12.5a3 3 0 0 0-1.2-2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}
function TicketIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 5.2A1.2 1.2 0 0 1 3.7 4h8.6a1.2 1.2 0 0 1 1.2 1.2v1.1a1.6 1.6 0 0 0 0 3.2v1.3a1.2 1.2 0 0 1-1.2 1.2H3.7a1.2 1.2 0 0 1-1.2-1.2V9.5a1.6 1.6 0 0 0 0-3.2z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
function StarIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 9.5 6h3.7L10.6 8.3 11.8 12 8 9.8 4.2 12l1.2-3.7L2.8 6H6.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>;
}
function ChartIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 12.5h11M4 10l2.4-3 2.2 1.6L12 4.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

type ProductRow = { id: number; name: string; brandName: string; categoryName: string; sku: string; specLine: string; imageUrl: string; price: number; compareAtPrice: number | null; stock: number; stockLabel: string; isActive: boolean };
type ProductPage = { items: ProductRow[]; page: number; pageSize: number; total: number };
type CatalogStats = { total: number; active: number; outOfStock: number; drafts: number };
type NameOption = { name: string; slug: string };

export function AdminProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [brands, setBrands] = useState<NameOption[]>([]);
  const [categories, setCategories] = useState<NameOption[]>([]);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(8);
  const [picked, setPicked] = useState<number[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);

  function query(pageNumber: number, term = search) {
    const params = new URLSearchParams({ search: term, brand, category, status, page: String(pageNumber) });
    return apiJson<ProductPage>(`/api/admin/products?${params}`);
  }

  function load(pageNumber = page, term = search) {
    setFailed(false);
    query(pageNumber, term).then((result) => {
      setRows(result.items);
      setPage(result.page);
      setPageSize(result.pageSize);
      setTotal(result.total);
      setPicked([]);
      setPendingId(null);
    }).catch(() => setFailed(true));
  }

  useEffect(() => {
    apiJson<CatalogStats>("/api/admin/stats").then(setStats).catch(() => setStats(null));
    apiJson<NameOption[]>("/api/admin/brands").then(setBrands).catch(() => setBrands([]));
    apiJson<NameOption[]>("/api/admin/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => { load(1); }, [brand, category, status]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pending = rows.find((row) => row.id === pendingId);

  async function disable(ids: number[]) {
    await Promise.all(ids.map((id) => apiJson(`/api/admin/products/${id}`, { method: "DELETE" })));
    setNote("Đã xử lý. Máy đã nằm trong đơn thì chỉ ngừng bán.");
    const statsNext = await apiJson<CatalogStats>("/api/admin/stats");
    setStats(statsNext);
    load(page);
  }

  async function exportFile() {
    const first = await query(1);
    const pageCount = Math.max(1, Math.ceil(first.total / first.pageSize));
    const rest = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => query(index + 2)));
    const items = [first, ...rest].flatMap((result) => result.items);
    const header = ["Tên", "SKU", "Hãng", "Danh mục", "Thông số", "Giá", "Giá niêm yết", "Tồn", "Trạng thái"];
    const lines = [header, ...items.map((row) => [row.name, row.sku, row.brandName, row.categoryName, row.specLine, String(row.price), row.compareAtPrice ? String(row.compareAtPrice) : "", String(row.stock), row.isActive ? "Đang bán" : "Nháp"])];
    const csv = `\uFEFF${lines.map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "san-pham.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin/products">Sản phẩm</Link><span>/</span><span>Tất cả</span></p>
      <div className="catalog-head">
        <div>
          <h1>Quản lý sản phẩm</h1>
          <p className="muted">Sửa máy, theo dõi tồn kho. Số liệu lấy từ danh mục đang có.</p>
        </div>
        <div className="catalog-actions">
          <button className="btn-line" type="button" onClick={() => exportFile()}><DownloadIcon />Xuất file</button>
          <Link className="btn-dark" to="/admin/products/new"><PlusIcon />Thêm sản phẩm</Link>
        </div>
      </div>
      <div className="catalog-kpis">
        <article className="panel catalog-kpi"><span className="kpi-icon"><BoxIcon /></span><div><span className="muted">Tổng sản phẩm</span><strong>{stats?.total ?? "—"}</strong><span className="muted">Cả danh mục</span></div></article>
        <article className="panel catalog-kpi"><span className="kpi-icon green"><CheckIcon /></span><div><span className="muted">Đang bán</span><strong>{stats?.active ?? "—"}</strong><span className="muted">Đang hiện bán</span></div></article>
        <article className="panel catalog-kpi"><span className="kpi-icon red"><AlertIcon /></span><div><span className="muted">Hết hàng</span><strong>{stats?.outOfStock ?? "—"}</strong><span className="muted">Tồn bằng 0</span></div></article>
        <article className="panel catalog-kpi"><span className="kpi-icon amber"><EyeIcon /></span><div><span className="muted">Nháp</span><strong>{stats?.drafts ?? "—"}</strong><span className="muted">Đã tắt bán</span></div></article>
      </div>
      <form className="catalog-tools" onSubmit={(event) => { event.preventDefault(); load(1); }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, hãng, SKU..." aria-label="Tìm sản phẩm" />
        <select aria-label="Hãng" value={brand} onChange={(event) => setBrand(event.target.value)}>
          <option value="">Mọi hãng</option>
          {brands.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
        <select aria-label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">Mọi danh mục</option>
          {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
        <select aria-label="Trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="draft">Nháp</option>
          <option value="out">Hết hàng</option>
        </select>
      </form>
      {note ? <p className="status-ok">{note}</p> : null}
      {failed ? <p className="status-bad">Không tải được danh sách.</p> : null}
      {pending ? (
        <div className="catalog-confirm">
          <span>Tắt {pending.name}? Máy đã nằm trong đơn thì chỉ ngừng bán.</span>
          <button className="btn-red" type="button" onClick={() => disable([pending.id])}>Tắt</button>
          <button className="btn-line" type="button" onClick={() => setPendingId(null)}>Để lại</button>
        </div>
      ) : null}
      {picked.length > 0 ? (
        <div className="catalog-confirm">
          <span>Đã chọn {picked.length} máy.</span>
          <button className="btn-red" type="button" onClick={() => disable(picked)}>Tắt đã chọn</button>
        </div>
      ) : null}
      <div className="catalog-table catalog-wide">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Chọn trang này" checked={rows.length > 0 && picked.length === rows.length} onChange={(event) => setPicked(event.target.checked ? rows.map((row) => row.id) : [])} /></th>
              <th>Sản phẩm</th><th>Hãng</th><th>Danh mục</th><th>Thông số</th><th>Giá</th><th>Tồn</th><th>Trạng thái</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><input type="checkbox" aria-label={`Chọn ${row.name}`} checked={picked.includes(row.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, row.id] : picked.filter((id) => id !== row.id))} /></td>
                <td>
                  <div className="product-cell">
                    <img src={`${apiBaseUrl}${row.imageUrl}`} alt="" loading="lazy" />
                    <span><strong>{row.name}</strong><span className="muted">{row.sku}</span></span>
                  </div>
                </td>
                <td className="brand-cell">{row.brandName}</td>
                <td>{row.categoryName}</td>
                <td><div className="spec">{row.specLine.split(" | ").filter(Boolean).map((part) => <span key={part}>{part}</span>)}</div></td>
                <td><div className="price-cell"><strong>{money(row.price)}</strong>{row.compareAtPrice && row.compareAtPrice > row.price ? <span className="price-old">{money(row.compareAtPrice)}</span> : null}</div></td>
                <td><div className="stock-cell"><strong className={stockClass(row.stockLabel)}>{row.stock}</strong><span className="muted">{stockText(row.stockLabel)}</span></div></td>
                <td><span className={row.isActive ? "badge badge-green" : "badge badge-amber"}>{row.isActive ? "Đang bán" : "Nháp"}</span></td>
                <td>
                  <div className="row-actions">
                    <Link className="icon-act edit" to={`/admin/products/${row.id}`} aria-label={`Sửa ${row.name}`}><PencilIcon /></Link>
                    <button className="icon-act delete" type="button" aria-label={`Tắt ${row.name}`} onClick={() => setPendingId(row.id)}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty-note">Không có máy khớp bộ lọc.</p> : null}
        <div className="catalog-pager">
          <span className="muted">{total} máy · trang {page}/{pages}</span>
          <div className="button-row">
            <button className="btn-line" type="button" disabled={page <= 1} onClick={() => load(page - 1)}>Trước</button>
            <button className="btn-line" type="button" disabled={page >= pages} onClick={() => load(page + 1)}>Sau</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function stockClass(label: string) {
  if (label === "Out of stock") return "stock-out";
  if (label === "Low stock") return "stock-low";
  return "stock-good";
}

function DownloadIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M7.5 2.5v7M4.8 7.2 7.5 10l2.7-2.8M3 12.5h9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2.5v9M2.5 7h9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 9.2 7.2 12.5 14 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
function AlertIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 5.5v4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function EyeIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 9s2.6-4 7-4 7 4 7 4-2.6 4-7 4-7-4-7-4z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="9" cy="9" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}
function PencilIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M9 3.2 11.8 6 5.2 12.6H2.4V9.8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}
function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><path d="M3 4.2h9M5.8 4.2V3h3.4v1.2M4.4 4.2l.5 8h5.2l.5-8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

type Brand = { id: number; name: string; slug: string };
type Category = { id: number; name: string; slug: string };
type Attribute = { slug: string; value: string };

export function ProductEditorPage() {
  const { id } = useParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "", brandId: 0, categoryIds: [] as number[], shortDescription: "", description: "",
    isFeatured: false, isNew: false, isActive: true, imageUrls: [] as string[],
    specifications: [] as { slug: string; value: string }[],
    variants: [{ sku: "", configurationName: "", colorName: "Black", colorHex: "#111111", price: 0, compareAtPrice: null as number | null, stockQuantity: 0, isActive: true, specifications: [{ slug: "cpu", value: "" }, { slug: "gpu", value: "" }, { slug: "ram", value: "" }, { slug: "storage", value: "" }] }],
  });

  useEffect(() => {
    apiJson<Brand[]>("/api/admin/brands").then((items) => { setBrands(items); setForm((current) => ({ ...current, brandId: current.brandId || items[0]?.id || 0 })); });
    apiJson<Category[]>("/api/admin/categories").then(setCategories);
    apiJson<Attribute[]>("/api/admin/attributes").then(setAttributes);
    if (id && id !== "new") {
      apiJson<typeof form>(`/api/admin/products/${id}`).then(setForm);
    }
  }, [id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const path = id && id !== "new" ? `/api/admin/products/${id}` : "/api/admin/products";
    const method = id && id !== "new" ? "PUT" : "POST";
    try {
      await apiJson(path, { method, body: JSON.stringify(form) });
      setMessage("Đã lưu. Cửa hàng đọc dữ liệu từ SQL Server.");
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Không lưu được.");
    }
  }

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    const result = await apiJson<{ url: string }>("/api/admin/uploads", { method: "POST", body });
    setForm((current) => ({ ...current, imageUrls: [...current.imageUrls, result.url] }));
  }

  const variant = form.variants[0];
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin/products">Sản phẩm</Link><span>/</span><span>{id === "new" || !id ? "Thêm" : "Sửa"}</span></p>
      <div className="catalog-head">
        <div>
          <h1>{id === "new" || !id ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h1>
          <p className="muted">Giá và tồn lưu vào SQL Server. Ảnh tải lên máy chủ.</p>
        </div>
      </div>
      <form className="panel pad admin-form" onSubmit={save}>
        <label className="drop">Ảnh sản phẩm
          <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} />
        </label>
        <label className="field">Tên sản phẩm<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label className="field">Hãng
          <select value={form.brandId} onChange={(event) => setForm({ ...form, brandId: Number(event.target.value) })}>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <div className="filter-group wide">
          <strong>Danh mục</strong>
          {categories.map((category) => (
            <label key={category.id} className="check-line">
              <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => setForm({ ...form, categoryIds: form.categoryIds.includes(category.id) ? form.categoryIds.filter((item) => item !== category.id) : [...form.categoryIds, category.id] })} />
              {category.name}
            </label>
          ))}
        </div>
        <label className="field wide">Mô tả ngắn<textarea value={form.shortDescription} onChange={(event) => setForm({ ...form, shortDescription: event.target.value })} /></label>
        <label className="field wide">Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="field">SKU<input value={variant.sku} onChange={(event) => updateVariant({ sku: event.target.value })} required /></label>
        <label className="field">Cấu hình<input value={variant.configurationName} onChange={(event) => updateVariant({ configurationName: event.target.value })} required /></label>
        <label className="field">Giá<input type="number" value={variant.price} onChange={(event) => updateVariant({ price: Number(event.target.value) })} required /></label>
        <label className="field">Giá gốc<input type="number" value={variant.compareAtPrice ?? ""} onChange={(event) => updateVariant({ compareAtPrice: event.target.value ? Number(event.target.value) : null })} /></label>
        <label className="field">Tồn kho<input type="number" value={variant.stockQuantity} onChange={(event) => updateVariant({ stockQuantity: Number(event.target.value) })} required /></label>
        {variant.specifications.map((spec, index) => (
          <label key={spec.slug} className="field">{attributes.find((item) => item.slug === spec.slug)?.value ?? spec.slug}
            <input value={spec.value} onChange={(event) => {
              const specifications = variant.specifications.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item);
              updateVariant({ specifications });
            }} />
          </label>
        ))}
        <div className="wide check-row">
          <label className="check-line"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Đang bán</label>
          <label className="check-line"><input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} /> Nổi bật</label>
          <label className="check-line"><input type="checkbox" checked={form.isNew} onChange={(event) => setForm({ ...form, isNew: event.target.checked })} /> Mới</label>
        </div>
        {message ? <p className="wide">{message}</p> : null}
        <button className="btn-green wide" type="submit">Lưu sản phẩm</button>
      </form>
    </section>
  );

  function updateVariant(patch: Partial<(typeof form.variants)[number]>) {
    setForm((current) => ({ ...current, variants: [{ ...current.variants[0], ...patch }, ...current.variants.slice(1)] }));
  }
}

export function NameAdminPage({ kind }: { kind: "brands" | "categories" }) {
  const title = kind === "brands" ? "Thương hiệu" : "Danh mục";
  const [rows, setRows] = useState<{ id: number; name: string; slug: string; productCount: number; isActive: boolean }[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  async function load() { setRows(await apiJson(`/api/admin/${kind}`)); }
  useEffect(() => { load(); }, [kind]);
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin/products">Sản phẩm</Link><span>/</span><span>{title}</span></p>
      <div className="catalog-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{rows.length} mục. Máy đang tham chiếu thì chỉ tắt, không xóa.</p>
        </div>
      </div>
      <form className="catalog-tools" onSubmit={async (event) => { event.preventDefault(); await apiJson(`/api/admin/${kind}`, { method: "POST", body: JSON.stringify({ name, isActive: true, sortOrder: rows.length + 1 }) }); setName(""); setNote("Đã thêm."); load(); }}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "brands" ? "Tên hãng" : "Tên danh mục"} required aria-label="Tên" />
        <button className="btn-green" type="submit">Thêm</button>
      </form>
      {note ? <p className="status-ok">{note}</p> : null}
      <div className="catalog-table">
        <table>
          <thead><tr><th>Tên</th><th>Đường dẫn</th><th>Số máy</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong></td>
                <td className="muted">{row.slug}</td>
                <td>{row.productCount}</td>
                <td><span className={row.isActive ? "badge badge-green" : "badge badge-amber"}>{row.isActive ? "Đang bật" : "Đã tắt"}</span></td>
                <td>{row.isActive ? <button className="btn-red" type="button" onClick={async () => { await apiJson(`/api/admin/${kind}/${row.id}`, { method: "DELETE" }); setNote("Đã xử lý."); load(); }}>Tắt</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty-note">Chưa có mục.</p> : null}
      </div>
    </section>
  );
}

type AdminOrder = { code: string; recipientName: string; email: string; status: string; paymentStatus: string; subtotal: number; shippingFee: number; discount: number; total: number; createdAt: string; items: { productName: string; quantity: number; lineTotal: number; configurationName: string; imageUrl: string }[]; nextStatuses: string[]; addressLine1: string; city: string; phone: string; paymentMethod: string };
type OrderPage = { items: AdminOrder[]; page: number; pageSize: number; total: number };
type OrderBoard = { total: number; pending: number; confirmed: number; processing: number; shipped: number; delivered: number; cancelled: number; revenue: number };

const orderTabs = [
  { value: "", label: "Tất cả", count: (board: OrderBoard) => board.total },
  { value: "Pending", label: "Chờ xác nhận", count: (board: OrderBoard) => board.pending },
  { value: "Confirmed", label: "Đã xác nhận", count: (board: OrderBoard) => board.confirmed },
  { value: "Processing", label: "Đang xử lý", count: (board: OrderBoard) => board.processing },
  { value: "Shipped", label: "Đang giao", count: (board: OrderBoard) => board.shipped },
  { value: "Delivered", label: "Đã giao", count: (board: OrderBoard) => board.delivered },
  { value: "Cancelled", label: "Đã hủy", count: (board: OrderBoard) => board.cancelled },
];

export function AdminOrdersPage() {
  const [params] = useSearchParams();
  const [board, setBoard] = useState<OrderBoard | null>(null);
  const [result, setResult] = useState<OrderPage>({ items: [], page: 1, pageSize: 10, total: 0 });
  const [status, setStatus] = useState("");
  const [days, setDays] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [term, setTerm] = useState(params.get("search") ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const opened = useRef(false);

  useEffect(() => {
    apiJson<OrderBoard>("/api/admin/orders/board").then(setBoard).catch(() => setBoard(null));
  }, [result]);

  useEffect(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    if (days > 0) {
      const from = new Date();
      from.setDate(from.getDate() - (days - 1));
      const to = new Date();
      to.setDate(to.getDate() + 1);
      query.set("from", dayStamp(from));
      query.set("to", dayStamp(to));
    }
    apiJson<OrderPage>(`/api/admin/orders?${query}`).then((pageResult) => {
      setResult(pageResult);
      if (!opened.current && pageResult.items[0]) {
        opened.current = true;
        setSelected(pageResult.items[0].code);
      }
    }).catch(() => setResult({ items: [], page: 1, pageSize: 10, total: 0 }));
  }, [search, status, days, page, pageSize]);

  const open = result.items.find((order) => order.code === selected) ?? null;
  const pages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const fromRow = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const toRow = Math.min(result.total, result.page * result.pageSize);

  async function changeStatus(order: AdminOrder, next: string) {
    try {
      const updated = await apiJson<AdminOrder>(`/api/admin/orders/${order.code}/status`, { method: "PUT", body: JSON.stringify({ status: next }) });
      setResult((current) => ({ ...current, items: current.items.map((item) => item.code === updated.code ? updated : item) }));
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không cập nhật được.");
    }
  }

  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin">Tổng quan</Link><span>/</span><span>Đơn hàng</span></p>
      <div className="catalog-head">
        <div>
          <h1>Đơn hàng</h1>
          <p className="muted">Xem và xử lý đơn của khách. Thanh toán khi nhận hàng, chưa thu tiền online.</p>
        </div>
      </div>
      <div className="order-kpis">
        <article className="panel catalog-kpi"><span className="kpi-icon"><CartIcon /></span><span><strong>{board?.total ?? 0}</strong><span className="muted">Tất cả đơn</span></span></article>
        <article className="panel catalog-kpi"><span className="kpi-icon amber"><ClockIcon /></span><span><strong>{board?.pending ?? 0}</strong><span className="muted">Chờ xác nhận</span></span></article>
        <article className="panel catalog-kpi"><span className="kpi-icon"><TruckIcon /></span><span><strong>{board?.shipped ?? 0}</strong><span className="muted">Đang giao</span></span></article>
        <article className="panel catalog-kpi"><span className="kpi-icon green"><CheckIcon /></span><span><strong>{board?.delivered ?? 0}</strong><span className="muted">Đã giao</span></span></article>
        <article className="panel catalog-kpi"><span className="kpi-icon violet"><CoinIcon /></span><span><strong>{money(board?.revenue ?? 0)}</strong><span className="muted">Doanh thu đã xác nhận</span></span></article>
      </div>
      <div className="order-tabs" role="tablist">
        {orderTabs.map((tab) => (
          <button key={tab.label} type="button" className={status === tab.value ? "current" : ""} onClick={() => { setStatus(tab.value); setPage(1); }}>
            {tab.label}{board ? <span>{tab.count(board)}</span> : null}
          </button>
        ))}
      </div>
      <div className={open ? "order-layout open" : "order-layout"}>
        <div className="order-main">
          <div className="order-sheet">
            <form className="order-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(term.trim()); }}>
              <label className="order-search">
                <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Mã đơn, khách hoặc email" aria-label="Tìm đơn" />
                <SearchIcon />
              </label>
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Trạng thái">
                <option value="">Mọi trạng thái</option>
                {orderTabs.filter((tab) => tab.value).map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
              </select>
              <select value={days} onChange={(event) => { setDays(Number(event.target.value)); setPage(1); }} aria-label="Khoảng ngày">
                <option value={0}>Mọi ngày</option>
                <option value={7}>7 ngày</option>
                <option value={30}>30 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </form>
            <div className="catalog-table">
              <table className="orders-table">
                <thead><tr><th>Mã đơn</th><th>Khách</th><th>Máy</th><th>Tổng</th><th>Ngày</th><th className="col-pay">Thanh toán</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>
                  {result.items.map((order) => {
                    const when = new Date(order.createdAt);
                    return (
                      <tr key={order.code} className={selected === order.code ? "current" : ""} onClick={() => setSelected(order.code)}>
                        <td className="brand-cell"><strong>{order.code}</strong></td>
                        <td>
                          <span className="order-person">
                            <span className={`order-avatar ${avatarTone(order.recipientName)}`}>{initials(order.recipientName)}</span>
                            <span><strong>{order.recipientName}</strong><span className="muted">{order.email}</span></span>
                          </span>
                        </td>
                        <td>
                          <span className="order-thumbs">
                            <span className="order-thumb-row">
                              {order.items.slice(0, 2).map((item) => <img key={`${item.productName}-${item.configurationName}`} src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />)}
                            </span>
                            <span className="muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)} máy</span>
                          </span>
                        </td>
                        <td className="price-cell"><strong>{money(order.total)}</strong></td>
                        <td className="order-when"><span>{when.toLocaleDateString("vi-VN")}</span><span className="muted">{when.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></td>
                        <td className="order-pay-cell col-pay"><span className="badge badge-blue">Khi nhận hàng</span><span className="muted">Chưa thu tiền online</span></td>
                        <td><span className={orderBadge(order.status)}>{statusText(order.status)}</span></td>
                        <td><button className="order-view" type="button" onClick={(event) => { event.stopPropagation(); setSelected(order.code); }}>Xem</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {result.items.length === 0 ? <p className="empty-note">Không có đơn khớp.</p> : null}
            </div>
            <div className="order-pager">
              <span className="muted">Hiển thị {fromRow}–{toRow} của {result.total} đơn</span>
              <span className="order-pages">
                <button type="button" className="page-btn step" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><PageChevron left /></button>
                {pageWindow(page, pages).map((item, index) => item === "gap" ? <span key={`gap-${index}`} className="order-gap">…</span> : (
                  <button key={item} type="button" className={item === page ? "page-btn current" : "page-btn"} aria-current={item === page ? "page" : undefined} onClick={() => setPage(item)}>{item}</button>
                ))}
                <button type="button" className="page-btn step" aria-label="Trang sau" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><PageChevron /></button>
              </span>
              <select className="order-size" aria-label="Số đơn mỗi trang" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>
        </div>
        {open ? <OrderDrawer order={open} error={error} onClose={() => setSelected(null)} onStatus={changeStatus} /> : null}
      </div>
    </section>
  );
}

function OrderDrawer({ order, error, onClose, onStatus }: { order: AdminOrder; error: string; onClose: () => void; onStatus: (order: AdminOrder, next: string) => void }) {
  const steps = [
    { key: "Pending", label: "Đã đặt" },
    { key: "Processing", label: "Đang xử lý" },
    { key: "Shipped", label: "Đang giao" },
    { key: "Delivered", label: "Đã giao" },
  ];
  const placed = new Date(order.createdAt);
  return (
    <aside className="panel order-drawer">
      <div className="order-drawer-head">
        <div>
          <h2>Đơn {order.code}</h2>
          <p className="muted">Đặt lúc {placed.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {placed.toLocaleDateString("vi-VN")}</p>
        </div>
        <button type="button" className="order-close" aria-label="Đóng" onClick={onClose}>×</button>
      </div>
      <p className="order-flags"><span className="badge badge-blue">Khi nhận hàng</span><span className={orderBadge(order.status)}>{statusText(order.status)}</span></p>
      <section className="order-block">
        <h3>Khách nhận</h3>
        <div className="order-customer">
          <span className={`order-avatar ${avatarTone(order.recipientName)}`}>{initials(order.recipientName)}</span>
          <span><strong>{order.recipientName}</strong><span className="muted">{order.email}</span></span>
        </div>
        <p className="order-meta"><PhoneIcon /> {order.phone}</p>
        <p className="order-meta"><PinIcon /> {order.addressLine1.trim()}, {order.city}</p>
      </section>
      <section className="order-block">
        <h3>Máy trong đơn ({order.items.reduce((sum, item) => sum + item.quantity, 0)})</h3>
        {order.items.map((item) => (
          <div className="order-line" key={`${item.productName}-${item.configurationName}`}>
            <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
            <span><strong>{item.productName}</strong><span className="muted">{item.configurationName}</span><span className="muted">SL {item.quantity}</span></span>
            <span className="order-money">{money(item.lineTotal)}</span>
          </div>
        ))}
        <p className="summary-row"><span>Tạm tính</span><span>{money(order.subtotal)}</span></p>
        <p className="summary-row"><span>Vận chuyển</span><span>{money(order.shippingFee)}</span></p>
        <p className="summary-row"><span>Giảm giá</span><span>{money(order.discount)}</span></p>
        <p className="summary-row summary-strong"><span>Tổng</span><span>{money(order.total)}</span></p>
      </section>
      <section className="order-block">
        <h3>Thanh toán</h3>
        <p className="order-flags"><span className="badge badge-blue">{payLabel(order.paymentMethod)}</span></p>
        <p className="muted">{order.paymentStatus === "Unpaid" ? "Chưa thu tiền online" : order.paymentStatus}</p>
      </section>
      <section className="order-block">
        <h3>Giao hàng</h3>
        <p className="order-ship-line"><span>{order.shippingFee === 0 ? "Miễn phí vận chuyển" : "Giao tiêu chuẩn"}</span><span className={orderBadge(order.status)}>{statusText(order.status)}</span></p>
        {order.status === "Cancelled" ? <p className="status-bad">Đơn đã hủy. Kho được hoàn nếu đơn từng trừ tồn.</p> : (
          <ol className="order-track">
            {steps.map((step) => {
              const state = trackState(order.status, step.key);
              return (
                <li key={step.key} className={state}>
                  <span className="dot" />
                  <span>{step.label}</span>
                  <span className="muted">{trackNote(order.status, step.key, order.createdAt)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      {error ? <p className="status-bad">{error}</p> : null}
      <div className="order-drawer-foot">
        <div className="button-row">
          {order.nextStatuses.map((next) => <button key={next} className={statusButton(next)} type="button" onClick={() => onStatus(order, next)}>{statusText(next)}</button>)}
        </div>
        <Link className="btn-dark" to={`/admin/orders/${order.code}`}>Xem đầy đủ</Link>
      </div>
    </aside>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length < 2 ? (parts[0] ?? "K").slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
}

function avatarTone(name: string) {
  const tones = ["tone-blue", "tone-rose", "tone-amber", "tone-green", "tone-violet"];
  const code = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[code % tones.length];
}

function trackNote(status: string, step: string, createdAt: string) {
  const state = trackState(status, step);
  if (state === "") return "";
  if (step === "Pending") return new Date(createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  if (state === "current") return "Đang ở đây";
  return "";
}

function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M10.4 10.4 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function PhoneIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.2 2.4h2L6.2 5 5 6.1a6 6 0 0 0 2.9 2.9L9 7.8l2.6 1v2A1 1 0 0 1 10.6 12 8.6 8.6 0 0 1 2 3.4a1 1 0 0 1 1.2-1z" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>;
}

function PinIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 12.2S2.6 8.2 2.6 5.6a4.4 4.4 0 1 1 8.8 0c0 2.6-4.4 6.6-4.4 6.6z" fill="none" stroke="currentColor" strokeWidth="1.2" /><circle cx="7" cy="5.6" r="1.3" fill="currentColor" /></svg>;
}

function pageWindow(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 4) [2, 3, 4, 5].forEach((number) => pages.add(number));
  if (current >= total - 3) [total - 4, total - 3, total - 2, total - 1].forEach((number) => pages.add(number));
  const sorted = [...pages].filter((number) => number >= 1 && number <= total).sort((left, right) => left - right);
  const window: Array<number | "gap"> = [];
  sorted.forEach((number, index) => {
    if (index > 0 && number - sorted[index - 1] > 1) window.push("gap");
    window.push(number);
  });
  return window;
}

function PageChevron({ left }: { left?: boolean }) {
  return <svg className={left ? "point-left" : ""} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function dayStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function trackState(status: string, step: string) {
  const rank: Record<string, number> = { Pending: 0, Confirmed: 0, Processing: 1, Shipped: 2, Delivered: 3 };
  const current = rank[status] ?? -1;
  const index = rank[step] ?? 0;
  if (current > index) return "done";
  if (current === index) return "current";
  return "";
}

function ClockIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 5.5V9l2.2 1.6" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function TruckIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5.5h8v6H2zM10 8h2.6L15 10.2V11.5h-5" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="5.2" cy="13" r="1" fill="currentColor" /><circle cx="12.2" cy="13" r="1" fill="currentColor" /></svg>;
}

function CoinIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M9 5.5v7M7.2 7.2c.4-.7 1-.9 1.8-.9 1 0 1.7.5 1.7 1.3S10 9 9 9s-1.8.4-1.8 1.4.8 1.4 1.8 1.4 1.5-.3 1.8-.9" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function statusButton(status: string) {
  if (status === "Cancelled") return "btn-red";
  if (status === "Pending") return "btn-amber";
  if (status === "Processing" || status === "Shipped") return "btn-blue";
  return "btn-green";
}

function payLabel(method: string) {
  return method === "Place order" || method === "COD" ? "Khi nhận hàng" : method;
}

export function AdminOrderDetailPage() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { apiJson<AdminOrder>(`/api/admin/orders/${code}`).then(setOrder); }, [code]);
  if (!order) return <p className="pad">Đang tải đơn...</p>;
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin/orders">Đơn hàng</Link><span>/</span><span>{order.code}</span></p>
      <div className="catalog-head">
        <div>
          <h1>{order.code}</h1>
          <p className="muted">{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
        </div>
        <span className={orderBadge(order.status)}>{statusText(order.status)}</span>
      </div>
      <div className="order-admin">
        <article className="panel order-lines">
          <h2>Máy trong đơn</h2>
          {order.items.map((item) => (
            <div className="order-line" key={`${item.productName}-${item.configurationName}`}>
              <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" />
              <span>
                <strong>{item.productName}</strong>
                <span className="muted">{item.configurationName}</span>
              </span>
              <span className="line-qty">{item.quantity}</span>
              <span className="order-money">{money(item.lineTotal)}</span>
            </div>
          ))}
        </article>
        <aside className="panel pad order-pay">
          <h2>Giao và tiền</h2>
          <p><strong>{order.recipientName}</strong></p>
          <p className="muted">{order.email}<br />{order.phone}</p>
          <p>{order.addressLine1}, {order.city}</p>
          <p className="summary-row"><span>Tạm tính</span><span>{money(order.subtotal)}</span></p>
          <p className="summary-row"><span>Vận chuyển</span><span>{money(order.shippingFee)}</span></p>
          <p className="summary-row"><span>Giảm giá</span><span>{money(order.discount)}</span></p>
          <p className="summary-row summary-strong"><span>Tổng</span><span>{money(order.total)}</span></p>
          <p className="muted">{payLabel(order.paymentMethod)} · {order.paymentStatus === "Unpaid" ? "Chưa thu tiền online" : order.paymentStatus}</p>
          {error ? <p className="status-bad">{error}</p> : null}
          <div className="button-row">
            {order.nextStatuses.map((next) => (
              <button key={next} className={statusButton(next)} type="button" onClick={async () => {
                try { setOrder(await apiJson(`/api/admin/orders/${code}/status`, { method: "PUT", body: JSON.stringify({ status: next }) })); }
                catch (caught) { setError(caught instanceof ApiError ? caught.message : "Không cập nhật được."); }
              }}>{statusText(next)}</button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

export function CustomersPage() {
  const [rows, setRows] = useState<{ id: string; fullName: string; email: string; orderCount: number; isLocked: boolean; createdAt: string }[]>([]);
  const [search, setSearch] = useState("");
  async function load(event?: FormEvent) {
    event?.preventDefault();
    setRows(await apiJson(`/api/admin/customers?search=${encodeURIComponent(search)}`));
  }
  useEffect(() => { load(); }, []);
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin">Tổng quan</Link><span>/</span><span>Khách hàng</span></p>
      <div className="catalog-head">
        <div>
          <h1>Khách hàng</h1>
          <p className="muted">{rows.length} tài khoản. Khóa thì không đăng nhập được.</p>
        </div>
      </div>
      <form className="catalog-tools" onSubmit={load}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc email" aria-label="Tìm khách" />
        <button className="btn-line" type="submit">Tìm</button>
      </form>
      <div className="catalog-table">
        <table>
          <thead><tr><th>Khách</th><th>Email</th><th>Đơn</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.fullName}</strong></td>
                <td>{row.email}</td>
                <td>{row.orderCount}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("vi-VN")}</td>
                <td><span className={row.isLocked ? "badge badge-red" : "badge badge-green"}>{row.isLocked ? "Đã khóa" : "Đang mở"}</span></td>
                <td><button type="button" className={row.isLocked ? "btn-green" : "btn-red"} onClick={async () => { await apiJson(`/api/admin/customers/${row.id}/${row.isLocked ? "unlock" : "lock"}`, { method: "POST" }); load(); }}>{row.isLocked ? "Mở khóa" : "Khóa"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty-note">Không có khách khớp.</p> : null}
      </div>
    </section>
  );
}

export function VouchersPage() {
  const [rows, setRows] = useState<{ id: number; code: string; discountType: string; discountValue: number; minOrderAmount: number; maxDiscount?: number | null; isActive: boolean; usedCount: number }[]>([]);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState("Percent");
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(0);
  async function load() { setRows(await apiJson("/api/admin/vouchers")); }
  useEffect(() => { load(); }, []);
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin">Tổng quan</Link><span>/</span><span>Mã giảm giá</span></p>
      <div className="catalog-head">
        <div>
          <h1>Mã giảm giá</h1>
          <p className="muted">Mã nhập ở trang thanh toán. Không tự trừ vào giỏ.</p>
        </div>
      </div>
      <form className="catalog-tools" onSubmit={async (event) => { event.preventDefault(); await apiJson("/api/admin/vouchers", { method: "POST", body: JSON.stringify({ code, discountType: kind, discountValue: value, minOrderAmount: minOrder, isActive: true }) }); setCode(""); load(); }}>
        <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Mã" required aria-label="Mã" />
        <select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Loại giảm">
          <option value="Percent">Phần trăm</option>
          <option value="Fixed">Số tiền</option>
        </select>
        <input type="number" value={value} onChange={(event) => setValue(Number(event.target.value))} aria-label="Mức giảm" />
        <input type="number" value={minOrder} onChange={(event) => setMinOrder(Number(event.target.value))} aria-label="Đơn tối thiểu" />
        <button className="btn-green" type="submit">Thêm mã</button>
      </form>
      <div className="catalog-table">
        <table>
          <thead><tr><th>Mã</th><th>Loại</th><th>Mức giảm</th><th>Đơn tối thiểu</th><th>Đã dùng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.code}</strong></td>
                <td>{row.discountType === "Percent" ? "Phần trăm" : "Số tiền"}</td>
                <td>{row.discountType === "Percent" ? `${row.discountValue}%` : money(row.discountValue)}{row.maxDiscount ? ` · tối đa ${money(row.maxDiscount)}` : ""}</td>
                <td>{row.minOrderAmount > 0 ? money(row.minOrderAmount) : "Không"}</td>
                <td>{row.usedCount}</td>
                <td><span className={row.isActive ? "badge badge-green" : "badge badge-amber"}>{row.isActive ? "Đang bật" : "Đã tắt"}</span></td>
                <td>{row.isActive ? <button className="btn-red" type="button" onClick={async () => { await apiJson(`/api/admin/vouchers/${row.id}`, { method: "DELETE" }); load(); }}>Tắt</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReviewsPage() {
  const [rows, setRows] = useState<{ id: number; productName: string; authorName: string; rating: number; comment: string; isVisible: boolean; createdAt: string }[]>([]);
  async function load() { setRows(await apiJson("/api/admin/reviews")); }
  useEffect(() => { load(); }, []);
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin">Tổng quan</Link><span>/</span><span>Đánh giá</span></p>
      <div className="catalog-head">
        <div>
          <h1>Đánh giá</h1>
          <p className="muted">Chỉ khách đã nhận hàng mới gửi được. Ẩn thì cửa hàng không hiện.</p>
        </div>
      </div>
      <div className="catalog-table">
        <table>
          <thead><tr><th>Máy</th><th>Khách</th><th>Điểm</th><th>Nội dung</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.productName}</strong></td>
                <td>{row.authorName}</td>
                <td>{row.rating}/5</td>
                <td className="spec">{row.comment}</td>
                <td>{new Date(row.createdAt).toLocaleDateString("vi-VN")}</td>
                <td><span className={row.isVisible ? "badge badge-green" : "badge badge-amber"}>{row.isVisible ? "Đang hiện" : "Đang ẩn"}</span></td>
                <td><button className={row.isVisible ? "btn-red" : "btn-green"} type="button" onClick={async () => { await apiJson(`/api/admin/reviews/${row.id}/visibility`, { method: "PUT", body: JSON.stringify({ isVisible: !row.isVisible }) }); load(); }}>{row.isVisible ? "Ẩn" : "Hiện"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty-note">Chưa có đánh giá.</p> : null}
      </div>
    </section>
  );
}

export function ReportsPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  async function load(event?: FormEvent) {
    event?.preventDefault();
    setData(await apiJson(`/api/admin/reports?brand=${encodeURIComponent(brand)}&status=${encodeURIComponent(status)}`));
  }
  useEffect(() => { load(); }, []);
  return (
    <section className="catalog-page">
      <p className="catalog-crumbs"><Link to="/admin">Tổng quan</Link><span>/</span><span>Báo cáo</span></p>
      <div className="catalog-head">
        <div>
          <h1>Báo cáo</h1>
          <p className="muted">Doanh thu tính đơn đã xác nhận, đang xử lý, đang giao và đã giao.</p>
        </div>
      </div>
      <form className="catalog-tools" onSubmit={load}>
        <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Tên hãng" aria-label="Hãng" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Trạng thái đơn">
          <option value="">Mọi trạng thái tính doanh thu</option>
          {["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"].map((item) => <option key={item} value={item}>{statusText(item)}</option>)}
        </select>
        <button className="btn-line" type="submit">Áp dụng</button>
      </form>
      <div className="catalog-kpis">
        <article className="panel catalog-kpi"><span className="kpi-icon"><ChartIcon /></span><div><span className="muted">Doanh thu</span><strong>{data ? money(data.revenue) : "—"}</strong><span className="muted">Trong bộ lọc</span></div></article>
        <article className="panel catalog-kpi"><span className="kpi-icon green"><CartIcon /></span><div><span className="muted">Đơn hàng</span><strong>{data?.orders ?? "—"}</strong><span className="muted">Khớp bộ lọc</span></div></article>
      </div>
      <div className="catalog-table">
        <table>
          <thead><tr><th>Máy</th><th>Đã bán</th><th>Doanh thu</th></tr></thead>
          <tbody>
            {data?.topProducts.map((item) => (
              <tr key={item.name}>
                <td>
                  <div className="product-cell">
                    {item.imageUrl ? <img src={`${apiBaseUrl}${item.imageUrl}`} alt="" loading="lazy" /> : null}
                    <span><strong>{item.name}</strong></span>
                  </div>
                </td>
                <td>{item.sold}</td>
                <td>{money(item.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.topProducts.length === 0 ? <p className="empty-note">Chưa có máy trong bộ lọc.</p> : null}
      </div>
    </section>
  );
}
