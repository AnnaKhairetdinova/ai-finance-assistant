import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function MainLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-nav">
        <nav>
          <NavLink to="/" end>
            Главная
          </NavLink>
          <NavLink to="/transactions">Транзакции</NavLink>
        </nav>
        <div className="app-nav__user">
          {user ? <span>{user.email}</span> : null}
          <button type="button" className="button-secondary" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
