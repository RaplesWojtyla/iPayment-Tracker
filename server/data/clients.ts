import { db } from "@/db";
import { clients, accounts, clientReminderLogs } from "@/db/schema/domain";
import type { Actor } from "@/server/auth/session";
import { normalisasiNama } from "@/lib/client-name";
import { tulisAuditLog } from "./audit";
import { eq, or, ilike, sql, inArray, countDistinct, and } from "drizzle-orm";

export interface ListClientsOptions {
    search?: string;
    page?: number;
    pageSize?: number;
}

export interface CreateClientInput {
    nama: string;
    kontakEmail?: string | null;
    kontakWhatsapp?: string | null;
}

export interface UpdateClientInput {
    id: string;
    nama: string;
    kontakEmail?: string | null;
    kontakWhatsapp?: string | null;
}

export interface MergeClientsInput {
    sourceClientId: string;
    targetClientId: string;
}

export async function listClients(
    actor: Actor,
    options: ListClientsOptions = {},
) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 10));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (options.search?.trim()) {
        const s = `%${options.search.trim().toLowerCase()}%`;
        conditions.push(
            or(ilike(clients.nama, s), ilike(clients.namaNormal, s)),
        );
    }

    if (actor.role === "pic") {
        const picAccountsSubquery = db
            .select({ clientId: accounts.clientId })
            .from(accounts)
            .where(eq(accounts.picId, actor.id));

        conditions.push(inArray(clients.id, picAccountsSubquery));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
        .select({ total: countDistinct(clients.id) })
        .from(clients)
        .where(whereClause);

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / pageSize);

    const data = await db
        .select({
            id: clients.id,
            nama: clients.nama,
            namaNormal: clients.namaNormal,
            kontakEmail: clients.kontakEmail,
            kontakWhatsapp: clients.kontakWhatsapp,
            createdAt: clients.createdAt,
            accountCount: sql<number>`count(${accounts.id})::int`,
        })
        .from(clients)
        .leftJoin(accounts, eq(accounts.clientId, clients.id))
        .where(whereClause)
        .groupBy(clients.id)
        .orderBy(clients.nama)
        .limit(pageSize)
        .offset(offset);

    return {
        data,
        total,
        page,
        pageSize,
        totalPages,
    };
}

export async function listAllClientsForDropdown(actor: Actor) {
    const conditions = [];
    if (actor.role === "pic") {
        const picAccountsSubquery = db
            .select({ clientId: accounts.clientId })
            .from(accounts)
            .where(eq(accounts.picId, actor.id));
        conditions.push(inArray(clients.id, picAccountsSubquery));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db
        .select({
            id: clients.id,
            nama: clients.nama,
        })
        .from(clients)
        .where(whereClause)
        .orderBy(clients.nama);
}

export async function createClient(actor: Actor, input: CreateClientInput) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat membuat client.");
    }

    const nama = input.nama.trim();
    if (!nama) {
        throw new Error("Nama client tidak boleh kosong.");
    }

    const namaNormal = normalisasiNama(nama);

    return await db.transaction(async (tx) => {
        const [inserted] = await tx
            .insert(clients)
            .values({
                nama,
                namaNormal,
                kontakEmail: input.kontakEmail?.trim() || null,
                kontakWhatsapp: input.kontakWhatsapp?.trim() || null,
            })
            .returning();

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "client.create",
            entitas: "client",
            entitasId: inserted.id,
            sebelum: null,
            sesudah: {
                id: inserted.id,
                nama: inserted.nama,
                namaNormal: inserted.namaNormal,
            },
        });

        return inserted;
    });
}

