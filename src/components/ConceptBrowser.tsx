import { useEffect, useMemo, useState } from 'react';
import type { Concept } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';

interface Props {
  defaultConcepts: Concept[];
  versionsManifest: { latest: string; versions: { id: string }[] };
}

type FilterMode = 'all' | 'top';

const PAGE_SIZE = 20;

export default function ConceptBrowser({ defaultConcepts, versionsManifest }: Props) {
  const [version, setVersion] = useState(versionsManifest.latest);
  const [concepts, setConcepts] = useState(defaultConcepts);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    setVersion(active);
    if (active === versionsManifest.latest) {
      setConcepts(defaultConcepts);
      return;
    }
    fetch(buildAssetPath(`build/${active}/concepts.json`))
      .then((r) => r.json())
      .then((data: Concept[]) => setConcepts(data))
      .catch(() => setConcepts(defaultConcepts));
  }, [defaultConcepts, versionsManifest]);

  useEffect(() => {
    setPage(1);
  }, [filter, version]);

  const filtered = useMemo(() => {
    const list = filter === 'top' ? concepts.filter((c) => c.isTopConcept) : concepts;
    return [...list].sort((a, b) => a.prefLabel.localeCompare(b.prefLabel, 'nl'));
  }, [concepts, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section aria-labelledby="concepts-heading" className="concept-browser">
      <div className="concept-browser__header">
        <h2 id="concepts-heading">Begrippen</h2>
        <div className="concept-browser__filter" role="group" aria-label="Filter begrippen">
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : undefined}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Alle begrippen ({concepts.length})
          </button>
          <button
            type="button"
            className={filter === 'top' ? 'is-active' : undefined}
            aria-pressed={filter === 'top'}
            onClick={() => setFilter('top')}
          >
            Alleen topbegrippen ({concepts.filter((c) => c.isTopConcept).length})
          </button>
        </div>
      </div>

      <ul className="concept-browser__list">
        {pageItems.map((concept) => (
          <li key={concept.slug}>
            <a href={withVersionParam(pageUrl('begrip', concept.slug), version)} className="concept-browser__item">
              <span className="concept-browser__label">{concept.prefLabel}</span>
              {concept.definition && (
                <span className="concept-browser__definition">
                  {concept.definition.length > 140
                    ? `${concept.definition.slice(0, 140)}…`
                    : concept.definition}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav className="concept-browser__pagination" aria-label="Paginering begrippen">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Vorige
          </button>
          <span>
            Pagina {currentPage} van {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Volgende
          </button>
        </nav>
      )}
    </section>
  );
}
