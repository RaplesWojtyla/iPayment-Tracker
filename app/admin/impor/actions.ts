"use server";

import { requireAdmin } from "@/server/auth/session";
import {
    previewImportExcel,
    commitImportExcel,
    type CommitImportPayload,
} from "@/server/services/import";
import { revalidatePath } from "next/cache";

export async function previewImportAction(formData: FormData) {
    const actor = await requireAdmin();

    const picId = formData.get("picId") as string;
    const file = formData.get("file") as File;

    if (!picId) {
        return { error: "Pilih PIC penanggung jawab terlebih dahulu." };
    }

    if (!file || file.size === 0) {
        return { error: "Pilih file Excel (.xlsx) untuk diimpor." };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const preview = await previewImportExcel(actor, picId, buffer);
        return { success: true, preview };
    } catch (err) {
        return {
            error: (err as Error).message || "Gagal memproses pratinjau file Excel.",
        };
    }
}

export async function commitImportAction(payload: CommitImportPayload) {
    const actor = await requireAdmin();

    try {
        const result = await commitImportExcel(actor, payload);
        revalidatePath("/admin/akun-master");
        revalidatePath("/admin/impor");
        return { success: true, summary: result.summary };
    } catch (err) {
        return {
            error: (err as Error).message || "Gagal menyimpan data impor.",
        };
    }
}

