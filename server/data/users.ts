import { db } from "@/db"
import { user, session } from "@/db/schema/auth"
import { auth } from "@/server/auth"
import type { Actor } from "@/server/auth/session"
import { tulisAuditLog } from "./audit"
import { eq, and, desc } from "drizzle-orm"

export interface CreateUserInput {
    name: string
    email: string
    password: string
    role: "admin" | "pic"
}

export async function listPicUsers(
    actor: Actor,
    options?: { onlyActive?: boolean },
) {
    if (actor.role === "pic") {
        const query = and(
            eq(user.id, actor.id),
            options?.onlyActive ? eq(user.active, true) : undefined,
        )
        return db
            .select({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                active: user.active,
                createdAt: user.createdAt,
            })
            .from(user)
            .where(query)
            .orderBy(user.name)
    }

    const query = options?.onlyActive ? eq(user.active, true) : undefined
    return db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
            createdAt: user.createdAt,
        })
        .from(user)
        .where(query)
        .orderBy(desc(user.createdAt))
}

export async function createUserByAdmin(actor: Actor, input: CreateUserInput) {
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Hanya admin yang dapat membuat pengguna.")
    }

    const created = await auth.api.createUser({
        body: {
            email: input.email.trim().toLowerCase(),
            password: input.password,
            name: input.name.trim(),
            role: input.role as unknown as "user",
            data: {
                active: true,
            },
        },
    })

    await tulisAuditLog(db, {
        userId: actor.id,
        aksi: "user.create",
        entitas: "user",
        entitasId: created.user.id,
        sebelum: null,
        sesudah: {
            id: created.user.id,
            email: created.user.email,
            name: created.user.name,
            role: created.user.role,
        },
    })

    return created.user
}

export async function setUserActiveByAdmin(
    actor: Actor,
    input: {
        userId: string
        active: boolean
    },
) {
    if (actor.role !== "admin") {
        throw new Error(
            "FORBIDDEN: Hanya admin yang dapat mengubah status pengguna.",
        )
    }

    if (input.userId === actor.id && !input.active) {
        throw new Error(
            "TIDAK_DIIZINKAN: Tidak dapat menonaktifkan akun sendiri.",
        )
    }

    return await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(user)
            .where(eq(user.id, input.userId))

        if (!existing) {
            throw new Error("Pengguna tidak ditemukan.")
        }

        const [updated] = await tx
            .update(user)
            .set({ active: input.active })
            .where(eq(user.id, input.userId))
            .returning()

        if (!input.active) {
            await tx.delete(session).where(eq(session.userId, input.userId))
        }

        await tulisAuditLog(tx, {
            userId: actor.id,
            aksi: "user.set_active",
            entitas: "user",
            entitasId: input.userId,
            sebelum: { active: existing.active },
            sesudah: { active: updated.active },
        })

        return updated
    })
}
