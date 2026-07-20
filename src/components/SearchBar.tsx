import { useEffect, useRef, useState } from 'react';
import MiniSearch, { type SearchResult } from 'minisearch';
import type { SearchIndexEntry } from '../lib/types';
import { buildAssetPath, conceptUrl, withVersionParam } from '../lib/version';

interface Props {
  version: string;
  onSelect?: (slug: string) => void;
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

export default function SearchBar({ version, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [index, setIndex] = useState<MiniSearch<SearchIndexEntry> | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(buildAssetPath(`build/${version}/search-index.json`))
      .then((r) => r.json())
      .then((data: SearchIndexEntry[]) => {
        if (cancelled) return;
        const ms = new MiniSearch<SearchIndexEntry>({
          fields: ['prefLabel', 'altLabels', 'hiddenLabels', 'definition', 'comment'],
          storeFields: ['prefLabel', 'definition'],
          searchOptions: {
            boost: { prefLabel: 3, altLabels: 2, definition: 1, comment: 0.5 },
            prefix: true,
            fuzzy: 0.2,
          },
        });
        ms.addAll(data);
        setIndex(ms);
      })
      .catch(() => setIndex(null));
    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    if (!index || !query.trim()) {
      setResults([]);
      return;
    }
    const found = index.search(query, { combineWith: 'AND' }).slice(0, 12);
    setResults(found);
    setOpen(true);
  }, [query, index]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="search-bar" ref={containerRef}>
      <label htmlFor="concept-search" className="sr-only">
        Zoek begrippen
      </label>
      <input
        id="concept-search"
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="search-results"
        aria-autocomplete="list"
        placeholder="Zoek op voorkeursterm, synoniem of definitie…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
      />
      {open && results.length > 0 && (
        <ul id="search-results" className="search-results" role="listbox">
          {results.map((result) => (
            <li key={result.id} role="option">
              {onSelect ? (
                <button
                  type="button"
                  className="search-results__button"
                  onClick={() => {
                    onSelect(result.id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span
                    className="search-results__label"
                    dangerouslySetInnerHTML={{
                      __html: highlight(result.prefLabel, query),
                    }}
                  />
                  {result.definition && (
                    <span
                      className="search-results__snippet"
                      dangerouslySetInnerHTML={{
                        __html: highlight(
                          result.definition.length > 120
                            ? `${result.definition.slice(0, 120)}…`
                            : result.definition,
                          query,
                        ),
                      }}
                    />
                  )}
                </button>
              ) : (
                <a href={withVersionParam(conceptUrl(result.id), version)}>
                  <span
                    className="search-results__label"
                    dangerouslySetInnerHTML={{
                      __html: highlight(result.prefLabel, query),
                    }}
                  />
                  {result.definition && (
                    <span
                      className="search-results__snippet"
                      dangerouslySetInnerHTML={{
                        __html: highlight(
                          result.definition.length > 120
                            ? `${result.definition.slice(0, 120)}…`
                            : result.definition,
                          query,
                        ),
                      }}
                    />
                  )}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .search-bar {
          position: relative;
          margin: 1.5rem 0;
        }
        .search-bar input {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          -webkit-appearance: none;
        }
        .search-bar input:focus {
          outline: 2px solid var(--color-accent);
          outline-offset: 1px;
        }
        .search-results {
          position: absolute;
          z-index: 20;
          top: 100%;
          left: 0;
          right: 0;
          margin: 0.25rem 0 0;
          padding: 0;
          list-style: none;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          max-height: 24rem;
          overflow-y: auto;
        }
        .search-results a,
        .search-results__button {
          display: block;
          width: 100%;
          padding: 0.625rem 1rem;
          text-decoration: none;
          color: inherit;
          border: none;
          border-bottom: 1px solid var(--color-border);
          background: transparent;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .search-results a:hover,
        .search-results__button:hover {
          background: var(--color-accent-light);
        }
        .search-results__label {
          display: block;
          font-weight: 600;
        }
        .search-results__snippet {
          display: block;
          font-size: 0.875rem;
          color: var(--color-muted);
          margin-top: 0.125rem;
        }
        .search-results mark {
          background: #fff3b0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}
