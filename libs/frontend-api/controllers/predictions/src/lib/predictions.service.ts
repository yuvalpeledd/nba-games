import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isPredictionLocked,
  isPredictionTooEarly,
  PREDICTION_WINDOW_DAYS,
  type PredictionDto,
} from '@nba/dtos-predictions';
import { ErrorCode } from '@nba/enums';
import { GameDalService } from '@nba/sql-games';
import {
  PredictionDalService,
  type PredictionEntity,
  type PredictionPick,
} from '@nba/sql-predictions';

const toPredictionDto = ({
  gameId,
  pick,
}: PredictionEntity): PredictionDto => ({ gameId, pick });

@Injectable()
export class PredictionsService {
  constructor(
    private readonly predictions: PredictionDalService,
    private readonly games: GameDalService,
  ) {}

  async findBySeason(userId: string, season: number): Promise<PredictionDto[]> {
    const predictions = await this.predictions.findBySeason(userId, season);
    return predictions.map(toPredictionDto);
  }

  // Only before the game begins (isPredictionLocked): 409 PREDICTION_LOCKED after; and only within
  // PREDICTION_WINDOW_DAYS of it (isPredictionTooEarly): 409 PREDICTION_NOT_OPEN before.
  async set(
    userId: string,
    gameId: string,
    pick: PredictionPick | null,
  ): Promise<PredictionDto> {
    const game = await this.games.findById(gameId);
    if (!game) throw new NotFoundException(`Game ${gameId} not found`);
    if (isPredictionLocked(game)) {
      throw new ConflictException({
        statusCode: 409,
        message: 'This game has begun: its predictions are locked',
        code: ErrorCode.PREDICTION_LOCKED,
      });
    }
    if (isPredictionTooEarly(game)) {
      throw new ConflictException({
        statusCode: 409,
        message: `Predictions open ${PREDICTION_WINDOW_DAYS} days before the game`,
        code: ErrorCode.PREDICTION_NOT_OPEN,
      });
    }
    return toPredictionDto(
      await this.predictions.set({ userId, gameId, pick }),
    );
  }
}
