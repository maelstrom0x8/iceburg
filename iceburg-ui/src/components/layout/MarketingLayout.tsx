import { Outlet } from "react-router-dom";
import { Navbar } from "../navbar/Navbar";
import { Footer } from "./Footer";

export function MarketingLayout() {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--color-app-bg)", color: "var(--color-app-text)" }}
    >
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
