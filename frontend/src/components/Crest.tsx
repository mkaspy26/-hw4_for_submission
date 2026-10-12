// Campus Customs crest: a simple shield with "CC" and a star (not the Yale shield).
export default function Crest({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true" className="crest">
      <path d="M20 2 L37 7 V22 C37 33 29 40 20 44 C11 40 3 33 3 22 V7 Z" fill="#ffffff" />
      <path d="M20 5 L34 9 V22 C34 31 27.5 37 20 40.5 C12.5 37 6 31 6 22 V9 Z" fill="#00356b" />
      <text x="20" y="27" textAnchor="middle" fontFamily="Playfair Display, Georgia, serif" fontWeight="900" fontSize="13" fill="#ffffff">
        CC
      </text>
      <path d="M20 9.5 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 Z" fill="#ffffff" />
    </svg>
  );
}
