import { db } from "@/db";
import { auditLogs } from "@/db/schema/domain";

export type DbOrTx =
    typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface TulisAuditLogInput {
    userId?: string | null;
    aksi: string;
    entitas: string;
    entitasId: string;
    sebelum?: Record<string, unknown> | null;
    sesudah?: Record<string, unknown> | null;
}

export async function tulisAuditLog(
    txOrDb: DbOrTx,
    input: TulisAuditLogInput,
): Promise<void> {
    await txOrDb.insert(auditLogs).values({
        userId: input.userId ?? null,
        aksi: input.aksi,
        entitas: input.entitas,
        entitasId: input.entitasId,
        sebelum: input.sebelum ?? null,
        sesudah: input.sesudah ?? null,
    });
}
