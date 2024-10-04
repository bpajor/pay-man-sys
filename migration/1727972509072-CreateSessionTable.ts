import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSessionTable1727972509072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "session" (
              "sid" VARCHAR NOT NULL COLLATE "default",
              "sess" JSON NOT NULL,
              "expire" TIMESTAMP(6) NOT NULL,
              PRIMARY KEY ("sid")
            );
          `);

    await queryRunner.query(`
            CREATE INDEX "IDX_session_expire" ON "session" ("expire");
          `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_session_expire";`);
    await queryRunner.query(`DROP TABLE "session";`);
  }
}
