export interface Source {
  text: string | null;
  category: 'overgenomen' | 'afgeleid' | 'eigen' | null;
  url: string | null;
}

export interface RelationRef {
  uri: string;
  slug: string | null;
  prefLabel: string;
  internal: boolean;
}

export interface Concept {
  uri: string;
  slug: string;
  prefLabel: string;
  altLabels: string[];
  hiddenLabels: string[];
  definition: string;
  comment: string;
  scopeNote: string;
  changeNote: string;
  historyNote: string;
  example: string;
  sources: Source[];
  inScheme: string;
  isTopConcept: boolean;
  broader: string[];
  narrower: string[];
  related: string[];
  exactMatch: string[];
  closeMatch: string[];
  broaderResolved: RelationRef[];
  narrowerResolved: RelationRef[];
  relatedResolved: RelationRef[];
  exactMatchResolved: RelationRef[];
  closeMatchResolved: RelationRef[];
}

export interface Collection {
  uri: string;
  slug: string;
  prefLabel: string;
  memberCount: number;
  members: { uri: string; slug: string; prefLabel: string }[];
}

export interface Scheme {
  uri: string;
  title: string;
  description: string;
  created: string;
  modified: string;
  language: string;
  note: string;
}

export interface VersionEntry {
  id: string;
  label: string;
  date: string;
  file: string;
  status?: string;
}

export interface VersionsManifest {
  latest: string;
  versions: VersionEntry[];
}

export interface SearchIndexEntry {
  id: string;
  prefLabel: string;
  altLabels: string[];
  hiddenLabels: string[];
  definition: string;
  comment: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'broader' | 'narrower' | 'related';
}
