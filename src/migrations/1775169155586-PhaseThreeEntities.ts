import { MigrationInterface, QueryRunner } from "typeorm";

export class PhaseThreeEntities1775169155586 implements MigrationInterface {
    name = 'PhaseThreeEntities1775169155586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vendor_onboarding_fees" RENAME COLUMN "stripePaymentIntentId" TO "paystackReference"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "stripePaymentIntentId"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "currency" character varying(3) NOT NULL DEFAULT 'GHS'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paystackReference" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "UQ_199a710c053a4272f38c52fea17" UNIQUE ("paystackReference")`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paystackTransactionId" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentUrl" character varying`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum" RENAME TO "orders_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled', 'failed')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum_old" AS ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."orders_status_enum_old" RENAME TO "orders_status_enum"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentUrl"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paystackTransactionId"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "UQ_199a710c053a4272f38c52fea17"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paystackReference"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "currency"`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "stripePaymentIntentId" character varying`);
        await queryRunner.query(`ALTER TABLE "vendor_onboarding_fees" RENAME COLUMN "paystackReference" TO "stripePaymentIntentId"`);
    }

}
