import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameDays1794596072827 implements MigrationInterface {
  name = 'GameDays1794596072827';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "game_days" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date" date NOT NULL, "games" integer NOT NULL, "checked_on" date NOT NULL, CONSTRAINT "PK_20d6f6d7d0cceac98997f95d3ba" PRIMARY KEY ("date"))`,
    );
    // The days already in `games` were checked: by their last write, in the league's day.
    await queryRunner.query(
      `INSERT INTO "game_days" ("date", "games", "checked_on")
       SELECT "date", COUNT(*), MAX("updated_at" AT TIME ZONE 'America/New_York')::date
       FROM "games" GROUP BY "date"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "game_days"`);
  }
}
