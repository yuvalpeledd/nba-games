// What each stat means, for its label's tooltip, so every page explains it the same way.
export const statHints = {
  seed: "The team's rank in its conference",
  wins: 'Wins',
  losses: 'Losses',
  record: 'Wins-losses this season',
  winPct: 'Win percentage: the share of its games the team won',
  gamesBehind:
    "Games behind the conference's leader: half the difference in wins plus half the difference in losses",
  conference: 'Record against teams of its own conference',
  home: 'Record at home',
  away: 'Record on the road',
  last10: 'Record in the last 10 games',
  streak: 'Current streak: W (wins) or L (losses) and how many in a row',
  jerseyNumber: 'Jersey number',
  position: 'Position: G guard, F forward, C center',
  height: 'Height, in feet and inches',
  weight: 'Weight, in pounds',
  experience: 'Years in the league (R: rookie)',
} as const;
