import { Outlet } from "react-router";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function StoreLayout() {
  return (
    <div className="shell">
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
