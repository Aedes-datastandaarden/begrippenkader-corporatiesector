import type { VersionsManifest } from './types';

const STORAGE_KEY = 'skos-viewer-version';

export function getBaseUrl(): string {
  return import.meta.env.BASE_URL;
}

export function buildAssetPath(path: string): string {
  const base = getBaseUrl().replace(/\/?$/, '/');
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalized}`;
}

/** Build a page URL without trailing slash (matches `trailingSlash: 'never'`). */
export function pageUrl(...parts: string[]): string {
  const base = getBaseUrl().replace(/\/$/, '') || '/';
  if (parts.length === 0) return base;
  return `${base}/${parts.join('/')}`;
}

/** URL for a concept detail page, e.g. `/begrippenkader-corporatiesector/id/begrip/aftoppingsgrens`. */
export function conceptUrl(slug: string): string {
  return pageUrl('id', 'begrip', slug);
}

export function getVersionFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

export function getStoredVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, version);
  } catch {
    /* ignore */
  }
}

export function resolveVersion(manifest: VersionsManifest, override?: string | null): string {
  const requested = override ?? getVersionFromUrl() ?? getStoredVersion();
  if (requested && manifest.versions.some((v) => v.id === requested)) {
    return requested;
  }
  return manifest.latest;
}

export function versionedPath(version: string, file: string): string {
  return buildAssetPath(`build/${version}/${file}`);
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Kan ${path} niet laden (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function withVersionParam(url: string, version: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

export function setVersionAndReload(version: string): void {
  storeVersion(version);
  const url = new URL(window.location.href);
  url.searchParams.set('v', version);
  window.location.href = url.toString();
}
