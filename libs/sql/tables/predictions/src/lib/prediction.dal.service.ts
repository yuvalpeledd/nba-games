import { Injectable } from '@nestjs/common';
import { GameStatus } from '@nba/sql-games';
import { In, IsNull, Not } from 'typeorm';
import { PredictionCreateObject, PredictionEntity } from './prediction.entity';
import { PredictionRepo } from './prediction.repo';

@Injectable()
export class PredictionDalService {
  constructor(private readonly repo: PredictionRepo) {}

  // The user's pick of the game, made or replaced (by user and game).
  async set(prediction: PredictionCreateObject): Promise<PredictionEntity> {
    await this.repo.upsert(prediction, ['userId', 'gameId']);
    return this.repo.findOneByOrFail({
      userId: prediction.userId,
      gameId: prediction.gameId,
    });
  }

  // The user's predictions of a season's games (the year it starts in).
  findBySeason(userId: string, season: number): Promise<PredictionEntity[]> {
    return this.repo.find({ where: { userId, game: { season } } });
  }

  // A game's predictions that have a pick (a taken-back one isn't a prediction).
  findByGame(gameId: string): Promise<PredictionEntity[]> {
    return this.repo.find({ where: { gameId, pick: Not(IsNull()) } });
  }

  // The users' picks of games that are final with a winner (the ones there is a score for), with their games.
  findFinalByUsers(userIds: string[]): Promise<PredictionEntity[]> {
    return this.repo.find({
      where: {
        userId: In(userIds),
        pick: Not(IsNull()),
        game: { status: GameStatus.FINAL, winnerTeamId: Not(IsNull()) },
      },
      relations: { game: true },
    });
  }
}
