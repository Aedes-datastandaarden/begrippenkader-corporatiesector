export function getBegripFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('begrip');
}

export function setBegripInUrl(slug: string): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('begrip', slug);
  window.history.replaceState(null, '', url.toString());
}

export function clearBegripFromUrl(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('begrip');
  window.history.replaceState(null, '', url.toString());
}
