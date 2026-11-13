import ExcelJS from "exceljs";
import { db } from "@/db";
import {
    clients,
    accounts,
    invoices,
    accountChecks,
} from "@/db/schema/domain";
import { user } from "@/db/schema/auth";
import type { Actor } from "@/server/auth/session";
import {
    normalisasiNama,
    levenshteinDistance,
    isMiripClient,
} from "@/lib/client-name";
import { normalisasiPeriode } from "@/lib/periode";
import { parseRupiah, validasiNominalInvoice } from "@/lib/uang";
import { tulisAuditLog } from "@/server/data/audit";
import { eq, inArray } from "drizzle-orm";

export interface ImportPreviewFailedRow {
    sheet: string;
    row: number;
    reason: string;
}

export interface ImportPreviewWarningRow {
    sheet: string;
    row: number;
    noAkun: string;
    periode: string;
    reason: string;
}

export interface ImportPreviewPicConflict {
    noAkun: string;
    clientNama: string;
    currentPicId: string;
    currentPicName: string;
    currentPicEmail: string;
    targetPicId: string;
    targetPicName: string;
}

export interface ImportPreviewDuplicateCandidate {
    rawName: string;
    namaNormal: string;
    existingClientId: string;
    existingClientNama: string;
    existingClientNamaNormal: string;
    distance: number;
}

export interface ParsedMasterRow {
    noAkun: string;
    namaClient: string;
    namaNormal: string;
    rowNumber: number;
}

export interface ParsedTagihanRow {
    noAkun: string;
    periode: string; // YYYY-MM-01
    mataUang: string;
    jumlahTagihan: number;
    belumBayar: number;
    lokasiBayar: string | null;
    cicilan: boolean;
    tanggalBayar: string | null;
    jamBayar: string | null;
    tanggalCek: string | null;
    rowNumber: number;
}

export interface ImportPreviewResult {
    selectedPic: {
        id: string;
        name: string;
        email: string;
    };
    totalAccountsInFile: number;
    newAccountsCount: number;
    existingAccountsCount: number;
    conflicts: ImportPreviewPicConflict[];
    duplicateCandidates: ImportPreviewDuplicateCandidate[];
    warningRows: ImportPreviewWarningRow[];
    failedRows: ImportPreviewFailedRow[];
    // Data serializable untuk commit
    parsedMaster: ParsedMasterRow[];
    parsedTagihan: ParsedTagihanRow[];
}

export interface CommitImportPayload {
    picId: string;
    parsedMaster: ParsedMasterRow[];
    parsedTagihan: ParsedTagihanRow[];
    // Keputusan konflik PIC: noAkun -> 'skip' | 'transfer'
    conflictDecisions: Record<string, "skip" | "transfer">;
    // Keputusan kandidat duplikat: namaNormal -> { decision: 'merge', targetClientId: string } | { decision: 'separate' }
    duplicateDecisions: Record<
        string,
        { decision: "merge"; targetClientId: string } | { decision: "separate" }
    >;
}

function getCellNumericOrText(
    cell: ExcelJS.Cell | undefined,
): number | string | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    const val = cell.value;
    if (typeof val === "number") return val;
    if (typeof val === "object" && "result" in val) {
        if (typeof val.result === "number") return val.result;
        if (val.result !== null && val.result !== undefined) {
            return String(val.result).trim();
        }
        return null;
    }
    return getCellText(cell);
}
function normalizeHeaderName(header: string): string {
    return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCellText(cell: ExcelJS.Cell | undefined): string {
    if (!cell || cell.value === null || cell.value === undefined) return "";
    if (typeof cell.text === "string" && !cell.text.startsWith("#")) {
        return cell.text.trim();
    }
    const val = cell.value;
    if (typeof val === "object") {
        if ("richText" in val && Array.isArray(val.richText)) {
            return val.richText.map((t) => t.text).join("").trim();
        }
        if ("result" in val) {
            return val.result !== null && val.result !== undefined
                ? String(val.result).trim()
                : "";
        }
        if ("text" in val) {
            return String(val.text).trim();
        }
    }
    return String(val).trim();
}

function getCellTime(cell: ExcelJS.Cell | undefined): string | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    const val = cell.value;

    if (val instanceof Date) {
        const hours = String(val.getUTCHours()).padStart(2, "0");
        const mins = String(val.getUTCMinutes()).padStart(2, "0");
        const secs = String(val.getUTCSeconds()).padStart(2, "0");
        return `${hours}:${mins}:${secs}`;
    }

    if (typeof val === "number" && val >= 0 && val < 1) {
        const totalSeconds = Math.round(val * 86400);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
        const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
        const secs = String(totalSeconds % 60).padStart(2, "0");
        return `${hours}:${mins}:${secs}`;
    }

    const text = getCellText(cell);
    if (!text) return null;
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
        const h = String(parseInt(match[1], 10)).padStart(2, "0");
        const m = match[2];
        const s = match[3] || "00";
        return `${h}:${m}:${s}`;
    }

    return null;
}

