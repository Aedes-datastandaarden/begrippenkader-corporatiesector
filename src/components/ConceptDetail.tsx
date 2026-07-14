import { useEffect, useState } from 'react';
import type { Concept } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';

interface Props {
  slug: string;
  defaultConcept: Concept;
  versionsManifest: { latest: string; versions: { id: string }[] };
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

const CATEGORY_LABELS: Record<string, string> = {
  overgenomen: 'Overgenomen uit',
  afgeleid: 'Afgeleid van',
  eigen: 'Eigen definitie',
};

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

  const grouped = new Map<string, typeof concept.sources>();
  const urlSources = concept.sources.filter((s) => s.url);
  for (const source of concept.sources.filter((s) => !s.url)) {
    const key = source.category ?? 'overig';
    const list = grouped.get(key) ?? [];
    list.push(source);
    grouped.set(key, list);
  }

  return (
    <article>
      <header>
        <h1>{concept.prefLabel}</h1>
        {concept.isTopConcept && <span className="badge">Topbegrip</span>}
        {concept.altLabels.length > 0 && (
          <p className="synonyms">
            <span className="field-block__label">Synoniem</span> {concept.altLabels.join(', ')}
          </p>
        )}
      </header>

      <Field label="Definitie" value={concept.definition} />
      <Field label="Toelichting" value={concept.comment} />
      <Field label="Gebruik" value={concept.scopeNote} />
      <Field label="Voorbeeld" value={concept.example} />

      {concept.sources.length > 0 && (
        <section className="field-block">
          <h2 className="field-block__label">Bron / grondslag</h2>
          {[...grouped.entries()].map(([category, items]) => (
            <div className="source-group" key={category}>
              <p className="source-group__title">{CATEGORY_LABELS[category] ?? 'Overig'}</p>
              <ul>{items.map((item, i) => <li key={i}>{item.text}</li>)}</ul>
            </div>
          ))}
          {urlSources.length > 0 && (
            <div className="source-group">
              <p className="source-group__title">Links</p>
              <ul>
                {urlSources.map((item, i) => (
                  <li key={i}>
                    <a href={item.url!} rel="noopener noreferrer" target="_blank">{item.url}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <RelationSection
        title="Breder begrip"
        refs={concept.broaderResolved.filter((r) => r.internal)}
        version={version}
      />
      <RelationSection
        title="Smaller begrip"
        refs={concept.narrowerResolved.filter((r) => r.internal)}
        version={version}
      />
      <RelationSection
        title="Verwant begrip"
        refs={concept.relatedResolved.filter((r) => r.internal)}
        version={version}
      />
      <RelationSection
        title="Overeenkomstig begrip (extern)"
        refs={concept.exactMatchResolved.filter((r) => !r.internal)}
        external
      />
      <RelationSection
        title="Verwant begrip (extern)"
        refs={concept.closeMatchResolved.filter((r) => !r.internal)}
        external
      />

      <p className="uri-meta">
        <small>
          Canonieke URI: <a href={concept.uri}>{concept.uri}</a>
        </small>
      </p>

      <style>{`
        .synonyms { margin: 0.5rem 0 0; color: var(--color-muted); }
        .uri-meta { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--color-border); color: var(--color-muted); }
        ul { margin: 0; padding-left: 1.25rem; }
        .relation-type { font-size: 0.9375rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
      `}</style>
    </article>
  );
}

function RelationSection({
  title,
  refs,
  version,
  external,
}: {
  title: string;
  refs: { slug: string | null; prefLabel: string; uri: string }[];
  version?: string;
  external?: boolean;
}) {
  if (refs.length === 0) return null;
  return (
    <section className="field-block">
      <h2 className="field-block__label">{title}</h2>
      <ul className="concept-list">
        {refs.map((ref) => (
          <li key={ref.uri}>
            {external ? (
              <a href={ref.uri} rel="noopener noreferrer" target="_blank">{ref.prefLabel}</a>
            ) : (
              <a href={withVersionParam(pageUrl('begrip', ref.slug!), version!)}>{ref.prefLabel}</a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
