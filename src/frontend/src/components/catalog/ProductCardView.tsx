import { Link, useLocation, useNavigate } from "react-router";
import { apiBaseUrl } from "../../api/client";
import type { ProductCard } from "../../api/catalog";
import { useAuth } from "../../auth/AuthProvider";
import { money, stars } from "../../catalog/format";
import { useWishlist } from "../../wishlist/WishlistProvider";

export function ProductCardView({ product, onAdd }: { product: ProductCard; onAdd?: (product: ProductCard) => void }) {
  const onSale = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  return (
    <article className="product-card">
      <Link to={`/laptops/${product.slug}`} className="media">
        <img src={`${apiBaseUrl}${product.imageUrl}`} alt={product.name} loading="lazy" />
        <span className="card-badges">
          {product.soldCount > 0 && product.isFeatured ? <span className="badge badge-dark">Bán chạy</span> : null}
          {product.isNew ? <span className="badge badge-green">Mới</span> : null}
          {onSale ? <span className="badge badge-red">Giảm giá</span> : null}
        </span>
      </Link>
      <WishButton productId={product.id} />
      <div className="info">
        <h3><Link to={`/laptops/${product.slug}`}>{product.name}</Link></h3>
        <p className="muted spec-line">{product.specLine}</p>
        <p className="price-row">
          <span className={onSale ? "price price-sale" : "price"}>{money(product.price)}</span>
          <span className={onSale ? "price-old" : "price-old price-gap"} aria-hidden={onSale ? undefined : true}>{onSale ? money(product.compareAtPrice ?? 0) : "—"}</span>
        </p>
        <p className="stars">{stars(product.rating)} <span>({product.reviewCount})</span></p>
        <button className="btn-dark card-button" type="button" disabled={!product.inStock} onClick={() => onAdd?.(product)}>
          {product.inStock ? "Thêm vào giỏ" : "Hết hàng"}
        </button>
      </div>
    </article>
  );
}

function WishButton({ productId }: { productId: number }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wishes = useWishlist();
  const saved = wishes.has(productId);

  return (
    <button
      className={saved ? "wish-btn saved" : "wish-btn"}
      type="button"
      aria-label={saved ? "Bỏ yêu thích" : "Yêu thích"}
      aria-pressed={saved}
      onClick={() => {
        if (!session) {
          navigate("/login", { state: { background: location } });
          return;
        }
        void wishes.toggle(productId);
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 13.2 2.6 8.1a3.2 3.2 0 0 1 4.5-4.5L8 4.4l.9-.8a3.2 3.2 0 0 1 4.5 4.5z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </button>
  );
}