function getCellDateString(cell: ExcelJS.Cell | undefined): string | null {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    const val = cell.value;

    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        return formatter.format(val); // YYYY-MM-DD
    }

    const text = getCellText(cell);
    if (!text) return null;

    // ISO YYYY-MM-DD
    const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }

    // DD/MM/YYYY
    const dmyMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
    }

    return null;
}

/**
 * Tahap 1 Impor — Pratinjau / Dry-Run
 * Membaca workbook Excel dan memvalidasi terhadap database tanpa menyimpan apa pun.
 */
export async function previewImportExcel(
    actor: Actor,
    picId: string,
    fileBuffer: Buffer,
): Promise<ImportPreviewResult> {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat melakukan impor Excel.");
    }

    // Ambil info PIC tujuan
    const [targetPic] = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
        })
        .from(user)
        .where(eq(user.id, picId));

    if (!targetPic) {
        throw new Error("PIC tujuan tidak ditemukan.");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    // Cari sheet Master_Pelanggan
    const masterSheet = workbook.worksheets.find((ws) => {
        const name = ws.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return name.includes("master") && name.includes("pelanggan");
    });

    if (!masterSheet) {
        throw new Error(
            "Sheet 'Master_Pelanggan' tidak ditemukan di file Excel. Pastikan nama sheet sesuai.",
        );
    }

    const failedRows: ImportPreviewFailedRow[] = [];
    const warningRows: ImportPreviewWarningRow[] = [];

    // Baca header Master_Pelanggan
    const masterHeaderRow = masterSheet.getRow(1);
    let noAkunColIndex = -1;
    let namaClientColIndex = -1;

    masterHeaderRow.eachCell((cell, colNumber) => {
        const h = normalizeHeaderName(getCellText(cell));
        if (h === "noakun" || h === "nomorakun") {
            noAkunColIndex = colNumber;
        } else if (
            h === "namaclientpt" ||
            h === "namaclient" ||
            h === "namapt" ||
            h === "client" ||
            h === "layanan" ||
            h === "pelanggan"
        ) {
            namaClientColIndex = colNumber;
        }
    });

    if (noAkunColIndex === -1 || namaClientColIndex === -1) {
        throw new Error(
            "Header 'No. Akun' dan 'Nama Client/PT' wajib ada pada sheet 'Master_Pelanggan'.",
        );
    }

    const parsedMaster: ParsedMasterRow[] = [];
    const seenNoAkun = new Set<string>();

    masterSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Lewati header

        const cellNoAkun = row.getCell(noAkunColIndex);
        const cellNamaClient = row.getCell(namaClientColIndex);

        const noAkunRaw = getCellText(cellNoAkun);
        const namaClientRaw = getCellText(cellNamaClient);

        // Jika baris kosong seluruhnya, lewati
        if (!noAkunRaw && !namaClientRaw) return;

        if (!noAkunRaw) {
            failedRows.push({
                sheet: masterSheet.name,
                row: rowNumber,
                reason: "No. Akun kosong.",
            });
            return;
        }

        if (!namaClientRaw) {
            failedRows.push({
                sheet: masterSheet.name,
                row: rowNumber,
                reason: "Nama Client/PT kosong.",
            });
            return;
        }

        if (seenNoAkun.has(noAkunRaw)) {
            failedRows.push({
                sheet: masterSheet.name,
                row: rowNumber,
                reason: `No. Akun '${noAkunRaw}' duplikat di dalam file impor.`,
            });
            return;
        }

        seenNoAkun.add(noAkunRaw);

        parsedMaster.push({
            noAkun: noAkunRaw,
            namaClient: namaClientRaw,
            namaNormal: normalisasiNama(namaClientRaw),
            rowNumber,
        });
    });

    // Cari sheet Data_Tagihan (opsional)
    const tagihanSheet = workbook.worksheets.find((ws) => {
        const name = ws.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return name.includes("data") && name.includes("tagihan");
    });

    const parsedTagihan: ParsedTagihanRow[] = [];

    if (tagihanSheet) {
        const tagihanHeaderRow = tagihanSheet.getRow(1);
        let tNoAkunCol = -1;
        let tPeriodeCol = -1;
        let tMataUangCol = -1;
        let tJumlahTagihanCol = -1;
        let tBelumBayarCol = -1;
        let tLokasiBayarCol = -1;
        let tCicilanCol = -1;
        let tTanggalBayarCol = -1;
        let tJamBayarCol = -1;
        let tTanggalCekCol = -1;

        tagihanHeaderRow.eachCell((cell, colNumber) => {
            const h = normalizeHeaderName(getCellText(cell));
            if (h === "noakun" || h === "nomorakun") tNoAkunCol = colNumber;
            else if (h === "periode") tPeriodeCol = colNumber;
            else if (h === "matauang") tMataUangCol = colNumber;
            else if (h === "jumlahtagihan" || h === "tagihan")
                tJumlahTagihanCol = colNumber;
            else if (
                h === "belumbayar" ||
                h === "sisa" ||
                h === "sisatagihan"
            )
                tBelumBayarCol = colNumber;
            else if (h === "lokasipembayaran" || h === "lokasibayar")
                tLokasiBayarCol = colNumber;
            else if (h === "cicilan") tCicilanCol = colNumber;
            else if (h === "tanggalbayar" || h === "tglbayar")
                tTanggalBayarCol = colNumber;
            else if (h === "jambayar") tJamBayarCol = colNumber;
            else if (h === "tanggalcek" || h === "tglcek")
                tTanggalCekCol = colNumber;
        });

        if (
            tNoAkunCol !== -1 &&
            tPeriodeCol !== -1 &&
            tJumlahTagihanCol !== -1 &&
            tBelumBayarCol !== -1
        ) {
            tagihanSheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;

                const noAkunRaw = getCellText(row.getCell(tNoAkunCol));
                if (!noAkunRaw) return; // Baris kosong

                const periodeCell = row.getCell(tPeriodeCol);
                let periodeIso: string | null = null;

                if (periodeCell.value instanceof Date) {
                    periodeIso = normalisasiPeriode(periodeCell.value);
                } else {
                    periodeIso = normalisasiPeriode(getCellText(periodeCell));
                }

                if (!periodeIso) {
                    failedRows.push({
                        sheet: tagihanSheet.name,
                        row: rowNumber,
                        reason: `Periode tidak valid: '${getCellText(periodeCell)}'.`,
                    });
                    return;
                }

                const jumlahTagihan = parseRupiah(
                    getCellNumericOrText(row.getCell(tJumlahTagihanCol)),
                );
                const belumBayar = parseRupiah(
                    getCellNumericOrText(row.getCell(tBelumBayarCol)),
                );

                if (jumlahTagihan === null) {
                    failedRows.push({
                        sheet: tagihanSheet.name,
                        row: rowNumber,
                        reason: `Jumlah Tagihan tidak valid: '${getCellText(row.getCell(tJumlahTagihanCol))}'.`,
                    });
                    return;
                }

                if (belumBayar === null) {
                    failedRows.push({
                        sheet: tagihanSheet.name,
                        row: rowNumber,
                        reason: `Belum Bayar tidak valid: '${getCellText(row.getCell(tBelumBayarCol))}'.`,
                    });
                    return;
                }

                // Validasi Aturan 4.3 (menggunakan nilai absolut + peringatan bila negatif)
                const validasiNominal = validasiNominalInvoice(
                    jumlahTagihan,
                    belumBayar,
                );
                if (!validasiNominal.valid) {
                    failedRows.push({
                        sheet: tagihanSheet.name,
                        row: rowNumber,
                        reason:
                            validasiNominal.error ??
                            "Nominal tagihan tidak valid.",
                    });
                    return;
                }

                // Cicilan
                let cicilan = false;
                if (tCicilanCol !== -1) {
                    const cicilanText = getCellText(row.getCell(tCicilanCol)).toLowerCase();
                    if (cicilanText === "cicilan" || cicilanText === "true") {
                        cicilan = true;
                    } else if (
                        cicilanText === "bukan cicilan" ||
                        cicilanText === "false" ||
                        cicilanText === ""
                    ) {
                        cicilan = false;
                    } else {
                        failedRows.push({
                            sheet: tagihanSheet.name,
                            row: rowNumber,
                            reason: `Nilai Cicilan tidak dikenali: '${cicilanText}'.`,
                        });
                        return;
                    }
                }

                if (validasiNominal.warning) {
                    warningRows.push({
                        sheet: tagihanSheet.name,
                        row: rowNumber,
                        noAkun: noAkunRaw,
                        periode: periodeIso,
                        reason: validasiNominal.warning,
                    });
                }

                const mataUang =
                    tMataUangCol !== -1
                        ? getCellText(row.getCell(tMataUangCol)) || "IDR"
                        : "IDR";
                const lokasiBayar =
                    tLokasiBayarCol !== -1
                        ? getCellText(row.getCell(tLokasiBayarCol)) || null
                        : null;
                const tanggalBayar =
                    tTanggalBayarCol !== -1
                        ? getCellDateString(row.getCell(tTanggalBayarCol))
                        : null;
                const jamBayar =
                    tJamBayarCol !== -1
                        ? getCellTime(row.getCell(tJamBayarCol))
                        : null;
                const tanggalCek =
                    tTanggalCekCol !== -1
                        ? getCellDateString(row.getCell(tTanggalCekCol))
                        : null;

                parsedTagihan.push({
                    noAkun: noAkunRaw,
                    periode: periodeIso,
                    mataUang,
                    jumlahTagihan,
                    belumBayar,
                    lokasiBayar,
                    cicilan,
                    tanggalBayar,
                    jamBayar,
                    tanggalCek,
                    rowNumber,
                });
            });
        }
    }

    // Validasi terhadap database
    const allNoAkuns = parsedMaster.map((m) => m.noAkun);
    const existingAccounts = allNoAkuns.length > 0
        ? await db
            .select({
                id: accounts.id,
                noAkun: accounts.noAkun,
                picId: accounts.picId,
                clientId: accounts.clientId,
                picName: user.name,
                picEmail: user.email,
            })
            .from(accounts)
            .leftJoin(user, eq(accounts.picId, user.id))
            .where(inArray(accounts.noAkun, allNoAkuns))
        : [];

    const existingAccountsMap = new Map(existingAccounts.map((a) => [a.noAkun, a]));

    let newAccountsCount = 0;
    let existingAccountsCount = 0;
    const conflicts: ImportPreviewPicConflict[] = [];

    for (const m of parsedMaster) {
        const existing = existingAccountsMap.get(m.noAkun);
        if (!existing) {
            newAccountsCount++;
        } else {
            existingAccountsCount++;
            // Deteksi konflik PIC jika akun sudah dimiliki PIC lain
            if (existing.picId && existing.picId !== picId) {
                conflicts.push({
                    noAkun: m.noAkun,
                    clientNama: m.namaClient,
                    currentPicId: existing.picId,
                    currentPicName: existing.picName || "Tanpa Nama",
                    currentPicEmail: existing.picEmail || "",
                    targetPicId: targetPic.id,
                    targetPicName: targetPic.name || targetPic.email,
                });
            }
        }
    }

    // Deteksi duplikasi client via normalisasi & Levenshtein
    const allDbClients = await db
        .select({
            id: clients.id,
            nama: clients.nama,
            namaNormal: clients.namaNormal,
        })
        .from(clients);

    const dbClientNormalMap = new Map(allDbClients.map((c) => [c.namaNormal, c]));

    const duplicateCandidates: ImportPreviewDuplicateCandidate[] = [];
    const seenClientNormalsInFile = new Set<string>();

    for (const m of parsedMaster) {
        if (seenClientNormalsInFile.has(m.namaNormal)) continue;
        seenClientNormalsInFile.add(m.namaNormal);

        // Jika persis sama di DB, sudah otomatis cocok
        if (dbClientNormalMap.has(m.namaNormal)) {
            continue;
        }

        // Cari kandidat yang mirip (jarak Levenshtein 1 <= dist <= 2)
        for (const existingClient of allDbClients) {
            if (isMiripClient(m.namaNormal, existingClient.namaNormal, 2)) {
                const distance = levenshteinDistance(
                    m.namaNormal,
                    existingClient.namaNormal,
                );
                duplicateCandidates.push({
                    rawName: m.namaClient,
                    namaNormal: m.namaNormal,
                    existingClientId: existingClient.id,
                    existingClientNama: existingClient.nama,
                    existingClientNamaNormal: existingClient.namaNormal,
                    distance,
                });
                break; // Ambil satu kandidat terdekat
            }
        }
    }

    return {
        selectedPic: {
            id: targetPic.id,
            name: targetPic.name,
            email: targetPic.email,
        },
        totalAccountsInFile: parsedMaster.length,
        newAccountsCount,
        existingAccountsCount,
        conflicts,
        duplicateCandidates,
        warningRows,
        failedRows,
        parsedMaster,
        parsedTagihan,
    };
}

