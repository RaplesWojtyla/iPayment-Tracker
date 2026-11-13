import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/server/auth/session";
import { listPicUsers } from "@/server/data/users";
import { ImporClient } from "./impor-client";
import { ImporSkeleton } from "./impor-skeleton";

export default function ImporPage() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Suspense fallback={<ImporSkeleton />}>
                <ImporContent />
            </Suspense>
        </main>
    );
}

async function ImporContent() {
    await connection();
    const actor = await requireAdmin();
    const picUsers = await listPicUsers(actor, { onlyActive: true });

    return <ImporClient picUsers={picUsers} />;
}

