CREATE TABLE "account_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"checked_by" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"catatan" text
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"no_akun" text NOT NULL UNIQUE,
	"client_id" uuid NOT NULL,
	"pic_id" text,
	"aktif" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"kunci" text PRIMARY KEY,
	"nilai" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" text NOT NULL,
	"sebelum" jsonb,
	"sesudah" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_reminder_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"client_id" uuid NOT NULL,
	"pic_id" text NOT NULL,
	"channel" text NOT NULL,
	"account_ids" jsonb NOT NULL,
	"pesan" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"nama" text NOT NULL,
	"nama_normal" text NOT NULL,
	"kontak_email" text,
	"kontak_whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"periode" date NOT NULL,
	"mata_uang" text DEFAULT 'IDR' NOT NULL,
	"jumlah_tagihan" bigint NOT NULL,
	"belum_bayar" bigint NOT NULL,
	"lokasi_bayar" text,
	"cicilan" boolean DEFAULT false NOT NULL,
	"tanggal_bayar" date,
	"jam_bayar" time,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_account_id_periode_unique" UNIQUE("account_id","periode"),
	CONSTRAINT "invoices_periode_day_one_chk" CHECK (extract(day from "periode") = 1),
	CONSTRAINT "invoices_jumlah_tagihan_non_negative_chk" CHECK ("jumlah_tagihan" >= 0),
	CONSTRAINT "invoices_belum_bayar_range_chk" CHECK ("belum_bayar" >= 0 AND "belum_bayar" <= "jumlah_tagihan")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"tipe" text NOT NULL,
	"judul" text NOT NULL,
	"isi" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL UNIQUE,
	"email_status" text NOT NULL,
	"email_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "snoozes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"alasan" text NOT NULL,
	"covered_through_periode" date NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "account_checks_account_id_idx" ON "account_checks" ("account_id");--> statement-breakpoint
CREATE INDEX "accounts_pic_id_idx" ON "accounts" ("pic_id");--> statement-breakpoint
CREATE INDEX "accounts_client_id_idx" ON "accounts" ("client_id");--> statement-breakpoint
CREATE INDEX "accounts_last_checked_at_idx" ON "accounts" ("last_checked_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "clients_nama_normal_idx" ON "clients" ("nama_normal");--> statement-breakpoint
CREATE INDEX "invoices_belum_bayar_arrears_idx" ON "invoices" ("belum_bayar") WHERE "belum_bayar" > 0;--> statement-breakpoint
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications" ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "snoozes_account_id_idx" ON "snoozes" ("account_id");--> statement-breakpoint
ALTER TABLE "account_checks" ADD CONSTRAINT "account_checks_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "account_checks" ADD CONSTRAINT "account_checks_checked_by_user_id_fkey" FOREIGN KEY ("checked_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_pic_id_user_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "client_reminder_logs" ADD CONSTRAINT "client_reminder_logs_client_id_clients_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "client_reminder_logs" ADD CONSTRAINT "client_reminder_logs_pic_id_user_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "user"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "snoozes" ADD CONSTRAINT "snoozes_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "snoozes" ADD CONSTRAINT "snoozes_created_by_user_id_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL;