import { useEffect, useState } from 'react';
import type { Concept, VersionsManifest } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';
import ConceptDetailView from './ConceptDetailView';

interface Props {
  slug: string;
  defaultConcept: Concept;
  versionsManifest: VersionsManifest;
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

  return (
    <>
      <p className="concept-detail__back">
        <a href={withVersionParam(pageUrl(), version)}>← Terug naar overzicht</a>
      </p>
      <ConceptDetailView concept={concept} version={version} />
      <p className="uri-meta">
        <small>
          Canonieke URI: <a href={concept.uri}>{concept.uri}</a>
        </small>
      </p>
    </>
  );
}