export async function updateClient(actor: Actor, input: UpdateClientInput) {
    if (actor.role !== "admin") {
        throw new Error(
            "FORBIDDEN: Hanya admin yang dapat memperbarui client.",
        );
    }

    const nama = input.nama.trim();
    if (!nama) {
        throw new Error("Nama client tidak boleh kosong.");
    }

    const namaNormal = normalisasiNama(nama);

    return await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(clients)
            .where(eq(clients.id, input.id));

        if (!existing) {
            throw new Error("Client tidak ditemukan.");
        }

        const [updated] = await tx
            .update(clients)
            .set({
                nama,
                namaNormal,
                kontakEmail: input.kontakEmail?.trim() || null,
                kontakWhatsapp: input.kontakWhatsapp?.trim() || null,
            })
            .where(eq(clients.id, input.id))
            .returning();

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "client.update",
            entitas: "client",
            entitasId: updated.id,
            sebelum: {
                nama: existing.nama,
                namaNormal: existing.namaNormal,
                kontakEmail: existing.kontakEmail,
                kontakWhatsapp: existing.kontakWhatsapp,
            },
            sesudah: {
                nama: updated.nama,
                namaNormal: updated.namaNormal,
                kontakEmail: updated.kontakEmail,
                kontakWhatsapp: updated.kontakWhatsapp,
            },
        });

        return updated;
    });
}

/**
 * Menggabungkan (merge) dua client dalam satu transaksi. Hanya untuk Admin.
 * 1. Pindahkan semua akun milik sourceClientId ke targetClientId.
 * 2. Pindahkan seluruh riwayat pesan pengingat ke targetClientId.
 * 3. Salin kontak yang kosong di target jika source memilikinya.
 * 4. Hapus sourceClientId.
 * 5. Tulis audit_logs dengan daftar akun yang dipindahkan.
 */
export async function mergeClients(actor: Actor, input: MergeClientsInput) {
    if (actor.role !== "admin") {
        throw new Error(
            "FORBIDDEN: Hanya admin yang dapat menggabungkan client.",
        );
    }

    const { sourceClientId, targetClientId } = input;
    if (sourceClientId === targetClientId) {
        throw new Error("Client sumber dan client tujuan tidak boleh sama.");
    }

    return await db.transaction(async (tx) => {
        const [sourceClient] = await tx
            .select()
            .from(clients)
            .where(eq(clients.id, sourceClientId));
        const [targetClient] = await tx
            .select()
            .from(clients)
            .where(eq(clients.id, targetClientId));

        if (!sourceClient || !targetClient) {
            throw new Error("Client sumber atau tujuan tidak ditemukan.");
        }

        // Pindahkan semua akun
        const movedAccounts = await tx
            .update(accounts)
            .set({ clientId: targetClientId })
            .where(eq(accounts.clientId, sourceClientId))
            .returning({ id: accounts.id, noAkun: accounts.noAkun });

        // Pindahkan reminder logs
        await tx
            .update(clientReminderLogs)
            .set({ clientId: targetClientId })
            .where(eq(clientReminderLogs.clientId, sourceClientId));

        // Salin kontak jika target belum memiliki
        const updateTargetKontak: {
            kontakEmail?: string;
            kontakWhatsapp?: string;
        } = {};
        if (!targetClient.kontakEmail && sourceClient.kontakEmail) {
            updateTargetKontak.kontakEmail = sourceClient.kontakEmail;
        }
        if (!targetClient.kontakWhatsapp && sourceClient.kontakWhatsapp) {
            updateTargetKontak.kontakWhatsapp = sourceClient.kontakWhatsapp;
        }

        if (Object.keys(updateTargetKontak).length > 0) {
            await tx
                .update(clients)
                .set(updateTargetKontak)
                .where(eq(clients.id, targetClientId));
        }

        // Hapus source client
        await tx.delete(clients).where(eq(clients.id, sourceClientId));

        // Catat audit log
        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "client.merge",
            entitas: "client",
            entitasId: targetClientId,
            sebelum: {
                sourceClient: {
                    id: sourceClient.id,
                    nama: sourceClient.nama,
                },
                targetClient: {
                    id: targetClient.id,
                    nama: targetClient.nama,
                },
            },
            sesudah: {
                targetClientId,
                movedAccountCount: movedAccounts.length,
                movedAccountIds: movedAccounts.map((a) => a.id),
                movedAccountNoAkuns: movedAccounts.map((a) => a.noAkun),
            },
        });

        return {
            success: true,
            targetClientId,
            movedAccountCount: movedAccounts.length,
        };
    });
}
