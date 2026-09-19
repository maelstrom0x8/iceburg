import { Outlet } from "react-router-dom";
import { Navbar } from "../navbar/Navbar";

export function MarketingLayout() {
  return (
    <div className="min-h-dvh bg-white text-black dark:bg-black dark:text-white">
      <Navbar />
      <Outlet />
    </div>
  );
}
