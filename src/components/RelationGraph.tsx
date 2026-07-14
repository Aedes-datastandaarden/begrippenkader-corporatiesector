import { useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import type { Concept, GraphEdge } from '../lib/types';
import { buildAssetPath, getVersionFromUrl, resolveVersion } from '../lib/version';

interface Props {
  slug: string;
  defaultConcept: Concept;
  versionsManifest: { latest: string; versions: { id: string }[] };
}

const EDGE_COLORS: Record<string, string> = {
  broader: '#2563eb',
  narrower: '#16a34a',
  related: '#6b7280',
};

export default function RelationGraph({ slug, defaultConcept, versionsManifest }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [concept, setConcept] = useState(defaultConcept);
  const base = buildAssetPath('');

  useEffect(() => {
    const active = resolveVersion(versionsManifest, getVersionFromUrl());
    if (active === versionsManifest.latest) {
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

  useEffect(() => {
    const version = resolveVersion(versionsManifest, getVersionFromUrl());
    let cancelled = false;

    async function init() {
      const [edgesResponse, conceptsResponse] = await Promise.all([
        fetch(buildAssetPath(`build/${version}/graph-edges.json`)),
        fetch(buildAssetPath(`build/${version}/concepts.json`)),
      ]);
      const allEdges: GraphEdge[] = await edgesResponse.json();
      const allConcepts: Concept[] = await conceptsResponse.json();
      const labelBySlug = new Map(allConcepts.map((c) => [c.slug, c.prefLabel]));

      const connected = new Set<string>([concept.slug]);
      const localEdges = allEdges.filter((edge) => {
        if (edge.source === concept.slug || edge.target === concept.slug) {
          connected.add(edge.source);
          connected.add(edge.target);
          return true;
        }
        return false;
      });

      const elements: ElementDefinition[] = [];

      for (const slug of connected) {
        const isCenter = slug === concept.slug;
        elements.push({
          data: {
            id: slug,
            label: slug === concept.slug ? concept.prefLabel : (labelBySlug.get(slug) ?? slug),
            center: isCenter,
            internal: true,
          },
        });
      }

      for (const edge of localEdges) {
        elements.push({
          data: {
            id: `${edge.source}-${edge.type}-${edge.target}`,
            source: edge.source,
            target: edge.target,
            type: edge.type,
          },
        });
      }

      for (const ref of [...concept.exactMatchResolved, ...concept.closeMatchResolved]) {
        if (!ref.internal) {
          const extId = `ext-${ref.uri}`;
          elements.push({
            data: {
              id: extId,
              label: ref.prefLabel,
              center: false,
              internal: false,
              uri: ref.uri,
            },
          });
          elements.push({
            data: {
              id: `${concept.slug}-ext-${ref.uri}`,
              source: concept.slug,
              target: extId,
              type: ref.uri.includes('exact') ? 'exactMatch' : 'closeMatch',
            },
          });
        }
      }

      if (cancelled || !containerRef.current) return;

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': '10px',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              width: 48,
              height: 48,
              'background-color': '#e8f0f7',
              'border-width': 2,
              'border-color': '#003d6b',
              color: '#1a1a1a',
            },
          },
          {
            selector: 'node[center = true]',
            style: {
              'background-color': '#003d6b',
              color: '#ffffff',
              width: 64,
              height: 64,
              'font-size': '11px',
              'font-weight': 'bold',
            },
          },
          {
            selector: 'node[internal = false]',
            style: {
              'background-color': '#f3f4f6',
              'border-color': '#9ca3af',
              'border-style': 'dashed',
              shape: 'round-rectangle',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': '#6b7280',
              'target-arrow-color': '#6b7280',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'edge[type = "broader"]',
            style: {
              'line-color': EDGE_COLORS.broader,
              'target-arrow-color': EDGE_COLORS.broader,
            },
          },
          {
            selector: 'edge[type = "narrower"]',
            style: {
              'line-color': EDGE_COLORS.narrower,
              'target-arrow-color': EDGE_COLORS.narrower,
            },
          },
          {
            selector: 'edge[type = "related"]',
            style: {
              'line-style': 'dashed',
              'target-arrow-shape': 'none',
            },
          },
          {
            selector: 'edge[type = "exactMatch"], edge[type = "closeMatch"]',
            style: {
              'line-style': 'dotted',
              'target-arrow-shape': 'none',
              'line-color': '#9ca3af',
            },
          },
        ],
        layout: {
          name: 'concentric',
          fit: true,
          padding: 24,
          concentric: (node) => (node.data('center') ? 2 : 1),
          levelWidth: () => 2,
        },
        minZoom: 0.4,
        maxZoom: 2.5,
        wheelSensitivity: 0.3,
      });

      cy.on('tap', 'node', (event) => {
        const node = event.target;
        const id = node.data('id') as string;
        const isInternal = node.data('internal') as boolean;
        const uri = node.data('uri') as string | undefined;
        if (isInternal && id !== concept.slug) {
          window.location.href = `${base}begrip/${id}?v=${encodeURIComponent(version)}`;
        } else if (!isInternal && uri) {
          window.open(uri, '_blank', 'noopener,noreferrer');
        }
      });

      cyRef.current = cy;
    }

    init().catch(() => {
      /* graph is optional enhancement */
    });

    return () => {
      cancelled = true;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [concept, versionsManifest, base, slug]);

  return (
    <details className="relation-graph" open={typeof window !== 'undefined' && window.innerWidth >= 768}>
      <summary>Relatiegrafiek</summary>
      <div
        ref={containerRef}
        className="relation-graph__canvas"
        role="img"
        aria-label={`Relatiegrafiek rond ${concept.prefLabel}`}
      />
    </details>
  );
}
