import { useEffect, useMemo, useRef, useState } from 'react';
import type { Concept, VersionsManifest } from '../lib/types';
import { getBegripFromUrl, clearBegripFromUrl } from '../lib/url-state';
import { useMediaQuery } from '../lib/useMediaQuery';
import ConceptDetailView from './ConceptDetailView';
import RelationGraph from './RelationGraph';

interface Props {
  concepts: Concept[];
  versionsManifest: VersionsManifest;
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

type FilterMode = 'all' | 'top';

const DESKTOP_PAGE_SIZE = 18;
const MOBILE_PAGE_SIZE = 12;

export default function ConceptExplorer({
  concepts,
  versionsManifest,
  selectedSlug,
  onSelect,
}: Props) {
  const isMobile = useMediaQuery('(max-width: 48rem)');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 48rem)').matches && !!getBegripFromUrl();
  });
  const mobileReady = useRef(false);
  const prevSlug = useRef<string | null>(null);

  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;

  const filtered = useMemo(() => {
    const list = filter === 'top' ? concepts.filter((c) => c.isTopConcept) : concepts;
    return [...list].sort((a, b) => a.prefLabel.localeCompare(b.prefLabel, 'nl'));
  }, [concepts, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  useEffect(() => {
    if (!selectedSlug) return;
    const index = filtered.findIndex((c) => c.slug === selectedSlug);
    if (index >= 0) {
      const targetPage = Math.floor(index / pageSize) + 1;
      setPage((current) => (current === targetPage ? current : targetPage));
    }
  }, [selectedSlug, filtered, pageSize]);

  useEffect(() => {
    if (!isMobile) {
      setDetailOpen(false);
      mobileReady.current = false;
      prevSlug.current = null;
      return;
    }
    if (!mobileReady.current) {
      mobileReady.current = true;
      if (getBegripFromUrl()) setDetailOpen(true);
      prevSlug.current = selectedSlug;
      return;
    }
    if (selectedSlug && prevSlug.current !== null && selectedSlug !== prevSlug.current) {
      setDetailOpen(true);
    }
    prevSlug.current = selectedSlug;
  }, [isMobile, selectedSlug]);

  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedConcept = selectedSlug ? concepts.find((c) => c.slug === selectedSlug) : undefined;

  function selectConcept(slug: string) {
    onSelect(slug);
    if (isMobile) setDetailOpen(true);
  }

  function showList() {
    setDetailOpen(false);
    if (isMobile) clearBegripFromUrl();
  }

  const showListPanel = !isMobile || !detailOpen;
  const showDetailPanel = !isMobile || detailOpen;

  return (
    <section
      className={`concept-explorer${isMobile && detailOpen ? ' concept-explorer--detail-open' : ''}`}
      aria-label="Begrippen verkenner"
    >
      {showListPanel && (
        <aside className="concept-explorer__list-panel" aria-labelledby="concepts-heading">
          <div className="concept-explorer__list-header">
            <h2 id="concepts-heading">Begrippen</h2>
            <div className="concept-browser__filter" role="group" aria-label="Filter begrippen">
              <button
                type="button"
                className={filter === 'all' ? 'is-active' : undefined}
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                Alle ({concepts.length})
              </button>
              <button
                type="button"
                className={filter === 'top' ? 'is-active' : undefined}
                aria-pressed={filter === 'top'}
                onClick={() => setFilter('top')}
              >
                Top ({concepts.filter((c) => c.isTopConcept).length})
              </button>
            </div>
          </div>

          <ul className="concept-explorer__list" role="listbox" aria-label="Begrippenlijst">
            {pageItems.map((concept) => (
              <li key={concept.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={concept.slug === selectedSlug}
                  className={`concept-explorer__item${concept.slug === selectedSlug ? ' is-selected' : ''}`}
                  onClick={() => selectConcept(concept.slug)}
                >
                  {concept.prefLabel}
                </button>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav className="concept-explorer__pagination" aria-label="Paginering begrippen">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </nav>
          )}
        </aside>
      )}

      {showDetailPanel && (
        <div className="concept-explorer__detail-panel">
          {isMobile && detailOpen && (
            <button type="button" className="concept-explorer__back" onClick={showList}>
              ← Begrippen
            </button>
          )}
          {selectedConcept ? (
            <>
              <ConceptDetailView
                concept={selectedConcept}
                embedded
                onSelectConcept={selectConcept}
              />
              <RelationGraph
                slug={selectedConcept.slug}
                defaultConcept={selectedConcept}
                versionsManifest={versionsManifest}
                embedded
                onSelectConcept={selectConcept}
              />
            </>
          ) : (
            <p className="concept-explorer__empty">Selecteer een begrip uit de lijst.</p>
          )}
        </div>
      )}
    </section>
  );
}
