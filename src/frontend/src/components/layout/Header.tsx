import { useState, type FormEvent } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthProvider";
import { useCart } from "../../cart/CartProvider";
import { brandName } from "../../catalog/labels";

const links = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/laptops", label: "Laptop" },
  { to: "/brands", label: "Thương hiệu" },
  { to: "/deals", label: "Ưu đãi" },
  { to: "/support", label: "Hỗ trợ" },
];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/laptops?search=${encodeURIComponent(term)}` : "/laptops");
    setOpen(false);
  }

  return (
    <header className="site-header">
      <button className="menu-toggle" type="button" aria-label="Mở menu" onClick={() => setOpen((value) => !value)}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <NavLink to="/" className="logo" onClick={() => setOpen(false)}>{brandName}</NavLink>
      <nav className={open ? "main-nav open" : "main-nav"}>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setOpen(false)}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <form className={open ? "search-box open" : "search-box"} onSubmit={search}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm laptop, hãng..."
          aria-label="Tìm laptop"
        />
      </form>
      <div className="header-actions">
        {session?.roles.includes("Admin") ? (
          <NavLink to="/admin" className="icon-btn" aria-label="Tổng quan">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M2.5 2.5h5.5v5.5H2.5zM10 2.5h5.5v3.5H10zM10 8h5.5v7.5H10zM2.5 10h5.5v5.5H2.5z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </NavLink>
        ) : null}
        <NavLink to="/account/wishlist" className="icon-btn" aria-label="Yêu thích">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 15.2 3.2 9.6a3.6 3.6 0 0 1 5.1-5.1L9 5.2l.7-.7a3.6 3.6 0 0 1 5.1 5.1z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </NavLink>
        {session ? (
          <NavLink to="/account" className="icon-btn" aria-label="Tài khoản">
            <AccountIcon />
          </NavLink>
        ) : (
          <button className="icon-btn" type="button" aria-label="Đăng nhập" onClick={() => navigate("/login", { state: { background: location } })}>
            <AccountIcon />
          </button>
        )}
        <NavLink to="/cart" className="icon-btn" aria-label="Giỏ hàng">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3 4h1.4l1.2 7.2h8.2l1.2-5H5.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="7.5" cy="14.5" r="1" />
            <circle cx="13" cy="14.5" r="1" />
          </svg>
          {cart.count > 0 ? <span className="cart-count">{cart.count}</span> : null}
        </NavLink>
      </div>
    </header>
  );
}

function AccountIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="6" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 15.5c1.2-2.4 3.1-3.5 5.5-3.5s4.3 1.1 5.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
