import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../api";
import { useAuth } from "../AuthContext";
import Secret from "../components/Secret";
import SecretKey from "../components/SecretKey";

const MIN_PASSWORD_LEN = 8;

export default function CreateAccount() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    // Quick checks here for a friendly message; the backend re-checks everything.
    if (form.password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      setUser(await signup(form));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth">
      <Secret id="new-colleges" className="auth-secret" />
      <div className="society-seal" aria-hidden="true">
        <SecretKey size={30} />
      </div>
      <p className="eyebrow">An Invitation</p>
      <h1>Join the Society</h1>
      <p className="society-teaser">
        Every great society begins with a name written in a ledger. Inscribe yours, and the halls will know you.
        What follows, we may neither confirm nor deny.
      </p>
      <div className="why-account">
        <strong>Why create an account?</strong>
        <ul>
          <li>Sir Handsome Dan remembers your chats, so you can pick up where you left off (your sizes, the items you liked).</li>
          <li>He greets you by name every time you come back.</li>
          <li>It's free and takes 30 seconds: just your name, email, and a password.</li>
        </ul>
      </div>
      <p className="society-whisper small-whisper">
        <em>…and some members, they say, are one day tapped.</em>
      </p>
      <form onSubmit={onSubmit}>
        <label>
          First name
          <input required autoComplete="given-name" value={form.first_name} onChange={update("first_name")} />
        </label>
        <label>
          Last name
          <input required autoComplete="family-name" value={form.last_name} onChange={update("last_name")} />
        </label>
        <label>
          Email
          <input type="email" required autoComplete="email" value={form.email} onChange={update("email")} />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LEN}
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={update("confirm_password")}
          />
        </label>
        {error && <p className="error small">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Inscribing your name…" : "Inscribe My Name"}
        </button>
      </form>
      <p className="small">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
