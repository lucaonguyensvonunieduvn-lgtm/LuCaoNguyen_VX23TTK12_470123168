import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { apiBaseUrl, apiJson, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { brandName } from "../catalog/labels";

const slides = [
  { src: "/catalog/apple-macbook-pro-14-m4.jpg", alt: "MacBook Pro 14" },
  { src: "/catalog/dell-xps-13-plus.jpg", alt: "Dell XPS 13 Plus" },
  { src: "/catalog/lenovo-thinkpad-x1-carbon.jpg", alt: "ThinkPad X1 Carbon" },
];

export function LoginPage() {
  const { login, session, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const authState = location.state as { background?: { pathname: string; search?: string }; next?: string } | null;
  const background = authState?.background;
  const next = authState?.next;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [socialNote, setSocialNote] = useState("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!ready || session) return;
    document.body.classList.add("overlay-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overlay-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [ready, session]);

  function close() {
    if (background?.pathname) navigate(background.pathname + (background.search ?? ""), { replace: true, state: { loginDismissed: true } });
    else navigate("/", { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSocialNote("");
    try {
      const account = await login(email, password, remember);
      const nextPath = next ?? (account.roles.includes("Admin") ? "/admin" : (background?.pathname ? background.pathname + (background.search ?? "") : "/"));
      navigate(nextPath, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không đăng nhập được.");
    }
  }

  if (!ready) return null;

  if (session) {
    const nextPath = next ?? (session.roles.includes("Admin") ? "/admin" : (background?.pathname ?? "/"));
    return <NavigateReplacement path={nextPath} />;
  }

  const photo = slides[slide];
  return (
    <div className="login-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="login-card" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <aside className="login-hero">
          <img src={`${apiBaseUrl}${photo.src}`} alt={photo.alt} loading="lazy" />
          <div className="login-shade" />
          <div className="login-hero-copy">
            <p className="login-kicker">Khám phá thêm</p>
            <h2>Bật ý tưởng của bạn</h2>
            <p>Laptop cho công việc, sáng tạo và mọi việc ở giữa.</p>
            <ul className="login-points">
              <li><span><ChipIcon /></span><strong>Hiệu năng rõ ràng</strong></li>
              <li><span><ScreenIcon /></span><strong>Màn hình sắc nét</strong></li>
              <li><span><NextIcon /></span><strong>Sẵn cho việc tiếp theo</strong></li>
            </ul>
            <div className="login-hero-foot">
              <div className="login-dots">
                {slides.map((item, index) => (
                  <button key={item.src} type="button" className={index === slide ? "current" : ""} aria-label={`Ảnh ${index + 1}`} onClick={() => setSlide(index)} />
                ))}
              </div>
              <p>Hơn một chiếc laptop.<br />Một ngày mai sáng hơn.</p>
            </div>
          </div>
        </aside>
        <form className="login-panel" onSubmit={submit}>
          <button className="login-close" type="button" aria-label="Đóng" onClick={close}>×</button>
          <h2 id="login-title">Chào mừng trở lại</h2>
          <p className="muted">Đăng nhập tài khoản {brandName} để tiếp tục mua sắm và theo dõi đơn.</p>
          <label className="login-field">Email
            <MailIcon />
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ban@email.com" autoComplete="email" required />
          </label>
          <label className="login-field">Mật khẩu
            <LockIcon />
            <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" autoComplete="current-password" required />
            <button className="login-eye" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}>
              <EyeIcon />
            </button>
          </label>
          <div className="login-row">
            <label className="login-remember"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Ghi nhớ đăng nhập</label>
            <Link to="/forgot-password" state={{ background: background?.pathname ? background : { pathname: "/" }, next }}>Quên mật khẩu?</Link>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
          <button className="btn-dark login-submit" type="submit">Đăng nhập <ArrowIcon /></button>
          <p className="login-or">Hoặc tiếp tục với</p>
          <div className="login-socials">
            <button type="button" onClick={() => setSocialNote("Đăng nhập bằng Apple, Google và Microsoft đang phát triển.")}><AppleMark /> Apple</button>
            <button type="button" onClick={() => setSocialNote("Đăng nhập bằng Apple, Google và Microsoft đang phát triển.")}><GoogleMark /> Google</button>
            <button type="button" onClick={() => setSocialNote("Đăng nhập bằng Apple, Google và Microsoft đang phát triển.")}><MicrosoftMark /> Microsoft</button>
          </div>
          {socialNote ? <p className="login-social-note">{socialNote}</p> : null}
          <p className="login-switch">Chưa có tài khoản? <Link to="/register" state={{ background: background?.pathname ? background : { pathname: "/" }, next }}>Tạo tài khoản</Link></p>
        </form>
      </div>
    </div>
  );
}

function NavigateReplacement({ path }: { path: string }) {
  const navigate = useNavigate();
  useEffect(() => { navigate(path, { replace: true }); }, [navigate, path]);
  return null;
}

function useAuthOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, ready } = useAuth();
  const authState = location.state as { background?: { pathname: string; search?: string }; next?: string } | null;
  const background = authState?.background;
  const next = authState?.next;

  function close() {
    if (background?.pathname) navigate(background.pathname + (background.search ?? ""), { replace: true, state: { loginDismissed: true } });
    else navigate("/", { replace: true });
  }

  useEffect(() => {
    if (!ready) return;
    document.body.classList.add("overlay-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overlay-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [ready]);

  const carried = { background: background?.pathname ? background : { pathname: "/" }, next };
  return { ready, session, background, next, close, carried };
}

function AuthFrame({ titleId, kicker, heading, lede, points, foot, close, children }: {
  titleId: string;
  kicker: string;
  heading: string;
  lede: string;
  points: { icon: ReactNode; label: string }[];
  foot: string;
  close: () => void;
  children: ReactNode;
}) {
  const [slide, setSlide] = useState(0);
  const photo = slides[slide];
  return (
    <div className="login-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="login-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <aside className="login-hero">
          <img src={`${apiBaseUrl}${photo.src}`} alt={photo.alt} loading="lazy" />
          <div className="login-shade" />
          <div className="login-hero-copy">
            <p className="login-kicker">{kicker}</p>
            <h2>{heading}</h2>
            <p>{lede}</p>
            <ul className="login-points">
              {points.map((point) => <li key={point.label}><span>{point.icon}</span><strong>{point.label}</strong></li>)}
            </ul>
            <div className="login-hero-foot">
              <div className="login-dots">
                {slides.map((item, index) => (
                  <button key={item.src} type="button" className={index === slide ? "current" : ""} aria-label={`Ảnh ${index + 1}`} onClick={() => setSlide(index)} />
                ))}
              </div>
              <p>{foot}</p>
            </div>
          </div>
        </aside>
        {children}
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const overlay = useAuthOverlay();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [socialNote, setSocialNote] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSocialNote("");
    if (password !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    if (!agree) {
      setError("Hãy đồng ý điều khoản trước khi tạo tài khoản.");
      return;
    }
    try {
      await register(fullName, email, password);
      overlay.close();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không tạo được tài khoản.");
    }
  }

  if (!overlay.ready) return null;
  if (overlay.session) return <NavigateReplacement path={overlay.next ?? overlay.background?.pathname ?? "/"} />;

  return (
    <AuthFrame
      titleId="register-title"
      kicker={`Tham gia ${brandName}`}
      heading="Cách mua rõ hơn"
      lede="Tạo tài khoản để theo dõi đơn, lưu máy yêu thích và đặt hàng gọn hơn."
      points={[
        { icon: <TagIcon />, label: "Ưu đãi đang mở" },
        { icon: <HeartIcon />, label: "Lưu máy yêu thích" },
        { icon: <CartIcon />, label: "Đặt hàng gọn hơn" },
      ]}
      foot={"Công nghệ rõ ràng\ncho ngày mai."}
      close={overlay.close}
    >
      <form className="login-panel" onSubmit={submit}>
        <button className="login-close" type="button" aria-label="Đóng" onClick={overlay.close}>×</button>
        <p className="login-kicker dark">Tạo tài khoản</p>
        <h2 id="register-title">Tham gia {brandName}</h2>
        <p className="muted">Nhanh và miễn phí. Tài khoản dùng để đặt hàng và xem đơn.</p>
        <label className="login-field">Họ tên
          <UserIcon />
          <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" required />
        </label>
        <label className="login-field">Email
          <MailIcon />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ban@email.com" autoComplete="email" required />
        </label>
        <label className="login-field">Mật khẩu
          <LockIcon />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="Tạo mật khẩu" autoComplete="new-password" required />
          <button className="login-eye" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}><EyeIcon /></button>
        </label>
        <label className="login-field">Nhập lại mật khẩu
          <LockIcon />
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type={showConfirm ? "text" : "password"} placeholder="Nhập lại mật khẩu" autoComplete="new-password" required />
          <button className="login-eye" type="button" aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowConfirm((value) => !value)}><EyeIcon /></button>
        </label>
        <p className="muted">Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        <label className="login-remember login-terms">
          <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} required />
          <span>Tôi đồng ý với <Link to="/pages/terms">Điều khoản</Link> và <Link to="/pages/privacy">Chính sách riêng tư</Link>.</span>
        </label>
        {error ? <p className="status-bad">{error}</p> : null}
        <button className="btn-dark login-submit" type="submit">Tạo tài khoản <ArrowIcon /></button>
        <p className="login-or">Hoặc tiếp tục với</p>
        <div className="login-socials">
          <button type="button" onClick={() => setSocialNote("Đăng ký bằng Apple, Google và Microsoft đang phát triển.")}><AppleMark /> Apple</button>
          <button type="button" onClick={() => setSocialNote("Đăng ký bằng Apple, Google và Microsoft đang phát triển.")}><GoogleMark /> Google</button>
          <button type="button" onClick={() => setSocialNote("Đăng ký bằng Apple, Google và Microsoft đang phát triển.")}><MicrosoftMark /> Microsoft</button>
        </div>
        {socialNote ? <p className="login-social-note">{socialNote}</p> : null}
        <p className="login-switch">Đã có tài khoản? <Link to="/login" state={overlay.carried}>Đăng nhập</Link></p>
      </form>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const overlay = useAuthOverlay();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await apiJson<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    setMessage("Nếu email này đã đăng ký, liên kết đặt lại hiện bên dưới. Website chưa gửi email.");
    setResetUrl(result.resetUrl ?? "");
  }

  if (!overlay.ready) return null;

  return (
    <AuthFrame
      titleId="forgot-title"
      kicker="Quên mật khẩu"
      heading="Lấy lại tài khoản"
      lede="Nhập email đã đăng ký. Liên kết đặt lại hiện trên màn hình. Website chưa gửi email."
      points={[
        { icon: <MailIcon />, label: "Dùng email đã đăng ký" },
        { icon: <LockIcon />, label: "Đặt mật khẩu mới" },
        { icon: <NextIcon />, label: "Rồi đăng nhập lại" },
      ]}
      foot={"Liên kết hiện tại đây.\nChưa gửi email."}
      close={overlay.close}
    >
      <form className="login-panel" onSubmit={submit}>
        <button className="login-close" type="button" aria-label="Đóng" onClick={overlay.close}>×</button>
        <p className="login-kicker dark">Quên mật khẩu</p>
        <h2 id="forgot-title">Lấy lại mật khẩu</h2>
        <p className="muted">Nhập email của tài khoản. Website chưa gửi email.</p>
        <label className="login-field">Email
          <MailIcon />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ban@email.com" autoComplete="email" required />
        </label>
        {message ? <p className="login-social-note">{message}</p> : null}
        {resetUrl ? <a className="login-reset" href={resetUrl}>Mở liên kết đặt lại</a> : null}
        <button className="btn-dark login-submit" type="submit">Hiện liên kết đặt lại <ArrowIcon /></button>
        <p className="login-switch">Đã nhớ mật khẩu? <Link to="/login" state={overlay.carried}>Đăng nhập</Link></p>
      </form>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const overlay = useAuthOverlay();
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    try {
      const result = await apiJson<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: params.get("email"), token: params.get("token"), password }),
      });
      setError("");
      setMessage(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Không đặt lại được mật khẩu.");
    }
  }

  if (!overlay.ready) return null;

  return (
    <AuthFrame
      titleId="reset-title"
      kicker="Mật khẩu mới"
      heading="Đặt lại mật khẩu"
      lede="Chọn mật khẩu mới cho tài khoản. Liên kết này chỉ dùng một lần."
      points={[
        { icon: <LockIcon />, label: "Mật khẩu mới" },
        { icon: <NextIcon />, label: "Đăng nhập lại" },
      ]}
      foot={"Chọn mật khẩu mới.\nRồi vào tài khoản."}
      close={overlay.close}
    >
      <form className="login-panel" onSubmit={submit}>
        <button className="login-close" type="button" aria-label="Đóng" onClick={overlay.close}>×</button>
        <p className="login-kicker dark">Mật khẩu mới</p>
        <h2 id="reset-title">Đặt lại mật khẩu</h2>
        <p className="muted">Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
        <label className="login-field">Mật khẩu mới
          <LockIcon />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="Mật khẩu mới" autoComplete="new-password" required />
          <button className="login-eye" type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)}><EyeIcon /></button>
        </label>
        <label className="login-field">Nhập lại mật khẩu
          <LockIcon />
          <input value={confirm} onChange={(event) => setConfirm(event.target.value)} type="password" placeholder="Nhập lại mật khẩu" autoComplete="new-password" required />
        </label>
        {error ? <p className="status-bad">{error}</p> : null}
        {message ? <p className="status-ok">{message}</p> : null}
        <button className="btn-dark login-submit" type="submit">Cập nhật mật khẩu <ArrowIcon /></button>
        <p className="login-switch"><Link to="/login" state={overlay.carried}>Về đăng nhập</Link></p>
      </form>
    </AuthFrame>
  );
}

function UserIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3.2 13.2c.8-2 2.5-3 4.8-3s4 1 4.8 3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function TagIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.2 7.8 3h4.7v4.7L7 13.2z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function HeartIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13s-4.5-2.7-4.5-5.4A2.4 2.4 0 0 1 8 6a2.4 2.4 0 0 1 4.5 1.6C12.5 10.3 8 13 8 13z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function CartIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h1.3l1.1 6.4h7.2l1-4.4H4.6" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="6.5" cy="12.5" r=".8" fill="currentColor" /><circle cx="11.2" cy="12.5" r=".8" fill="currentColor" /></svg>;
}

function ChipIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6.5 1.5v2.5M9.5 1.5v2.5M6.5 12v2.5M9.5 12v2.5M1.5 6.5H4M1.5 9.5H4M12 6.5h2.5M12 9.5h2.5" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function ScreenIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M6 13.5h4M8 11v2.5" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function NextIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 11.5 8 3.5l5 8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5.2 11.5h5.6" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function MailIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="m3 5 5 3.5L13 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function LockIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5.4a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8S4 4.5 8 4.5 14.5 8 14.5 8 12 11.5 8 11.5 1.5 8 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.3" /><circle cx="8" cy="8" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
}

function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AppleMark() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M11.2 8.4c0-1.5 1.2-2.2 1.3-2.3-.7-1-1.8-1.2-2.2-1.2-1-.1-1.8.6-2.3.6s-1.2-.6-2-.5c-.8 0-1.6.5-2 1.2-1 1.6-.2 4 .7 5.3.4.6 1 1.3 1.7 1.3.7 0 .9-.4 1.8-.4s1 .4 1.8.4 1.2-.6 1.6-1.2c.5-.7.7-1.4.7-1.4s-1.3-.5-1.3-1.8zM9.8 4.2c.4-.5.6-1.1.6-1.7 0-.1 0-.1 0-.2-.6 0-1.2.4-1.6.8-.3.4-.7 1.1-.6 1.7.1 0 .1 0 .2 0 .5 0 1.1-.3 1.4-.6z" fill="currentColor" /></svg>;
}

