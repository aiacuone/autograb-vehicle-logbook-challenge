// The dropdown endpoints from ADR 0004. Names are encoded, since models such as "Falcon Ute" have spaces.

export const makesUrl = '/api/makes';

export function modelsUrl(make: string): string {
  return `/api/makes/${encodeURIComponent(make)}/models`;
}

export function badgesUrl(make: string, model: string): string {
  return `${modelsUrl(make)}/${encodeURIComponent(model)}/badges`;
}
