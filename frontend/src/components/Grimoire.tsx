import { SECRETS } from "../secrets";
import { useSecrets } from "../SecretsContext";
import SecretKey from "./SecretKey";

// The Grimoire: every Yale secret on the site. Unlocked ones show their fact; locked ones show a
// hint about where their key is hidden, so the hunt is clear rather than guesswork.
export default function Grimoire() {
  const { found, total, grimoireOpen, setGrimoireOpen } = useSecrets();
  if (!grimoireOpen) return null;

  return (
    <div className="grimoire-backdrop" onClick={() => setGrimoireOpen(false)}>
      <div className="grimoire" role="dialog" aria-label="The Grimoire of Yale secrets" onClick={(e) => e.stopPropagation()}>
        <button className="grimoire-close" onClick={() => setGrimoireOpen(false)} aria-label="Close the Grimoire">
          ×
        </button>
        <p className="eyebrow">The Grimoire</p>
        <h2>Secrets of the Old Stones</h2>
        <p className="grimoire-intro">
          Sixteen keys lie hidden about these halls. Find a glowing <SecretKey size={15} /> and click it to unlock
          its secret. You have unlocked <strong>{found.size}</strong> of {total}.
        </p>
        <div className="grimoire-progress" aria-hidden="true">
          <span style={{ width: `${(found.size / total) * 100}%` }} />
        </div>
        <ol className="grimoire-list">
          {SECRETS.map((s) =>
            found.has(s.id) ? (
              <li key={s.id} className="unlocked">
                <strong>{s.title}</strong>
                <span>{s.fact}</span>
              </li>
            ) : (
              <li key={s.id} className="locked">
                <strong>Sealed</strong>
                <span>Hint: {s.hint}.</span>
              </li>
            ),
          )}
        </ol>
      </div>
    </div>
  );
}
