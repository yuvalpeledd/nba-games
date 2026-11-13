import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupUserScores1794610469720 implements MigrationInterface {
  name = 'GroupUserScores1794610469720';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "group_user_scores" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "user_id" uuid NOT NULL, "game_id" character varying NOT NULL, "score" integer NOT NULL, CONSTRAINT "UQ_0a493aecd1b92c70e3d19d98bd0" UNIQUE ("group_id", "user_id", "game_id"), CONSTRAINT "PK_9a4df0170805aa4a540ba58aa7c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" ADD CONSTRAINT "FK_274a92487cf7c7d6030fb2ebac0" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" ADD CONSTRAINT "FK_647f369ae97de3b252e4bed216f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" ADD CONSTRAINT "FK_52fd4a47981b1abe75ed5a1ba86" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" DROP CONSTRAINT "FK_52fd4a47981b1abe75ed5a1ba86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" DROP CONSTRAINT "FK_647f369ae97de3b252e4bed216f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "group_user_scores" DROP CONSTRAINT "FK_274a92487cf7c7d6030fb2ebac0"`,
    );
    await queryRunner.query(`DROP TABLE "group_user_scores"`);
  }
}
