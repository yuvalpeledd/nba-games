import { MigrationInterface, QueryRunner } from 'typeorm';

export class Scans1794603851520 implements MigrationInterface {
  name = 'Scans1794603851520';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "scans" ("created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "finished_at" TIMESTAMP WITH TIME ZONE NOT NULL, "success" boolean NOT NULL, "inserted" integer NOT NULL, "updated" integer NOT NULL, "unchanged" integer NOT NULL, "error" text, CONSTRAINT "PK_41156c08314b9e541c1cb18c588" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scans"`);
  }
}
