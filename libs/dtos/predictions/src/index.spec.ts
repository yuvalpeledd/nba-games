import { GameStatus } from '@nba/sql-games/enums';
import { PredictionPick } from '@nba/sql-predictions/enums';
import { isPredictionLocked, scorePrediction } from './index';

describe('isPredictionLocked', () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  const later = '2026-11-13T23:00:00.000Z';

  it('is open before the start time while the game is scheduled, postponed or delayed', () => {
    for (const status of [
      GameStatus.SCHEDULED,
      GameStatus.POSTPONED,
      GameStatus.DELAYED,
    ]) {
      expect(isPredictionLocked({ startTime: later, status }, now)).toBe(false);
    }
  });

  it('locks at the start time and after it', () => {
    const status = GameStatus.SCHEDULED;
    expect(isPredictionLocked({ startTime: new Date(now), status }, now)).toBe(
      true,
    );
    expect(
      isPredictionLocked({ startTime: '2026-11-12T23:00:00Z', status }, now),
    ).toBe(true);
  });

  it('locks a game that has started, ended or been called off, whatever its start time', () => {
    for (const status of [
      GameStatus.IN_PROGRESS,
      GameStatus.FINAL,
      GameStatus.CANCELED,
      GameStatus.SUSPENDED,
    ]) {
      expect(isPredictionLocked({ startTime: later, status }, now)).toBe(true);
    }
  });
});

describe('scorePrediction', () => {
  const final = {
    status: GameStatus.FINAL,
    homeTeamId: 'nba-bos',
    winnerTeamId: 'nba-bos',
  };

  it('is right when the picked side won, wrong when the other did', () => {
    expect(scorePrediction({ pick: PredictionPick.HOME }, final)).toBe(true);
    expect(scorePrediction({ pick: PredictionPick.AWAY }, final)).toBe(false);
    const awayWon = { ...final, winnerTeamId: 'nba-nyk' };
    expect(scorePrediction({ pick: PredictionPick.AWAY }, awayWon)).toBe(true);
    expect(scorePrediction({ pick: PredictionPick.HOME }, awayWon)).toBe(false);
  });

  it('scores nothing without a pick, before the game is final, or when it was canceled', () => {
    expect(scorePrediction(undefined, final)).toBeNull();
    expect(scorePrediction({ pick: null }, final)).toBeNull();
    for (const status of [GameStatus.IN_PROGRESS, GameStatus.CANCELED]) {
      expect(
        scorePrediction(
          { pick: PredictionPick.HOME },
          { ...final, status, winnerTeamId: null },
        ),
      ).toBeNull();
    }
  });
});
