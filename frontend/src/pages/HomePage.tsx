import { useAuth } from "../context/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main className="home-page">
      <h1>Home</h1>
      {user ? <p>Вы вошли как {user.email}</p> : null}
      <button type="button" onClick={logout}>
        Выйти
      </button>
    </main>
  );
}
