ALTER TABLE "invoices" DROP CONSTRAINT "invoices_jumlah_tagihan_non_negative_chk";--> statement-breakpoint
DROP INDEX "invoices_belum_bayar_arrears_idx";--> statement-breakpoint
CREATE INDEX "invoices_belum_bayar_arrears_idx" ON "invoices" ("belum_bayar") WHERE abs("belum_bayar") > 0;--> statement-breakpoint
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_belum_bayar_range_chk", ADD CONSTRAINT "invoices_belum_bayar_range_chk" CHECK (abs("belum_bayar") <= abs("jumlah_tagihan"));