import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface NavConfig {
  to: string;
  label: string;
  icon: string;
}

const STAFF_NAV: NavConfig[] = [
  { to: "/dashboard", label: "Dashboard", icon: "◧" },
  { to: "/records", label: "Records", icon: "☷" },
  { to: "/records/add", label: "Add Record", icon: "＋" },
  { to: "/uploads", label: "Uploads", icon: "↑" },
  { to: "/analytics", label: "Analytics", icon: "◔" },
];

const ADMIN_NAV: NavConfig[] = [
  { to: "/settings", label: "System Settings", icon: "⚙" },
  { to: "/users", label: "User Management", icon: "◉" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">S</span>
        <span className="brand-name">ServiSense</span>
      </div>

      <nav className="sidebar-nav">
        {STAFF_NAV.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/dashboard"}
            className={({ isActive }) =>
              isActive ? "nav-item active" : "nav-item"
            }
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        {user.role === "admin" && (
          <>
            <div className="nav-divider">Administration</div>
            {ADMIN_NAV.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="nav-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </>
        )}

        <div className="nav-divider">More</div>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">◉</span>
          My Account
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">?</span>
          About
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-name">{user.full_name || user.username}</div>
          <div className="user-role">
            {user.role}
            {user.assigned_office ? ` · ${user.assigned_office}` : ""}
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
