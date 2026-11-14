// ESPN's abbreviations where they differ from the provider's.
const espnAbbreviations: Record<string, string> = {
  GSW: 'gs',
  NOP: 'no',
  NYK: 'ny',
  SAS: 'sa',
  UTA: 'utah',
  WAS: 'wsh',
};

// A team's logo, from ESPN's CDN (the provider has none).
// ponytail: hotlinked; an old franchise's 404s, and MUI's Avatar then shows its children (the abbreviation).
export const teamLogoUrl = (abbreviation: string) =>
  `https://a.espncdn.com/i/teamlogos/nba/500/${espnAbbreviations[abbreviation] ?? abbreviation.toLowerCase()}.png`;
