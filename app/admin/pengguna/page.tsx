import { Suspense } from "react";
import { requireAdmin } from "@/server/auth/session";
import { listPicUsers } from "@/server/data/users";
import { UsersClient } from "./users-client";
import { PenggunaSkeleton } from "./pengguna-skeleton";
import { connection } from "next/server";

export default function PenggunaPage() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Suspense fallback={<PenggunaSkeleton />}>
                <PenggunaContent />
            </Suspense>
        </main>
    );
}

async function PenggunaContent() {
    await connection()
    const actor = await requireAdmin();
    const users = await listPicUsers(actor);

    return <UsersClient users={users} currentUserId={actor.id} />;
}
