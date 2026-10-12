import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts, Product } from "../api";
import { OPEN_CHAT_EVENT } from "../components/ChatWidget";
import MysticHall from "../components/MysticHall";
import HandsomeDan from "../components/HandsomeDan";
import ProductCard from "../components/ProductCard";
import RibbonRunner from "../components/RibbonRunner";
import Secret from "../components/Secret";

const COLLEGES: { name: string; initials: string; fact: string }[] = [
  { name: "Benjamin Franklin", initials: "BF", fact: "Opened 2017. Franklin himself received an honorary Yale degree in 1753." },
  { name: "Berkeley", initials: "BK", fact: "Named for Bishop George Berkeley, an early benefactor of Yale." },
  { name: "Branford", initials: "BR", fact: "Carved from the Memorial Quadrangle. Harkness Tower rises from its courtyard." },
  { name: "Davenport", initials: "DC", fact: "Named for John Davenport, a founder of the New Haven Colony." },
  { name: "Ezra Stiles", initials: "ES", fact: "Named for Ezra Stiles, a president of Yale." },
  { name: "Grace Hopper", initials: "GH", fact: "Named for Grace Murray Hopper, computing pioneer and Yale PhD." },
  { name: "Jonathan Edwards", initials: "JE", fact: "Named for the theologian Jonathan Edwards, a Yale graduate." },
  { name: "Morse", initials: "MC", fact: "Named for Samuel F. B. Morse, inventor of Morse code, Yale graduate." },
  { name: "Pauli Murray", initials: "PM", fact: "Opened 2017. Named for civil-rights lawyer Pauli Murray, a Yale Law graduate." },
  { name: "Pierson", initials: "PC", fact: "Named for Abraham Pierson, Yale's first rector." },
  { name: "Saybrook", initials: "SY", fact: "Named for Old Saybrook, the Collegiate School's very first home." },
  { name: "Silliman", initials: "SM", fact: "Named for Benjamin Silliman, the pioneering scientist." },
  { name: "Timothy Dwight", initials: "TD", fact: "Named for Timothy Dwight, a president of Yale." },
  { name: "Trumbull", initials: "TC", fact: "Named for Jonathan Trumbull, governor of Connecticut." },
];

const TREASURES = [
  "basic-hoodie-big-yale",
  "district-vit-hoodie-vintage-bulldog",
  "boola-boola-t-shirt",
  "2025-yale-vs-harvard-t-shirt",
];

function CollegeCrest({ c }: { c: (typeof COLLEGES)[number] }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button className={`college ${flipped ? "flipped" : ""}`} onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
      <span className="college-inner">
        <span className="college-front">
          <span className="shield">{c.initials}</span>
          <span className="college-name">{c.name}</span>
        </span>
        <span className="college-back">{c.fact}</span>
      </span>
    </button>
  );
}

const openChat = () => window.dispatchEvent(new Event(OPEN_CHAT_EVENT));

export default function Home() {
  const [treasures, setTreasures] = useState<Product[]>([]);
  // College hovered in the scrolling ribbon (+ where to draw its pop-up). The pop-up is rendered
  // outside the moving track, so the ribbon's overflow/transform can't clip it.
  const [ribbonTip, setRibbonTip] = useState<{ c: (typeof COLLEGES)[number]; x: number; y: number } | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((all) => setTreasures(TREASURES.map((id) => all.find((p) => p.product_id === id)).filter(Boolean) as Product[]))
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="haunt">
        <MysticHall />
        <div className="haunt-text">
          <p className="eyebrow">
            Lux et Veritas <Secret id="lux" /> · New Haven · MDCCI
          </p>
          <h1>Campus Customs</h1>
          <p className="haunt-sub">
            When the fog rolls in over the old stones and the tower windows flicker, the regalia of Yale awaits
            those who know where to look.
          </p>
          <div className="hall-actions">
            <Link to="/products" className="btn btn-glow">
              Enter the Collection
            </Link>
            <button className="btn btn-ghost-light" onClick={openChat}>
              <HandsomeDan size={28} variant="head" /> Chat with Sir Handsome Dan
            </button>
          </div>
        </div>
        <RibbonRunner onClick={openChat} />
        <div className="college-ribbon" aria-label="The fourteen residential colleges" onMouseLeave={() => setRibbonTip(null)}>
          <div className="ribbon-track">
            {[...COLLEGES, ...COLLEGES].map((c, i) => (
              <span
                key={i}
                className="ribbon-college"
                tabIndex={i < COLLEGES.length ? 0 : -1}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setRibbonTip({ c, x: r.left + r.width / 2, y: r.top });
                }}
                onFocus={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setRibbonTip({ c, x: r.left + r.width / 2, y: r.top });
                }}
                onBlur={() => setRibbonTip(null)}
              >
                {c.name} <em>✦</em>
              </span>
            ))}
          </div>
        </div>
        {ribbonTip && (
          <div className="ribbon-pop" style={{ left: ribbonTip.x, top: ribbonTip.y }} role="tooltip">
            <span className="shield ribbon-pop-shield">{ribbonTip.c.initials}</span>
            <span>
              <strong>{ribbonTip.c.name} College</strong>
              {ribbonTip.c.fact}
            </span>
          </div>
        )}
      </section>

      <section className="letter">
        <div className="letter-seal">CC</div>
        <p className="eyebrow">From the Head's Study</p>
        <h2>A Welcome, by Candlelight</h2>
        <p className="drop-cap">
          Dear friends of the Elm City, whether you have just arrived in Old Campus with a trunk and a little trepidation,
          or you crossed these courtyards many reunions ago, welcome. Campus Customs keeps the regalia of our community:
          the hoodie for late nights beneath Sterling's vaulted ceilings <Secret id="sterling" />, the crewneck for the
          walk past Harkness as the bells begin <Secret id="harkness" />, and the tee you will wear, loudly, at The Game.
        </p>
        <p>
          Every piece in our collection carries a note from the Head's Study. Read them as you browse. Each one speaks to
          a college, and you may find your own among them. And should you need a guide, our bulldog is always on duty.
        </p>
        <p className="signature">— With warm regards from the Head's Study, Campus Customs</p>
      </section>

      <section className="colleges">
        <p className="eyebrow">
          The Fourteen <Secret id="colleges" />
        </p>
        <h2>Find Your College</h2>
        <p className="muted">Touch a crest and its story will be revealed.</p>
        <div className="college-grid">
          {COLLEGES.map((c) => (
            <CollegeCrest key={c.name} c={c} />
          ))}
        </div>
      </section>

      {treasures.length > 0 && (
        <section className="treasures">
          <p className="eyebrow">Treasures of the Vault</p>
          <h2>Relics of the Vault</h2>
          <div className="grid">
            {treasures.map((p, i) => (
              <ProductCard key={p.product_id} product={p} index={i} />
            ))}
          </div>
          <div className="center">
            <Link to="/products" className="btn">
              Explore all 102 relics →
            </Link>
          </div>
        </section>
      )}

      <section className="visit">
        <div>
          <p className="eyebrow">Come Find Us</p>
          <h2>57 Broadway, New Haven</h2>
          <p>
            In the heart of campus, a short walk from the Old Campus gates <Secret id="founded" />. Questions about an
            order? Summon Handsome Dan in the corner, or write to orderdept@campuscustoms.com.
          </p>
        </div>
        <div className="visit-dan">
          <button className="dan-button" onClick={openChat} aria-label="Chat with Sir Handsome Dan">
            <HandsomeDan size={130} />
            <span>Chat with me</span>
          </button>
          <Secret id="handsome-dan" />
        </div>
      </section>
    </>
  );
}
