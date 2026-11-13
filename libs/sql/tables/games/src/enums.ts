// No imports: also the lib's second entry point, @nba/sql-games/enums, for dtos and the web.
// The values are the provider's (GET /v1/basketballgames), so the fetcher stores them as they come.

export enum SeasonType {
  PRESEASON = 'preseason',
  REGULAR = 'regular',
  CUP_FINAL = 'cup_final',
  PLAY_IN = 'play_in',
  CONFERENCE_TOURNAMENT = 'conference_tournament',
  POSTSEASON = 'postseason',
}

export enum GameStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  FINAL = 'final',
  POSTPONED = 'postponed',
  CANCELED = 'canceled',
  SUSPENDED = 'suspended',
  DELAYED = 'delayed',
}
