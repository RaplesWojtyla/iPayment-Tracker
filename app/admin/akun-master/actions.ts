"use server";

import { requireAdmin } from "@/server/auth/session";
import {
    createAccount,
    setAccountPic,
    moveAccountClient,
    setAccountAktif,
} from "@/server/data/accounts";
import {
    createClient,
    updateClient,
    mergeClients,
} from "@/server/data/clients";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createAccountSchema = z.object({
    noAkun: z.string().min(1, "No. Akun wajib diisi"),
    clientId: z.string().uuid("Client tidak valid"),
    picId: z.string().nullable().optional(),
});

const setAccountPicSchema = z.object({
    accountIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu akun"),
    picId: z.string().nullable(),
});

const moveAccountClientSchema = z.object({
    accountId: z.string().uuid("Akun tidak valid"),
    targetClientId: z.string().uuid("Client tujuan tidak valid"),
});

const setAccountAktifSchema = z.object({
    accountId: z.string().uuid("Akun tidak valid"),
    aktif: z.boolean(),
});

const createClientSchema = z.object({
    nama: z.string().min(1, "Nama client wajib diisi"),
    kontakEmail: z.string().email("Format email tidak valid").or(z.literal("")).nullable().optional(),
    kontakWhatsapp: z.string().nullable().optional(),
});

const updateClientSchema = z.object({
    id: z.string().uuid("Client tidak valid"),
    nama: z.string().min(1, "Nama client wajib diisi"),
    kontakEmail: z.string().email("Format email tidak valid").or(z.literal("")).nullable().optional(),
    kontakWhatsapp: z.string().nullable().optional(),
});

const mergeClientsSchema = z.object({
    sourceClientId: z.string().uuid("Client sumber tidak valid"),
    targetClientId: z.string().uuid("Client tujuan tidak valid"),
});

export async function createAccountAction(input: z.infer<typeof createAccountSchema>) {
    const actor = await requireAdmin();
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        await createAccount(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message || "Gagal membuat akun" };
    }
}

export async function setAccountPicAction(input: z.infer<typeof setAccountPicSchema>) {
    const actor = await requireAdmin();
    const parsed = setAccountPicSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        const res = await setAccountPic(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true, count: res.updatedCount };
    } catch (err) {
        return { error: (err as Error).message || "Gagal menetapkan PIC" };
    }
}

export async function moveAccountClientAction(input: z.infer<typeof moveAccountClientSchema>) {
    const actor = await requireAdmin();
    const parsed = moveAccountClientSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        await moveAccountClient(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message || "Gagal memindahkan akun" };
    }
}

export async function setAccountAktifAction(input: z.infer<typeof setAccountAktifSchema>) {
    const actor = await requireAdmin();
    const parsed = setAccountAktifSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        await setAccountAktif(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message || "Gagal mengubah status aktif akun" };
    }
}

export async function createClientAction(input: z.infer<typeof createClientSchema>) {
    const actor = await requireAdmin();
    const parsed = createClientSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        await createClient(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message || "Gagal membuat client" };
    }
}

export async function updateClientAction(input: z.infer<typeof updateClientSchema>) {
    const actor = await requireAdmin();
    const parsed = updateClientSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        await updateClient(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true };
    } catch (err) {
        return { error: (err as Error).message || "Gagal memperbarui client" };
    }
}

export async function mergeClientsAction(input: z.infer<typeof mergeClientsSchema>) {
    const actor = await requireAdmin();
    const parsed = mergeClientsSchema.safeParse(input);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || "Input tidak valid" };
    }

    try {
        const res = await mergeClients(actor, parsed.data);
        revalidatePath("/admin/akun-master");
        return { success: true, count: res.movedAccountCount };
    } catch (err) {
        return { error: (err as Error).message || "Gagal menggabungkan client" };
    }
}

