import { useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import type { Concept, GraphEdge, VersionsManifest } from '../lib/types';
import { buildAssetPath, conceptUrl, getVersionFromUrl, pageUrl, resolveVersion, withVersionParam } from '../lib/version';

interface Props {
  slug: string;
  defaultConcept: Concept;
  versionsManifest: VersionsManifest;
  embedded?: boolean;
  onSelectConcept?: (slug: string) => void;
}

const COLORS = {
  brand: '#00a7e5',
  brandDark: '#00427c',
  text: '#333333',
  border: '#b8d4e8',
  broader: '#00427c',
  narrower: '#0e83cd',
  related: '#666666',
  external: '#999999',
};

function labelSize(label: string, scale = 1): { width: number; height: number; fontSize: number; maxWidth: number } {
  const len = label.length;
  let base;
  if (len <= 12) base = { width: 90, height: 44, fontSize: 11, maxWidth: 80 };
  else if (len <= 20) base = { width: 110, height: 52, fontSize: 10, maxWidth: 100 };
  else base = { width: 130, height: 60, fontSize: 9, maxWidth: 120 };
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
    fontSize: Math.round(base.fontSize * scale),
    maxWidth: Math.round(base.maxWidth * scale),
  };
}

function fitGraph(cy: Core, padding: number) {
  cy.resize();
  cy.fit(cy.elements(), padding);
}

function layoutOptions(nodeCount: number, embedded?: boolean) {
  const compact = nodeCount <= 6;
  return {
    name: 'cose' as const,
    fit: false,
    animate: false,
    padding: embedded ? 16 : 32,
    nodeRepulsion: compact ? 3500 : 6000,
    idealEdgeLength: compact ? 70 : 100,
    edgeElasticity: 100,
    nestingFactor: 1.1,
    gravity: compact ? 1.2 : 0.8,
    numIter: compact ? 600 : 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  };
}

export default function RelationGraph({
  slug,
  defaultConcept,
  versionsManifest,
  embedded,
  onSelectConcept,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [concept, setConcept] = useState(defaultConcept);

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

      const externalCount = [...concept.exactMatchResolved, ...concept.closeMatchResolved].filter(
        (r) => !r.internal,
      ).length;
      const totalNodes = connected.size + externalCount;

      function nodeScaleFor(count: number) {
        return count <= 5 ? 1.15 : count <= 10 ? 1 : 0.9;
      }

      const nodeScale = nodeScaleFor(totalNodes);
      const elements: ElementDefinition[] = [];

      for (const nodeSlug of connected) {
        const isCenter = nodeSlug === concept.slug;
        const label = isCenter ? concept.prefLabel : (labelBySlug.get(nodeSlug) ?? nodeSlug);
        const size = labelSize(label, nodeScale);
        elements.push({
          data: {
            id: nodeSlug,
            label,
            center: isCenter ? 'true' : 'false',
            internal: 'true',
            nodeWidth: isCenter ? size.width + 20 : size.width,
            nodeHeight: isCenter ? size.height + 12 : size.height,
            fontSize: isCenter ? size.fontSize + 1 : size.fontSize,
            textMaxWidth: size.maxWidth,
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
          const size = labelSize(ref.prefLabel, nodeScale);
          elements.push({
            data: {
              id: extId,
              label: ref.prefLabel,
              center: 'false',
              internal: 'false',
              uri: ref.uri,
              nodeWidth: size.width,
              nodeHeight: size.height,
              fontSize: size.fontSize,
              textMaxWidth: size.maxWidth,
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

      const container = containerRef.current;
      const fitPadding = embedded ? 12 : 32;

      const cy = cytoscape({
        container,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'font-size': 'data(fontSize)',
              'font-family': 'helvetica, arial, sans-serif',
              'text-wrap': 'wrap',
              'text-max-width': 'data(textMaxWidth)',
              width: 'data(nodeWidth)',
              height: 'data(nodeHeight)',
              shape: 'round-rectangle',
              'background-color': '#ffffff',
              'border-width': 2,
              'border-color': COLORS.brand,
              'border-style': 'solid',
              color: COLORS.text,
              'text-outline-color': '#ffffff',
              'text-outline-width': 2,
            },
          },
          {
            selector: 'node[center = "true"]',
            style: {
              'background-color': COLORS.brandDark,
              'border-color': COLORS.brandDark,
              color: '#ffffff',
              'text-outline-color': COLORS.brandDark,
              'font-weight': 'bold',
            },
          },
          {
            selector: 'node[internal = "false"]',
            style: {
              'background-color': '#f5f9fc',
              'border-color': COLORS.external,
              'border-style': 'dashed',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 2,
              'line-color': COLORS.related,
              'target-arrow-color': COLORS.related,
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: 'edge[type = "broader"]',
            style: {
              'line-color': COLORS.broader,
              'target-arrow-color': COLORS.broader,
            },
          },
          {
            selector: 'edge[type = "narrower"]',
            style: {
              'line-color': COLORS.narrower,
              'target-arrow-color': COLORS.narrower,
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
              'line-color': COLORS.external,
            },
          },
        ],
        minZoom: 0.2,
        maxZoom: 3,
        wheelSensitivity: 0.3,
      });

      const layout = cy.layout(layoutOptions(totalNodes, embedded));
      layout.run();
      layout.one('layoutstop', () => fitGraph(cy, fitPadding));

      const resizeObserver = new ResizeObserver(() => {
        fitGraph(cy, fitPadding);
      });
      resizeObserver.observe(container);

      cy.on('tap', 'node', (event) => {
        const node = event.target;
        const id = node.data('id') as string;
        const isInternal = node.data('internal') === 'true';
        const uri = node.data('uri') as string | undefined;
        if (isInternal && id !== concept.slug) {
          if (embedded && onSelectConcept) {
            onSelectConcept(id);
          } else {
            window.location.href = withVersionParam(conceptUrl(id), version);
          }
        } else if (!isInternal && uri) {
          window.open(uri, '_blank', 'noopener,noreferrer');
        }
      });

      cyRef.current = cy;

      return () => resizeObserver.disconnect();
    }

    let disconnectResize: (() => void) | undefined;

    init()
      .then((cleanup) => {
        disconnectResize = cleanup;
      })
      .catch(() => {
        /* graph is optional enhancement */
      });

    return () => {
      cancelled = true;
      disconnectResize?.();
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [concept, versionsManifest, slug, embedded, onSelectConcept]);

  return (
    <section
      className={`relation-graph${embedded ? ' relation-graph--embedded' : ''}`}
      aria-labelledby="relation-graph-heading"
    >
      <h2 id="relation-graph-heading">Relatiegrafiek</h2>
      <div className="relation-graph__legend" aria-hidden="true">
        <span><i className="legend legend--broader" /> Breder</span>
        <span><i className="legend legend--narrower" /> Smaller</span>
        <span><i className="legend legend--related" /> Verwant</span>
      </div>
      <div
        ref={containerRef}
        className="relation-graph__canvas"
        role="img"
        aria-label={`Relatiegrafiek rond ${concept.prefLabel}`}
      />
    </section>
  );
}
