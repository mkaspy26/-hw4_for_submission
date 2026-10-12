// An old skeleton key: the marker for a hidden secret (and the Grimoire counter icon).
export default function SecretKey({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="secret-key">
      <circle cx="7" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="7" cy="12" r="1.4" fill="currentColor" />
      <path d="M11.2 12 H21 M17.5 12 v3.5 M20.5 12 v2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
