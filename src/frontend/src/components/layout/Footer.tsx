import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { apiBaseUrl } from "../../api/client";
import { brandName } from "../../catalog/labels";

const columns = [
  {
    title: "Mua sắm",
    links: [
      ["Laptop", "/laptops"],
      ["Thương hiệu", "/brands"],
      ["Ưu đãi", "/deals"],
      ["So sánh", "/compare"],
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      ["Trung tâm trợ giúp", "/support"],
      ["Theo dõi đơn", "/account/orders"],
      ["Đổi trả", "/pages/returns"],
      ["Bảo hành", "/pages/warranty"],
    ],
  },
  {
    title: "Công ty",
    links: [
      ["Về chúng tôi", "/pages/about"],
      ["Chính sách riêng tư", "/pages/privacy"],
      ["Điều khoản", "/pages/terms"],
      ["Liên hệ", "/support"],
    ],
  },
];

export function Footer() {
  const [note, setNote] = useState("");

  function subscribe(event: FormEvent) {
    event.preventDefault();
    setNote("Ưu đãi được đăng trên trang Ưu đãi. Website chưa gửi email.");
  }

  return (
    <footer className="site-footer">
      <section className="setup-banner">
        <div className="setup-copy">
          <h2>Nâng cấp góc làm việc</h2>
          <p>Laptop cho học tập, công việc và giải trí.</p>
          <Link className="btn-light" to="/laptops">
            Xem laptop
            <ArrowIcon />
          </Link>
        </div>
        <div className="setup-visual">
          <img src={`${apiBaseUrl}/catalog/apple-macbook-pro-14-m4.jpg`} alt="" loading="lazy" />
        </div>
      </section>
      <div className="footer-grid">
        <div>
          <Link to="/" className="logo">{brandName}</Link>
          <p>Laptop rõ cấu hình, cho học tập và công việc.</p>
          <div className="socials" aria-hidden="true">
            <FacebookIcon />
            <InstagramIcon />
            <YoutubeIcon />
            <XIcon />
            <LinkedInIcon />
          </div>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3>{column.title}</h3>
            <div className="footer-links">
              {column.links.map(([label, to]) => (
                <Link key={label} to={to}>{label}</Link>
              ))}
            </div>
          </div>
        ))}
        <div>
          <h3>Nhận ưu đãi</h3>
          <p>Ưu đãi hiện trên website. Chưa gửi email.</p>
          <form className="newsletter" onSubmit={subscribe}>
            <input type="email" required placeholder="Nhập email" aria-label="Email nhận ưu đãi" />
            <button type="submit" aria-label="Gửi"><ArrowIcon /></button>
          </form>
          {note ? <p className="newsletter-note">{note}</p> : null}
        </div>
      </div>
      <div className="legal">
        <span>© {new Date().getFullYear()} {brandName}. Giữ mọi quyền.</span>
        <nav>
          <Link to="/pages/privacy">Chính sách riêng tư</Link>
          <Link to="/pages/terms">Điều khoản</Link>
          <Link to="/support">Hỗ trợ</Link>
        </nav>
        <span>Chọn laptop rõ thông số, rõ tồn kho.</span>
      </div>
    </footer>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M9.2 14V8.7h1.8l.3-2H9.2V5.4c0-.6.2-1 1-1h1V2.6c-.2 0-.8-.1-1.5-.1-1.5 0-2.5.9-2.5 2.6v1.6H5.4v2h1.8V14h2z" fill="currentColor" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.5" cy="4.5" r="0.7" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="1.6" y="4" width="12.8" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 6.2 10.2 8 7 9.8z" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3.2 3.2h2.1l2.4 3.2 2.6-3.2h2.3l-3.8 4.6 4.2 5h-2.2L7.8 9.2 5 12.8H2.8l4-4.8z" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.6 7.1v4.2M4.6 4.8v.1M7 11.3V7.1c0-1.1.6-1.6 1.5-1.6s1.4.6 1.4 1.6v4.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
