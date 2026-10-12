import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useSecrets } from "../SecretsContext";
import Crest from "./Crest";
import SecretKey from "./SecretKey";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/about", label: "About Us" },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const { found, total, setGrimoireOpen } = useSecrets();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <Crest />
        <span>
          Campus Customs
          <small>Lux et Veritas · New Haven</small>
        </span>
      </Link>
      <nav>
        <button
          className="secrets-count"
          onClick={() => setGrimoireOpen(true)}
          title="Open the Grimoire: hidden keys across the site each unlock a Yale secret"
        >
          <SecretKey size={15} /> {found.size}/{total} secrets
        </button>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"}>
            {l.label}
          </NavLink>
        ))}
        {user ? (
          <>
            <span className="nav-user">Hi, {user.first_name}</span>
            <button className="nav-logout" onClick={onLogout}>
              Log Out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/create-account">Create Account</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
