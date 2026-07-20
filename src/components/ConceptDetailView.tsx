import type { Concept } from '../lib/types';
import { conceptUrl, withVersionParam } from '../lib/version';

interface Props {
  concept: Concept;
  embedded?: boolean;
  version?: string;
  onSelectConcept?: (slug: string) => void;
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <section className="field-block">
      <h2 className="field-block__label">{label}</h2>
      <p className="field-block__value">{value}</p>
    </section>
  );
}

export default function ConceptDetailView({ concept, embedded, version, onSelectConcept }: Props) {
  const textSources = concept.sources.filter((s) => s.text && !s.url);
  const urlSources = concept.sources.filter((s) => s.url);

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
          {concept.isTopConcept && <span className="badge">Topbegrip</span>}
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
          <p>{concept.definition}</p>
        </section>
      )}

      <div className="concept-detail__grid">
        <div className="concept-detail__main">
          <Field label="Toelichting" value={concept.comment} />
          <Field label="Gebruik" value={concept.scopeNote} />
          <Field label="Voorbeeld" value={concept.example} />

          {textSources.length > 0 && (
            <section className="field-block">
              <h2 className="field-block__label">Bron / grondslag</h2>
              <ul className="source-list">
                {textSources.map((item, i) => (
                  <li key={i}>{item.text}</li>
                ))}
              </ul>
            </section>
          )}

          {urlSources.length > 0 && (
            <section className="field-block">
              <h2 className="field-block__label">Links</h2>
              <ul className="source-list">
                {urlSources.map((item, i) => (
                  <li key={i}>
                    <a href={item.url!} rel="noopener noreferrer" target="_blank">
                      {item.url}
                    </a>
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