/**
 * Tahap 2 Impor — Konfirmasi & Eksekusi Transaksional
 * Menyimpan seluruh data impor ke database dalam SATU transaksi database.
 */
export async function commitImportExcel(
    actor: Actor,
    payload: CommitImportPayload,
) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat melakukan commit impor.");
    }

    const {
        picId,
        parsedMaster,
        parsedTagihan,
        conflictDecisions,
        duplicateDecisions,
    } = payload;

    return await db.transaction(async (tx) => {
        // 1. Kumpulkan semua client di DB saat ini
        const existingClients = await tx
            .select({
                id: clients.id,
                nama: clients.nama,
                namaNormal: clients.namaNormal,
            })
            .from(clients);

        const clientNormalToIdMap = new Map(
            existingClients.map((c) => [c.namaNormal, c.id]),
        );

        // Resolusi Client
        // Untuk setiap client unik di file:
        const uniqueFileClients = new Map<string, string>(); // namaNormal -> namaRaw
        for (const m of parsedMaster) {
            if (!uniqueFileClients.has(m.namaNormal)) {
                uniqueFileClients.set(m.namaNormal, m.namaClient);
            }
        }

        for (const [namaNormal, namaRaw] of uniqueFileClients.entries()) {
            if (clientNormalToIdMap.has(namaNormal)) {
                continue; // Sudah ada di DB
            }

            // Cek apakah admin memilih merge ke client yang ada
            const decision = duplicateDecisions[namaNormal];
            if (decision && decision.decision === "merge" && decision.targetClientId) {
                clientNormalToIdMap.set(namaNormal, decision.targetClientId);
                continue;
            }

            // Buat client baru
            const [newClient] = await tx
                .insert(clients)
                .values({
                    nama: namaRaw,
                    namaNormal,
                })
                .returning({ id: clients.id });

            clientNormalToIdMap.set(namaNormal, newClient.id);
        }

        // 2. Ambil semua akun yang ada di DB
        const fileNoAkuns = parsedMaster.map((m) => m.noAkun);
        const existingAccounts = fileNoAkuns.length > 0
            ? await tx
                .select({
                    id: accounts.id,
                    noAkun: accounts.noAkun,
                    picId: accounts.picId,
                    clientId: accounts.clientId,
                    lastCheckedAt: accounts.lastCheckedAt,
                })
                .from(accounts)
                .where(inArray(accounts.noAkun, fileNoAkuns))
            : [];

        const existingAccountsMap = new Map(existingAccounts.map((a) => [a.noAkun, a]));

        // Peta noAkun -> accountId final di transaksi
        const resolvedAccountIdMap = new Map<string, string>();
        const skippedNoAkuns = new Set<string>();

        let newAccountsInserted = 0;
        let accountsUpdated = 0;
        let accountsTransferred = 0;

        for (const m of parsedMaster) {
            const conflictDecision = conflictDecisions[m.noAkun];

            // Jika konflik dan diputuskan 'skip'
            if (conflictDecision === "skip") {
                skippedNoAkuns.add(m.noAkun);
                continue;
            }

            const clientId = clientNormalToIdMap.get(m.namaNormal);
            if (!clientId) {
                throw new Error(`Gagal menyelesaikan client ID untuk '${m.namaClient}'.`);
            }

            const existing = existingAccountsMap.get(m.noAkun);

            if (!existing) {
                // Insert akun baru
                const [insertedAcc] = await tx
                    .insert(accounts)
                    .values({
                        noAkun: m.noAkun,
                        clientId,
                        picId,
                        aktif: true,
                    })
                    .returning({ id: accounts.id });

                resolvedAccountIdMap.set(m.noAkun, insertedAcc.id);
                newAccountsInserted++;
            } else {
                // Update akun yang sudah ada
                resolvedAccountIdMap.set(m.noAkun, existing.id);

                let targetPicForAccount = existing.picId;
                if (!existing.picId || existing.picId === picId || conflictDecision === "transfer") {
                    targetPicForAccount = picId;
                    if (existing.picId && existing.picId !== picId) {
                        accountsTransferred++;
                    }
                }

                await tx
                    .update(accounts)
                    .set({
                        clientId,
                        picId: targetPicForAccount,
                    })
                    .where(eq(accounts.id, existing.id));

                accountsUpdated++;
            }
        }

        // 3. Upsert Invoices & Kumpulkan Tanggal Cek
        const accountLatestCheckDateMap = new Map<string, string>();
        let invoicesUpserted = 0;

        for (const t of parsedTagihan) {
            if (skippedNoAkuns.has(t.noAkun)) {
                continue;
            }

            const accountId = resolvedAccountIdMap.get(t.noAkun);
            if (!accountId) {
                // Jika noAkun tidak ada di Master_Pelanggan maupun DB
                continue;
            }

            const validasiNominal = validasiNominalInvoice(
                t.jumlahTagihan,
                t.belumBayar,
            );
            if (!validasiNominal.valid) {
                throw new Error(
                    `Baris ${t.rowNumber} (${t.noAkun}): ${validasiNominal.error}`,
                );
            }

            // Catat tanggal cek terbaru
            if (t.tanggalCek) {
                const currentLatest = accountLatestCheckDateMap.get(accountId);
                if (!currentLatest || t.tanggalCek > currentLatest) {
                    accountLatestCheckDateMap.set(accountId, t.tanggalCek);
                }
            }

            // Upsert ke invoices
            await tx
                .insert(invoices)
                .values({
                    accountId,
                    periode: t.periode,
                    mataUang: t.mataUang,
                    jumlahTagihan: t.jumlahTagihan,
                    belumBayar: t.belumBayar,
                    lokasiBayar: t.lokasiBayar,
                    cicilan: t.cicilan,
                    tanggalBayar: t.tanggalBayar,
                    jamBayar: t.jamBayar,
                    updatedBy: actor.id,
                })
                .onConflictDoUpdate({
                    target: [invoices.accountId, invoices.periode],
                    set: {
                        mataUang: t.mataUang,
                        jumlahTagihan: t.jumlahTagihan,
                        belumBayar: t.belumBayar,
                        lokasiBayar: t.lokasiBayar,
                        cicilan: t.cicilan,
                        tanggalBayar: t.tanggalBayar,
                        jamBayar: t.jamBayar,
                        updatedBy: actor.id,
                        updatedAt: new Date(),
                    },
                });

            invoicesUpserted++;
        }

        // 4. Update lastCheckedAt dan tambah account_checks
        for (const [accountId, checkDateStr] of accountLatestCheckDateMap.entries()) {
            const checkDate = new Date(`${checkDateStr}T00:00:00+07:00`);

            await tx
                .update(accounts)
                .set({ lastCheckedAt: checkDate })
                .where(eq(accounts.id, accountId));

            await tx.insert(accountChecks).values({
                accountId,
                checkedBy: actor.id,
                checkedAt: checkDate,
                catatan: "Impor Excel",
            });
        }

        // 5. Catat audit_logs
        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "import.commit",
            entitas: "import",
            entitasId: picId,
            sebelum: null,
            sesudah: {
                picId,
                totalMasterInFile: parsedMaster.length,
                newAccountsInserted,
                accountsUpdated,
                accountsTransferred,
                accountsSkipped: skippedNoAkuns.size,
                invoicesUpserted,
            },
        });

        return {
            success: true,
            summary: {
                newAccountsInserted,
                accountsUpdated,
                accountsTransferred,
                accountsSkipped: skippedNoAkuns.size,
                invoicesUpserted,
            },
        };
    });
}
