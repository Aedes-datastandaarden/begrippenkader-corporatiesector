import { useEffect, useState } from 'react';
import type { Collection, Concept, Scheme, VersionsManifest } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';
import SearchBar from './SearchBar';
import ConceptBrowser from './ConceptBrowser';

interface Props {
  defaultScheme: Scheme;
  defaultCollections: Collection[];
  defaultConcepts: Concept[];
  versionsManifest: VersionsManifest;
}

export default function HomeContent({
  defaultScheme,
  defaultCollections,
  defaultConcepts,
  versionsManifest,
}: Props) {
  const [version, setVersion] = useState(versionsManifest.latest);
  const [scheme, setScheme] = useState(defaultScheme);
  const [collections, setCollections] = useState(defaultCollections);
  const [concepts, setConcepts] = useState(defaultConcepts);

  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    setVersion(active);
    if (active === versionsManifest.latest) {
      setScheme(defaultScheme);
      setCollections(defaultCollections);
      setConcepts(defaultConcepts);
      return;
    }
    Promise.all([
      fetch(buildAssetPath(`build/${active}/scheme.json`)).then((r) => r.json()),
      fetch(buildAssetPath(`build/${active}/collections.json`)).then((r) => r.json()),
      fetch(buildAssetPath(`build/${active}/concepts.json`)).then((r) => r.json()),
    ])
      .then(([s, c, allConcepts]) => {
        setScheme(s);
        setCollections(c);
        setConcepts(allConcepts);
      })
      .catch(() => {
        setScheme(defaultScheme);
        setCollections(defaultCollections);
        setConcepts(defaultConcepts);
      });
  }, [versionsManifest, defaultScheme, defaultCollections, defaultConcepts]);

  return (
    <>
      {scheme.description && <p className="lead">{scheme.description}</p>}

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

      <ConceptBrowser defaultConcepts={concepts} versionsManifest={versionsManifest} />
    </>
  );
}
