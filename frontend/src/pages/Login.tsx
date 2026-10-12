import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../AuthContext";
import Secret from "../components/Secret";
import SecretKey from "../components/SecretKey";

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      setUser(await login(email, password));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth">
      <Secret id="whiffs" className="auth-secret" />
      <div className="society-seal" aria-hidden="true">
        <SecretKey size={30} />
      </div>
      <p className="eyebrow">Members Only</p>
      <h1>Return to the Halls</h1>
      <p className="society-teaser">
        The doors remember those who have passed through them. Speak your name and your word, and they will open
        once more.
      </p>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error small">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "The doors are opening…" : "Enter"}
        </button>
      </form>
      <p className="society-whisper">
        <em>It is whispered that on certain spring evenings, a knock comes at the doors of a chosen few…</em>
      </p>
      <p className="small">
        Not yet one of us? <Link to="/create-account">Seek membership</Link>
      </p>
    </section>
  );
}
