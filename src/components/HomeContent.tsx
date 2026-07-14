import { useEffect, useState } from 'react';
import type { Collection, Scheme, VersionsManifest } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';
import SearchBar from './SearchBar';

interface Props {
  defaultScheme: Scheme;
  defaultCollections: Collection[];
  defaultTopConcepts: { slug: string; prefLabel: string }[];
  versionsManifest: VersionsManifest;
}

export default function HomeContent({
  defaultScheme,
  defaultCollections,
  defaultTopConcepts,
  versionsManifest,
}: Props) {
  const [version, setVersion] = useState(versionsManifest.latest);
  const [scheme, setScheme] = useState(defaultScheme);
  const [collections, setCollections] = useState(defaultCollections);
  const [topConcepts, setTopConcepts] = useState(defaultTopConcepts);
  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    setVersion(active);
    if (active === versionsManifest.latest) {
      setScheme(defaultScheme);
      setCollections(defaultCollections);
      setTopConcepts(defaultTopConcepts);
      return;
    }
    Promise.all([
      fetch(buildAssetPath(`build/${active}/scheme.json`)).then((r) => r.json()),
      fetch(buildAssetPath(`build/${active}/collections.json`)).then((r) => r.json()),
      fetch(buildAssetPath(`build/${active}/top-concepts.json`)).then((r) => r.json()),
    ])
      .then(([s, c, t]) => {
        setScheme(s);
        setCollections(c);
        setTopConcepts(t);
      })
      .catch(() => {
        setScheme(defaultScheme);
        setCollections(defaultCollections);
        setTopConcepts(defaultTopConcepts);
      });
  }, [versionsManifest, defaultScheme, defaultCollections, defaultTopConcepts]);

  return (
    <>
      <h1>{scheme.title}</h1>
      {scheme.description && <p>{scheme.description}</p>}
      {scheme.note && <div className="status-banner" role="status">{scheme.note}</div>}

      <SearchBar version={version} />

      <section aria-labelledby="collections-heading">
        <h2 id="collections-heading">Thematische collecties</h2>
        <div className="card-grid">
          {collections.map((collection) => (
            <a
              key={collection.slug}
              className="card"
              href={withVersionParam(pageUrl('collectie', collection.slug), version)}
            >
              <p className="card__title">{collection.prefLabel}</p>
              <p className="card__meta">{collection.memberCount} begrippen</p>
            </a>
          ))}
        </div>
      </section>

      <section aria-labelledby="top-heading">
        <details className="top-concepts">
          <summary id="top-heading">Topbegrippen ({topConcepts.length})</summary>
          <ul className="concept-list">
            {topConcepts.map((concept) => (
              <li key={concept.slug}>
                <a href={withVersionParam(pageUrl('begrip', concept.slug), version)}>{concept.prefLabel}</a>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}
