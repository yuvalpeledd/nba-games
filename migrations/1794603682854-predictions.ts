import { MigrationInterface, QueryRunner } from 'typeorm';

export class Predictions1794603682854 implements MigrationInterface {
  name = 'Predictions1794603682854';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."predictions_pick_enum" AS ENUM('Home', 'Away')`,
    );
    await queryRunner.query(
      `CREATE TABLE "predictions" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "game_id" character varying NOT NULL, "pick" "public"."predictions_pick_enum", CONSTRAINT "UQ_08f437b2f473ce7cf973fe24431" UNIQUE ("user_id", "game_id"), CONSTRAINT "PK_b92c9e4db595214b289f5e28adc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "predictions" ADD CONSTRAINT "FK_8e4b27973471685734e213da971" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "predictions" ADD CONSTRAINT "FK_bca25a79b8b67af14875413d733" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "predictions" DROP CONSTRAINT "FK_bca25a79b8b67af14875413d733"`,
    );
    await queryRunner.query(
      `ALTER TABLE "predictions" DROP CONSTRAINT "FK_8e4b27973471685734e213da971"`,
    );
    await queryRunner.query(`DROP TABLE "predictions"`);
    await queryRunner.query(`DROP TYPE "public"."predictions_pick_enum"`);
  }
}