function GoogleMark() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M14.5 8.2c0-.5 0-.9-.1-1.3H8.2v2.5h3.5c-.2.8-.6 1.5-1.3 2v1.6h2.1c1.2-1.1 2-2.8 2-4.8z" fill="#4285F4" /><path d="M8.2 14.5c1.7 0 3.2-.6 4.2-1.5l-2.1-1.6c-.6.4-1.3.6-2.1.6-1.6 0-3-1.1-3.5-2.6H2.5v1.7c1 2 3.1 3.4 5.7 3.4z" fill="#34A853" /><path d="M4.7 9.4a3.7 3.7 0 0 1 0-2.4V5.3H2.5a6.4 6.4 0 0 0 0 5.8l2.2-1.7z" fill="#FBBC05" /><path d="M8.2 4.4c.9 0 1.7.3 2.4 1l1.8-1.8C11.4 2.5 9.9 1.9 8.2 1.9 5.6 1.9 3.5 3.3 2.5 5.3l2.2 1.7c.5-1.5 1.9-2.6 3.5-2.6z" fill="#EA4335" /></svg>;
}

function MicrosoftMark() {
  return <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h5.5v5.5H2z" fill="#f25022" /><path d="M8.5 2H14v5.5H8.5z" fill="#7fba00" /><path d="M2 8.5h5.5V14H2z" fill="#00a4ef" /><path d="M8.5 8.5H14V14H8.5z" fill="#ffb900" /></svg>;
}
