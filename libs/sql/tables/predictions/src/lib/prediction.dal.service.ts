import { Injectable } from '@nestjs/common';
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

  // Every user's prediction of the game (picks taken back included).
  findByGame(gameId: string): Promise<PredictionEntity[]> {
    return this.repo.find({ where: { gameId } });
  }
}
