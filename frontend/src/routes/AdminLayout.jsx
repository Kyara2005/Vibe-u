import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../pages/dashboard/Dashboard.css";
import "./AdminLayout.css";

const AdminLayout = () => (
  <div className="shell__dash admin-shell">
    <Sidebar />
    <main className="content__dash admin-shell-content">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
