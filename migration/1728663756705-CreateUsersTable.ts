import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersTable1728663756705 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tworzenie typu ENUM dla kolumny account_type
        await queryRunner.query(`
            CREATE TYPE "public"."users_account_type_enum" AS ENUM ('employee', 'manager');
        `);

        // Tworzenie tabeli users
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "name" character varying(50) NOT NULL,
                "last_name" character varying(50) NOT NULL,
                "email" character varying(50) NOT NULL,
                "password_hash" character varying(255) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "account_type" "public"."users_account_type_enum" NOT NULL,
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usunięcie tabeli users
        await queryRunner.query(`
            DROP TABLE "users";
        `);

        // Usunięcie typu ENUM users_account_type_enum
        await queryRunner.query(`
            DROP TYPE "public"."users_account_type_enum";
        `);
    }
}
