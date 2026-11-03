import type { ReactNode } from 'react';
import type { Concept } from '../lib/types';
import { conceptUrl, withVersionParam } from '../lib/version';

interface Props {
  concept: Concept;
  embedded?: boolean;
  version?: string;
  onSelectConcept?: (slug: string) => void;
}

const BULLET_RE = /^\s*[-*•]\s+/;

/**
 * Rendert platte tekst met een kleine opmaak-subset:
 * - witregel = nieuwe alinea (verticale tussenruimte);
 * - enkele regelafbreking = <br/> binnen dezelfde alinea (geen tussenruimte);
 * - regel die begint met "- ", "* " of "• " = bullet (opeenvolgende bullets
 *   vormen samen één lijst). Alles wordt als React-children gerenderd, dus
 *   geëscaped; er wordt geen HTML uit de tekst geïnterpreteerd.
 */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.replace(/\s+$/, '')).filter((b) => b.trim().length > 0);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const parts: ReactNode[] = [];
        let bullets: string[] = [];
        let prose: string[] = [];
        const flushBullets = () => {
          if (bullets.length === 0) return;
          const items = bullets;
          parts.push(
            <ul key={`ul-${bi}-${parts.length}`}>
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>,
          );
          bullets = [];
        };
        const flushProse = () => {
          if (prose.length === 0) return;
          const rows = prose;
          parts.push(
            <p key={`p-${bi}-${parts.length}`}>
              {rows.map((row, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {row}
                </span>
              ))}
            </p>,
          );
          prose = [];
        };
        for (const line of lines) {
          if (BULLET_RE.test(line)) {
            flushProse();
            bullets.push(line.replace(BULLET_RE, ''));
          } else if (line.trim().length > 0) {
            flushBullets();
            prose.push(line);
          }
        }
        flushProse();
        flushBullets();
        return parts;
      })}
    </>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <section className="field-block">
      <h2 className="field-block__label">{label}</h2>
      <div className="field-block__value">
        <RichText text={value} />
      </div>
    </section>
  );
}

export default function ConceptDetailView({ concept, embedded, version, onSelectConcept }: Props) {
  const textSources = concept.sources.filter((s) => s.text && !s.url);
  const urlSources = concept.sources.filter((s) => s.url);

  // Combineer bron/grondslag met de bijbehorende link: een bron-tekst wordt
  // klikbaar gemaakt naar de link op dezelfde positie. Is er alleen tekst, dan
  // blijft het platte tekst; is er alleen een link, dan tonen we de link zelf.
  const sourceItems: { label: string; href: string | null }[] = [];
  for (let i = 0; i < Math.max(textSources.length, urlSources.length); i++) {
    const text = textSources[i]?.text ?? null;
    const url = urlSources[i]?.url ?? null;
    if (text) sourceItems.push({ label: text, href: url });
    else if (url) sourceItems.push({ label: url, href: url });
  }

  const internalRelations = [
    { title: 'Breder begrip', refs: concept.broaderResolved.filter((r) => r.internal) },
    { title: 'Smaller begrip', refs: concept.narrowerResolved.filter((r) => r.internal) },
    { title: 'Verwant begrip', refs: concept.relatedResolved.filter((r) => r.internal) },
  ].filter((section) => section.refs.length > 0);

  const externalRelations = [
    { title: 'Overeenkomstig begrip (extern)', refs: concept.exactMatchResolved.filter((r) => !r.internal) },
    { title: 'Verwant begrip (extern)', refs: concept.closeMatchResolved.filter((r) => !r.internal) },
  ].filter((section) => section.refs.length > 0);

  function renderRelationLink(ref: (typeof internalRelations)[0]['refs'][0]) {
    if (ref.internal && onSelectConcept && ref.slug) {
      return (
        <button type="button" className="relation-link" onClick={() => onSelectConcept(ref.slug!)}>
          {ref.prefLabel}
        </button>
      );
    }
    if (ref.internal && ref.slug) {
      return (
        <a href={withVersionParam(conceptUrl(ref.slug!), version ?? '')}>
          {ref.prefLabel}
        </a>
      );
    }
    return (
      <a href={ref.uri} rel="noopener noreferrer" target="_blank">
        {ref.prefLabel}
      </a>
    );
  }

  return (
    <article className={`concept-detail${embedded ? ' concept-detail--embedded' : ''}`}>
      <header className="concept-detail__header">
        <h1>{concept.prefLabel}</h1>
        <div className="concept-detail__meta">
          {concept.altLabels.length > 0 && (
            <p className="concept-detail__synonyms">
              <span className="field-block__label">Synoniem</span>{' '}
              {concept.altLabels.join(', ')}
            </p>
          )}
        </div>
      </header>

      {concept.definition && (
        <section className="concept-detail__definition" aria-labelledby="definition-heading">
          <h2 id="definition-heading">Definitie</h2>
          <div className="concept-detail__definition-text">
            <RichText text={concept.definition} />
          </div>
        </section>
      )}

      <div className="concept-detail__grid">
        <div className="concept-detail__main">
          <Field label="Toelichting" value={concept.comment} />
          <Field label="Gebruik" value={concept.scopeNote} />
          <Field label="Voorbeeld" value={concept.example} />

          {sourceItems.length > 0 && (
            <section className="field-block">
              <h2 className="field-block__label">Bron / grondslag</h2>
              <ul className="source-list">
                {sourceItems.map((item, i) => (
                  <li key={i}>
                    {item.href ? (
                      <a href={item.href} rel="noopener noreferrer" target="_blank">
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {(internalRelations.length > 0 || externalRelations.length > 0) && (
          <aside className="concept-detail__relations" aria-labelledby="relations-heading">
            <h2 id="relations-heading" className="field-block__label">Relaties</h2>
            {[...internalRelations, ...externalRelations].map((section) => (
              <section key={section.title} className="relation-group">
                <h3>{section.title}</h3>
                <ul>
                  {section.refs.map((ref) => (
                    <li key={ref.uri}>{renderRelationLink(ref)}</li>
                  ))}
                </ul>
              </section>
            ))}
          </aside>
        )}
      </div>

      <p className="uri-meta">
        <small>
          Canonieke URI: <a href={concept.uri}>{concept.uri}</a>
        </small>
      </p>
    </article>
  );
}
