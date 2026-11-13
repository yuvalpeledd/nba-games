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
  homeGames: 'Games played at home against this team, every season',
  homeWinRate: 'The share of those home games won',
  awayGames: 'Games played on the road against this team, every season',
  awayWinRate: 'The share of those road games won',
  streak: 'Current streak: W (wins) or L (losses) and how many in a row',
  jerseyNumber: 'Jersey number',
  position: 'Position: G guard, F forward, C center',
  height: 'Height, in feet and inches',
  weight: 'Weight, in pounds',
  experience: 'Years in the league (R: rookie)',
  predictionsLeft:
    "This week's games (Monday to Sunday) you haven't picked yet that haven't begun",
  predictionsSuccess:
    'The share of your picks that were right, of the games that ended with a winner',
  groupScore:
    'A point for each right pick, of the games scored since joining the group',
  groupPicked: "The group's members who picked this game's winner",
  groupPickShare:
    'How many of those who picked chose this team, and their share',
  groupRight: 'How many of the picks were right, and their share',
} as const;
