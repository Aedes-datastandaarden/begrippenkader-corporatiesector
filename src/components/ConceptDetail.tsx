import { useEffect, useState } from 'react';
import type { Concept, VersionsManifest } from '../lib/types';
import { buildAssetPath, getBaseUrl, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';

interface Props {
  slug: string;
  defaultConcept: Concept;
  versionsManifest: VersionsManifest;
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

export default function ConceptDetail({ slug, defaultConcept, versionsManifest }: Props) {
  const [concept, setConcept] = useState(defaultConcept);
  const [version, setVersion] = useState(versionsManifest.latest);

  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    setVersion(active);
    if (active === versionsManifest.latest && defaultConcept.slug === slug) {
      setConcept(defaultConcept);
      return;
    }
    fetch(buildAssetPath(`build/${active}/concepts.json`))
      .then((r) => r.json())
      .then((concepts: Concept[]) => {
        const found = concepts.find((c) => c.slug === slug);
        if (found) setConcept(found);
      })
      .catch(() => setConcept(defaultConcept));
  }, [slug, defaultConcept, versionsManifest]);

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

  return (
    <article className="concept-detail">
      <p className="concept-detail__back">
        <a href={withVersionParam(getBaseUrl(), version)}>← Terug naar overzicht</a>
      </p>

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
                    <li key={ref.uri}>
                      {ref.internal ? (
                        <a href={withVersionParam(pageUrl('begrip', ref.slug!), version)}>
                          {ref.prefLabel}
                        </a>
                      ) : (
                        <a href={ref.uri} rel="noopener noreferrer" target="_blank">
                          {ref.prefLabel}
                        </a>
                      )}
                    </li>
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
