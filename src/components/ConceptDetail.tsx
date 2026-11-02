import { useEffect, useState } from 'react';
import type { Collection, Concept, VersionsManifest } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';
import ConceptDetailView from './ConceptDetailView';

interface CollectionRef {
  slug: string;
  prefLabel: string;
}

interface Props {
  slug: string;
  defaultConcept: Concept;
  defaultCollection: CollectionRef | null;
  versionsManifest: VersionsManifest;
}

export default function ConceptDetail({ slug, defaultConcept, defaultCollection, versionsManifest }: Props) {
  const [concept, setConcept] = useState(defaultConcept);
  const [collection, setCollection] = useState<CollectionRef | null>(defaultCollection);
  const [version, setVersion] = useState(versionsManifest.latest);

  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    setVersion(active);
    if (active === versionsManifest.latest && defaultConcept.slug === slug) {
      setConcept(defaultConcept);
      setCollection(defaultCollection);
      return;
    }
    fetch(buildAssetPath(`build/${active}/concepts.json`))
      .then((r) => r.json())
      .then((concepts: Concept[]) => {
        const found = concepts.find((c) => c.slug === slug);
        if (found) setConcept(found);
      })
      .catch(() => setConcept(defaultConcept));
    fetch(buildAssetPath(`build/${active}/collections.json`))
      .then((r) => r.json())
      .then((collections: Collection[]) => {
        const owning = collections.find((c) => c.members.some((m) => m.slug === slug));
        setCollection(owning ? { slug: owning.slug, prefLabel: owning.prefLabel } : null);
      })
      .catch(() => setCollection(null));
  }, [slug, defaultConcept, defaultCollection, versionsManifest]);

  return (
    <>
      <p className="concept-detail__back">
        {collection && (
          <>
            <a href={withVersionParam(pageUrl('collectie', collection.slug), version)}>
              ← Terug naar {collection.prefLabel}
            </a>
            <span className="concept-detail__back-sep"> · </span>
          </>
        )}
        <a href={withVersionParam(pageUrl(), version)}>← Terug naar overzicht</a>
      </p>
      <ConceptDetailView concept={concept} version={version} />
    </>
  );
}
