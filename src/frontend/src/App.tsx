import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import { CartProvider } from "./cart/CartProvider";
import { WishlistProvider } from "./wishlist/WishlistProvider";
import { StoreLayout } from "./components/layout/StoreLayout";
import { AdminLayout, AdminOrderDetailPage, AdminOrdersPage, AdminProductsPage, CustomersPage, DashboardPage, NameAdminPage, ProductEditorPage, ReportsPage, ReviewsPage, VouchersPage } from "./pages/AdminPages";
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from "./pages/AuthPages";
import { AccountPage, AddressesPage, ComparePage, ContentPage, OrderDetailPage, OrderSuccessPage, SecurityPage, WishlistPage } from "./pages/CustomerPages";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { ListingPage } from "./pages/ListingPage";
import { BrandsPage, DealsPage, SupportPage } from "./pages/StorePages";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

function AppRoutes() {
  const location = useLocation();
  const background = (location.state as { background?: typeof location } | null)?.background;
  const authOpen = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/forgot-password" || location.pathname === "/reset-password";
  return (
    <>
      <Routes location={authOpen ? (background ?? "/") : location}>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/laptops" element={<ListingPage />} />
          <Route path="/laptops/:slug" element={<ProductDetailPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success/:code" element={<OrderSuccessPage />} />
              <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<AccountPage />} />
          <Route path="/account/orders/:code" element={<OrderDetailPage />} />
          <Route path="/account/addresses" element={<AddressesPage />} />
          <Route path="/account/security" element={<SecurityPage />} />
          <Route path="/account/wishlist" element={<WishlistPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/pages/:slug" element={<ContentPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:id" element={<ProductEditorPage />} />
          <Route path="brands" element={<NameAdminPage kind="brands" />} />
          <Route path="categories" element={<NameAdminPage kind="categories" />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:code" element={<AdminOrderDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
      {location.pathname === "/login" ? <LoginPage /> : null}
      {location.pathname === "/register" ? <RegisterPage /> : null}
      {location.pathname === "/forgot-password" ? <ForgotPasswordPage /> : null}
      {location.pathname === "/reset-password" ? <ResetPasswordPage /> : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppRoutes />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
