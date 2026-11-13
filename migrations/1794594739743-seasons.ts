import { MigrationInterface, QueryRunner } from 'typeorm';

export class Seasons1794594739743 implements MigrationInterface {
  name = 'Seasons1794594739743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "seasons" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" character varying NOT NULL, "name" character varying NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, CONSTRAINT "PK_cb8ed53b5fe109dcd4a4449ec9d" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seasons"`);
  }
}
