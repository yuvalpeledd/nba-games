export { StandingHistoryModule } from './lib/standing-history.module';
export { StandingHistoryDalService } from './lib/standing-history.dal.service';
// A value for the other sql libs (relations); everyone else imports it as a type.
export { StandingHistoryEntity } from './lib/standing-history.entity';
export type { StandingHistoryCreateObject } from './lib/standing-history.entity';
export type { StandingsWritten } from './lib/standing-history.dal.service';
