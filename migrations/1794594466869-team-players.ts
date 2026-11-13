import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamPlayers1794594466869 implements MigrationInterface {
  name = 'TeamPlayers1794594466869';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "team_players" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date" date NOT NULL, "team_id" character varying NOT NULL, "player_id" character varying NOT NULL, CONSTRAINT "PK_938c57be30a03ca59c17430f01a" PRIMARY KEY ("date", "team_id", "player_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb64e801b38a08b9c6a0b5b911" ON "team_players"  ("player_id", "date") `,
    );
    await queryRunner.query(
      `ALTER TABLE "team_players" ADD CONSTRAINT "FK_d1c561e231a8067e2f7a403426c" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_players" ADD CONSTRAINT "FK_187fdfeb2ca268cf6b93e89ce12" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_players" DROP CONSTRAINT "FK_187fdfeb2ca268cf6b93e89ce12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_players" DROP CONSTRAINT "FK_d1c561e231a8067e2f7a403426c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb64e801b38a08b9c6a0b5b911"`,
    );
    await queryRunner.query(`DROP TABLE "team_players"`);
  }
}
