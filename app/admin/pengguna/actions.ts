"use server";

import { requireAdmin } from "@/server/auth/session";
import { createUserByAdmin, setUserActiveByAdmin } from "@/server/data/users";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createUserSchema = z.object({
    name: z.string().min(1, "Nama wajib diisi"),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    role: z.enum(["admin", "pic"]),
});

export async function createUserAction(formData: FormData) {
    const actor = await requireAdmin();

    const rawData = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
    };

    const parsed = createUserSchema.safeParse(rawData);
    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message || "Input tidak valid",
        };
    }

    try {
        await createUserByAdmin(actor, parsed.data);
        revalidatePath("/admin/pengguna");
        return { success: true };
    } catch (err) {
        return {
            error: (err as Error).message || "Gagal membuat pengguna",
        };
    }
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
    const actor = await requireAdmin();

    try {
        await setUserActiveByAdmin(actor, { userId, active });
        revalidatePath("/admin/pengguna");
        return { success: true };
    } catch (err) {
        return {
            error: (err as Error).message || "Gagal mengubah status pengguna",
        };
    }
}

