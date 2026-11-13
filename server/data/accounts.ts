import { db } from "@/db";
import { accounts, clients } from "@/db/schema/domain";
import { user } from "@/db/schema/auth";
import type { Actor } from "@/server/auth/session";
import { tulisAuditLog } from "./audit";
import {
    eq,
    or,
    ilike,
    isNull,
    inArray,
    count,
    desc,
    and,
} from "drizzle-orm";

export interface ListAccountsMasterOptions {
    search?: string;
    picId?: string;
    clientId?: string;
    aktif?: boolean;
    unassignedOnly?: boolean;
    page?: number;
    pageSize?: number;
}

export interface CreateAccountInput {
    noAkun: string;
    clientId: string;
    picId?: string | null;
}

export interface SetAccountPicInput {
    accountIds: string[];
    picId: string | null;
}

export interface MoveAccountClientInput {
    accountId: string;
    targetClientId: string;
}

export interface SetAccountAktifInput {
    accountId: string;
    aktif: boolean;
}

/**
 * Mengambil daftar akun untuk kelola Akun Master.
 * Mendukung filter kata kunci, PIC, Client, Status Aktif, dan Server Pagination.
 * ATURAN: Jika actor.role === 'pic', query SQL otomatis dikunci ke pic_id = actor.id.
 */
export async function listAccountsMaster(
    actor: Actor,
    options: ListAccountsMasterOptions = {},
) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 10));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Role PIC: hanya melihat miliknya
    if (actor.role === "pic") {
        conditions.push(eq(accounts.picId, actor.id));
    } else {
        // Admin bisa filter PIC
        if (options.unassignedOnly || options.picId === "unassigned") {
            conditions.push(isNull(accounts.picId));
        } else if (options.picId && options.picId !== "all") {
            conditions.push(eq(accounts.picId, options.picId));
        }
    }

    if (options.clientId && options.clientId !== "all") {
        conditions.push(eq(accounts.clientId, options.clientId));
    }

    if (typeof options.aktif === "boolean") {
        conditions.push(eq(accounts.aktif, options.aktif));
    }

    if (options.search?.trim()) {
        const s = `%${options.search.trim().toLowerCase()}%`;
        conditions.push(
            or(
                ilike(accounts.noAkun, s),
                ilike(clients.nama, s),
                ilike(clients.namaNormal, s),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Hitung total data
    const [countResult] = await db
        .select({ total: count(accounts.id) })
        .from(accounts)
        .innerJoin(clients, eq(accounts.clientId, clients.id))
        .where(whereClause);

    const total = Number(countResult?.total ?? 0);
    const totalPages = Math.ceil(total / pageSize);

    // Ambil data
    const data = await db
        .select({
            id: accounts.id,
            noAkun: accounts.noAkun,
            aktif: accounts.aktif,
            lastCheckedAt: accounts.lastCheckedAt,
            createdAt: accounts.createdAt,
            clientId: accounts.clientId,
            clientNama: clients.nama,
            picId: accounts.picId,
            picName: user.name,
            picEmail: user.email,
        })
        .from(accounts)
        .innerJoin(clients, eq(accounts.clientId, clients.id))
        .leftJoin(user, eq(accounts.picId, user.id))
        .where(whereClause)
        .orderBy(desc(accounts.createdAt))
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

/**
 * Membuat akun baru secara manual oleh Admin.
 * noAkun selalu bertipe string dan mempertahankan nol di depan.
 */
export async function createAccount(
    actor: Actor,
    input: CreateAccountInput,
) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat membuat akun.");
    }

    const noAkun = String(input.noAkun).trim();
    if (!noAkun) {
        throw new Error("No. Akun tidak boleh kosong.");
    }

    return await db.transaction(async (tx) => {
        // Cek keunikan noAkun
        const [existing] = await tx
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.noAkun, noAkun));

        if (existing) {
            throw new Error(`No. Akun "${noAkun}" sudah terdaftar.`);
        }

        const [inserted] = await tx
            .insert(accounts)
            .values({
                noAkun,
                clientId: input.clientId,
                picId: input.picId || null,
                aktif: true,
            })
            .returning();

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "account.create",
            entitas: "account",
            entitasId: inserted.id,
            sebelum: null,
            sesudah: {
                id: inserted.id,
                noAkun: inserted.noAkun,
                clientId: inserted.clientId,
                picId: inserted.picId,
            },
        });

        return inserted;
    });
}

/**
 * Menetapkan PIC untuk satu atau banyak akun sekaligus (bulk assign).
 * Hanya untuk Admin.
 */
export async function setAccountPic(
    actor: Actor,
    input: SetAccountPicInput,
) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat mengatur PIC akun.");
    }

    if (!input.accountIds || input.accountIds.length === 0) {
        throw new Error("Pilih minimal satu akun.");
    }

    return await db.transaction(async (tx) => {
        const existingAccounts = await tx
            .select({ id: accounts.id, picId: accounts.picId })
            .from(accounts)
            .where(inArray(accounts.id, input.accountIds));

        if (existingAccounts.length === 0) {
            throw new Error("Akun yang dipilih tidak ditemukan.");
        }

        await tx
            .update(accounts)
            .set({ picId: input.picId || null })
            .where(inArray(accounts.id, input.accountIds));

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "account.set_pic",
            entitas: "account",
            entitasId: input.accountIds.join(","),
            sebelum: {
                accountPics: existingAccounts.map((a) => ({
                    id: a.id,
                    picId: a.picId,
                })),
            },
            sesudah: {
                targetPicId: input.picId || null,
                accountCount: existingAccounts.length,
            },
        });

        return {
            success: true,
            updatedCount: existingAccounts.length,
        };
    });
}

/**
 * Memindahkan akun ke client lain. Hanya untuk Admin.
 */
export async function moveAccountClient(
    actor: Actor,
    input: MoveAccountClientInput,
) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat memindahkan akun ke client lain.");
    }

    return await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, input.accountId));

        if (!existing) {
            throw new Error("Akun tidak ditemukan.");
        }

        const [targetClient] = await tx
            .select()
            .from(clients)
            .where(eq(clients.id, input.targetClientId));

        if (!targetClient) {
            throw new Error("Client tujuan tidak ditemukan.");
        }

        const [updated] = await tx
            .update(accounts)
            .set({ clientId: input.targetClientId })
            .where(eq(accounts.id, input.accountId))
            .returning();

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "account.move_client",
            entitas: "account",
            entitasId: updated.id,
            sebelum: { clientId: existing.clientId },
            sesudah: { clientId: updated.clientId },
        });

        return updated;
    });
}

/**
 * Mengubah status aktif akun (soft activate/deactivate).
 * Sesuai Bagian 13 spesifikasi: data akun tidak dihapus permanen, melainkan aktif = false.
 */
export async function setAccountAktif(
    actor: Actor,
    input: SetAccountAktifInput,
) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat mengubah status aktif akun.");
    }

    return await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, input.accountId));

        if (!existing) {
            throw new Error("Akun tidak ditemukan.");
        }

        const [updated] = await tx
            .update(accounts)
            .set({ aktif: input.aktif })
            .where(eq(accounts.id, input.accountId))
            .returning();

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "account.set_aktif",
            entitas: "account",
            entitasId: updated.id,
            sebelum: { aktif: existing.aktif },
            sesudah: { aktif: updated.aktif },
        });

        return updated;
    });
}
