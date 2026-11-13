import "dotenv/config";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { appSettings } from "@/db/schema/domain";
import { user } from "@/db/schema/auth";
import { auth } from "@/server/auth";
import type { Actor } from "@/server/auth/session";
import {
    previewImportExcel,
    commitImportExcel,
} from "@/server/services/import";
import { eq } from "drizzle-orm";

async function main() {
    console.log("=== Memulai Seed iPayment (Tahap 1) ===");

    // 1. Seed Default App Settings
    console.log("1. Memeriksa pengaturan aplikasi (app_settings)...");
    const defaultSettings = [
        { kunci: "notification_grace_days", nilai: "0" },
        { kunci: "stale_days_arrears", nilai: "3" },
        { kunci: "snooze_max_days", nilai: "30" },
        { kunci: "digest_cron", nilai: "0 8 * * 1-5" },
        { kunci: "otp_resend_cooldown_seconds", nilai: "60" },
    ];

    for (const s of defaultSettings) {
        await db
            .insert(appSettings)
            .values(s)
            .onConflictDoNothing();
    }
    console.log("✓ Pengaturan aplikasi siap.");

    // 2. Seed Pengguna PIC & Admin
    console.log("2. Memeriksa pengguna PIC dan Admin...");
    let [adminUser] = await db
        .select()
        .from(user)
        .where(eq(user.role, "admin"));

    if (!adminUser) {
        console.log("Membuat admin default: admin@ipayment.local...");
        const created = await auth.api.createUser({
            body: {
                email: "admin@ipayment.local",
                password: "Password123!",
                name: "Admin Utama",
                role: "admin",
                data: { active: true },
            },
        });
        adminUser = created.user as unknown as typeof user.$inferSelect;
    }

    let [pic1] = await db
        .select()
        .from(user)
        .where(eq(user.email, "pic1@ipayment.local"));

    if (!pic1) {
        console.log("Membuat PIC 1: pic1@ipayment.local...");
        const created = await auth.api.createUser({
            body: {
                email: "pic1@ipayment.local",
                password: "Password123!",
                name: "Budi Santoso (PIC 1)",
                role: "pic" as unknown as "user",
                data: { active: true },
            },
        });
        pic1 = created.user as unknown as typeof user.$inferSelect;
    }

    let [pic2] = await db
        .select()
        .from(user)
        .where(eq(user.email, "pic2@ipayment.local"));

    if (!pic2) {
        console.log("Membuat PIC 2: pic2@ipayment.local...");
        const created = await auth.api.createUser({
            body: {
                email: "pic2@ipayment.local",
                password: "Password123!",
                name: "Siti Rahma (PIC 2)",
                role: "pic" as unknown as "user",
                data: { active: true },
            },
        });
        pic2 = created.user as unknown as typeof user.$inferSelect;
    }
    console.log("✓ Pengguna siap (Admin, PIC 1, PIC 2).");

    const adminActor: Actor = {
        id: adminUser.id,
        role: "admin",
        email: adminUser.email,
        name: adminUser.name,
    };

    // 3. Buat direktori scripts/data/ dan file sample 61 akun
    const dataDir = path.join(process.cwd(), "scripts", "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const sampleFilePath = path.join(dataDir, "sample-61-akun.xlsx");
    if (!fs.existsSync(sampleFilePath)) {
        console.log("3. Membuat file sample Excel 61 akun di scripts/data/sample-61-akun.xlsx...");
        const wb = new ExcelJS.Workbook();

        // Sheet 1: Master_Pelanggan
        const wsMaster = wb.addWorksheet("Master_Pelanggan");
        wsMaster.addRow(["No. Akun", "Layanan"]);

        // Daftar 61 akun dengan variasi nol di depan, nama normal sama, dan kemiripan Levenshtein
        const clientsSpec = [
            { count: 10, name: "PT. Maju Bersama", baseNo: 102901 },
            { count: 5, name: "Maju Bersama, PT", baseNo: 102911 }, // normalisasi identik
            { count: 10, name: "CV. Sumber Makmur", baseNo: 102916 },
            { count: 5, name: "Sumber Makmr, CV", baseNo: 102926 }, // Levenshtein = 1
            { count: 10, name: "PT. Sinar Jaya Abadi, Tbk.", baseNo: 102931 },
            { count: 10, name: "UD. Berkah Mandiri", baseNo: 102941 },
            { count: 5, name: "Berkah Mandri, UD", baseNo: 102951 }, // Levenshtein = 1
            { count: 6, name: "PT. Cipta Karya Solusindo", baseNo: 102956 },
        ];

        const allAccountNoList: string[] = [];

        for (const spec of clientsSpec) {
            for (let i = 0; i < spec.count; i++) {
                // Pertahankan nol di depan (contoh 00102901)
                const noAkun = `00${spec.baseNo + i}`;
                allAccountNoList.push(noAkun);
                wsMaster.addRow([noAkun, spec.name]);
            }
        }

        // Sheet 2: Data_Tagihan
        const wsTagihan = wb.addWorksheet("Data_Tagihan");
        wsTagihan.addRow([
            "No. Akun",
            "Nama Client",
            "Periode",
            "Mata Uang",
            "Jumlah Tagihan",
            "Belum Bayar",
            "Status Pembayaran",
            "Lokasi Pembayaran",
            "Cicilan",
            "Tanggal Bayar",
            "Jam Bayar",
            "Tanggal Cek",
        ]);

        for (let i = 0; i < allAccountNoList.length; i++) {
            const noAkun = allAccountNoList[i];

            // Tagihan Oktober 2026 (Lunas)
            wsTagihan.addRow([
                noAkun,
                "Client " + (i + 1),
                "Oktober 2026",
                "IDR",
                "5.282.500",
                "0",
                "PAID",
                "Bank Mandiri",
                "Bukan Cicilan",
                "2026-10-25",
                "10:30:00",
                "2026-11-10",
            ]);

            // Tagihan November 2026
            if (i % 3 === 0) {
                // Menunggak penuh
                wsTagihan.addRow([
                    noAkun,
                    "Client " + (i + 1),
                    "November 2026",
                    "IDR",
                    "5.282.500",
                    "5.282.500",
                    "UNPAID",
                    "",
                    "Bukan Cicilan",
                    "",
                    "",
                    "2026-11-10",
                ]);
            } else if (i % 3 === 1) {
                // Cicilan sebagian
                wsTagihan.addRow([
                    noAkun,
                    "Client " + (i + 1),
                    "November 2026",
                    "IDR",
                    "5.282.500",
                    "2.000.000",
                    "PARTIAL",
                    "BCA Virtual Account",
                    "Cicilan",
                    "2026-11-05",
                    "14:15:00",
                    "2026-11-10",
                ]);
            } else {
                // Sudah lunas bulan berjalan
                wsTagihan.addRow([
                    noAkun,
                    "Client " + (i + 1),
                    "November 2026",
                    "IDR",
                    "5.282.500",
                    "0",
                    "PAID",
                    "Bank Mandiri",
                    "Bukan Cicilan",
                    "2026-11-08",
                    "09:00:00",
                    "2026-11-10",
                ]);
            }
        }

        await wb.xlsx.writeFile(sampleFilePath);
        console.log(`✓ Sample file berhasil dibuat dengan ${allAccountNoList.length} akun.`);
    }

    // 4. Jalankan Impor Transaksional untuk PIC 1
    console.log("4. Mengimpor sample Excel 61 akun untuk PIC 1...");
    const fileBuffer = fs.readFileSync(sampleFilePath);

    const preview = await previewImportExcel(adminActor, pic1.id, fileBuffer);
    console.log(`  - Akun di file: ${preview.totalAccountsInFile}`);
    console.log(`  - Akun baru: ${preview.newAccountsCount}`);
    console.log(`  - Akun ada: ${preview.existingAccountsCount}`);
    console.log(`  - Kandidat duplikat client: ${preview.duplicateCandidates.length}`);
    console.log(`  - Konflik PIC: ${preview.conflicts.length}`);
    console.log(`  - Peringatan nominal: ${preview.warningRows.length}`);
    console.log(`  - Baris gagal: ${preview.failedRows.length}`);

    // Keputusan duplikat: gabungkan kandidat mirip ke client yang ada
    const duplicateDecisions: Record<
        string,
        | { decision: "merge"; targetClientId: string }
        | { decision: "separate" }
    > = {};

    for (const d of preview.duplicateCandidates) {
        duplicateDecisions[d.namaNormal] = {
            decision: "merge",
            targetClientId: d.existingClientId,
        };
    }

    const commitRes = await commitImportExcel(adminActor, {
        picId: pic1.id,
        parsedMaster: preview.parsedMaster,
        parsedTagihan: preview.parsedTagihan,
        conflictDecisions: {},
        duplicateDecisions,
    });

    console.log("✓ Commit impor selesai:", commitRes.summary);
    console.log("=== Seed Tahap 1 Selesai dengan Sukses ===");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("Gagal menjalankan seed:", e);
        process.exit(1);
    });
