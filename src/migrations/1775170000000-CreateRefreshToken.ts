import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRefreshToken1775170000000 implements MigrationInterface {
    name = 'CreateRefreshToken1775170000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "UQ_71253a992fbcc5789cb9be398b7" UNIQUE ("token"), CONSTRAINT "PK_5d774a35cf97fd2bc443ce8a6e0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_afee15bbfa54e56592233ed9a60" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_afee15bbfa54e56592233ed9a60"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    }
}
