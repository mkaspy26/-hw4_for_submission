import { useEffect, useRef, useState } from "react";
import { SECRET_BY_ID } from "../secrets";
import { useSecrets } from "../SecretsContext";
import SecretKey from "./SecretKey";

// A glowing key hidden in the page. Click it to unlock a Yale secret (tracked in the Grimoire).
export default function Secret({ id, className = "" }: { id: string; className?: string }) {
  const secret = SECRET_BY_ID[id];
  const { found, discover, total } = useSecrets();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!secret) return null;
  const seen = found.has(id);

  return (
    <span ref={ref} className={`secret ${seen ? "seen" : ""} ${className}`}>
      <button
        className="secret-star"
        aria-label={seen ? `Yale secret: ${secret.title}` : "A hidden key: click to unlock a Yale secret"}
        title={seen ? `Unlocked: ${secret.title}` : "A secret stirs here… click the key"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          discover(id);
          setOpen((o) => !o);
        }}
      >
        <span className="secret-halo" aria-hidden="true" />
        <SecretKey size={16} />
      </button>
      {open && (
        <span className="secret-scroll" role="dialog" aria-label={secret.title}>
          <span className="secret-kicker">🗝 Secret unlocked · {found.size} of {total} in your Grimoire</span>
          <strong>{secret.title}</strong>
          <span>{secret.fact}</span>
        </span>
      )}
    </span>
  );
}
