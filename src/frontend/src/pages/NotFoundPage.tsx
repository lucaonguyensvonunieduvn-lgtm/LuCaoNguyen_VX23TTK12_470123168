import { Link } from "react-router";

import { brandName } from "../catalog/labels";

export function NotFoundPage() {
  return (
    <section className="page">
      <h1 className="page-title">Không tìm thấy trang</h1>
      <p className="muted">Địa chỉ này không thuộc {brandName}.</p>
      <Link className="btn-dark" to="/">Về trang chủ</Link>
    </section>
  );
}
