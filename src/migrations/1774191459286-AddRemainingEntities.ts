import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRemainingEntities1774191459286 implements MigrationInterface {
    name = 'AddRemainingEntities1774191459286'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."vendor_profiles_status_enum" AS ENUM('pending_payment', 'pending_review', 'approved', 'rejected', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "vendor_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "businessName" character varying NOT NULL, "registrationNumber" character varying, "contactEmail" character varying NOT NULL, "country" character varying(2) NOT NULL, "status" "public"."vendor_profiles_status_enum" NOT NULL DEFAULT 'pending_payment', "rejectionReason" text, "approvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "reviewed_by" uuid, CONSTRAINT "REL_193d7cc6d4254e2098da2eda45" UNIQUE ("user_id"), CONSTRAINT "PK_bcb47b1a47f4f1447447eaf73a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vendor_onboarding_fees_status_enum" AS ENUM('pending', 'paid', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "vendor_onboarding_fees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(12,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'USD', "stripePaymentIntentId" character varying, "status" "public"."vendor_onboarding_fees_status_enum" NOT NULL DEFAULT 'pending', "paidAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "vendor_id" uuid, CONSTRAINT "REL_2422a564986245af9db4e42a43" UNIQUE ("vendor_id"), CONSTRAINT "PK_83a12eb51b479ba97ee71577bdf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."vendor_documents_documenttype_enum" AS ENUM('business_registration', 'tax_certificate', 'id_proof', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."vendor_documents_verificationstatus_enum" AS ENUM('pending', 'verified', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "vendor_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "documentType" "public"."vendor_documents_documenttype_enum" NOT NULL, "fileKey" character varying NOT NULL, "fileUrl" character varying NOT NULL, "verificationStatus" "public"."vendor_documents_verificationstatus_enum" NOT NULL DEFAULT 'pending', "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(), "vendor_id" uuid, CONSTRAINT "PK_b6aa864f4d6f4a283445266a4dc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL, "cart_id" uuid, "product_id" uuid, CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "shared_carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sharedAt" TIMESTAMP NOT NULL DEFAULT now(), "cart_id" uuid, "shared_by" uuid, "shared_with" uuid, CONSTRAINT "PK_7f2a819c44afd182a373abdc44d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "unitPrice" numeric(12,2) NOT NULL, "order_id" uuid, "product_id" uuid, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'refunded', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "subtotal" numeric(12,2) NOT NULL, "tax" numeric(12,2) NOT NULL DEFAULT '0', "total" numeric(12,2) NOT NULL, "shippingAddress" jsonb NOT NULL, "stripePaymentIntentId" character varying, "placedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."friendships_status_enum" AS ENUM('pending', 'accepted', 'declined', 'blocked')`);
        await queryRunner.query(`CREATE TABLE "friendships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."friendships_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "requester_id" uuid, "addressee_id" uuid, CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "products" ADD "vendor_id" uuid`);
        await queryRunner.query(`ALTER TABLE "vendor_profiles" ADD CONSTRAINT "FK_193d7cc6d4254e2098da2eda45b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_profiles" ADD CONSTRAINT "FK_a3647c0bcdf371f2389dc4b6fad" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_onboarding_fees" ADD CONSTRAINT "FK_2422a564986245af9db4e42a437" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vendor_documents" ADD CONSTRAINT "FK_218ad2aece37d1c3bf7cfe6c72f" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d" FOREIGN KEY ("vendor_id") REFERENCES "vendor_profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_6385a745d9e12a89b859bb25623" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_items" ADD CONSTRAINT "FK_30e89257a105eab7648a35c7fce" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "carts" ADD CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shared_carts" ADD CONSTRAINT "FK_99ab7983d02307437c91a194582" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shared_carts" ADD CONSTRAINT "FK_de6daf6eea26f0d1be7207bac91" FOREIGN KEY ("shared_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shared_carts" ADD CONSTRAINT "FK_60bfe1307a7e64a1d7264e7cbda" FOREIGN KEY ("shared_with") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_9263386c35b6b242540f9493b00" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_01b0760fd2402d21f12c6dc5f89" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_01b0760fd2402d21f12c6dc5f89"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_9263386c35b6b242540f9493b00"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`);
        await queryRunner.query(`ALTER TABLE "shared_carts" DROP CONSTRAINT "FK_60bfe1307a7e64a1d7264e7cbda"`);
        await queryRunner.query(`ALTER TABLE "shared_carts" DROP CONSTRAINT "FK_de6daf6eea26f0d1be7207bac91"`);
        await queryRunner.query(`ALTER TABLE "shared_carts" DROP CONSTRAINT "FK_99ab7983d02307437c91a194582"`);
        await queryRunner.query(`ALTER TABLE "carts" DROP CONSTRAINT "FK_2ec1c94a977b940d85a4f498aea"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_30e89257a105eab7648a35c7fce"`);
        await queryRunner.query(`ALTER TABLE "cart_items" DROP CONSTRAINT "FK_6385a745d9e12a89b859bb25623"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d"`);
        await queryRunner.query(`ALTER TABLE "vendor_documents" DROP CONSTRAINT "FK_218ad2aece37d1c3bf7cfe6c72f"`);
        await queryRunner.query(`ALTER TABLE "vendor_onboarding_fees" DROP CONSTRAINT "FK_2422a564986245af9db4e42a437"`);
        await queryRunner.query(`ALTER TABLE "vendor_profiles" DROP CONSTRAINT "FK_a3647c0bcdf371f2389dc4b6fad"`);
        await queryRunner.query(`ALTER TABLE "vendor_profiles" DROP CONSTRAINT "FK_193d7cc6d4254e2098da2eda45b"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "vendor_id"`);
        await queryRunner.query(`DROP TABLE "friendships"`);
        await queryRunner.query(`DROP TYPE "public"."friendships_status_enum"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "shared_carts"`);
        await queryRunner.query(`DROP TABLE "carts"`);
        await queryRunner.query(`DROP TABLE "cart_items"`);
        await queryRunner.query(`DROP TABLE "vendor_documents"`);
        await queryRunner.query(`DROP TYPE "public"."vendor_documents_verificationstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."vendor_documents_documenttype_enum"`);
        await queryRunner.query(`DROP TABLE "vendor_onboarding_fees"`);
        await queryRunner.query(`DROP TYPE "public"."vendor_onboarding_fees_status_enum"`);
        await queryRunner.query(`DROP TABLE "vendor_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."vendor_profiles_status_enum"`);
    }

}
