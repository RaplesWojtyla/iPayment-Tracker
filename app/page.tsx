import { getSession } from "@/server/auth/session";
import { Suspense } from "react";

export default function Home() {
    return (
        <main className="p-6">
            <Suspense fallback={<p>Memuat...</p>}>
                <Profile />
            </Suspense>
        </main>
    )
}

async function Profile() {
    const session = await getSession()
    if (!session) return null

    return (
        <h1 className="text-xl font-semibold">
            Halo, {session.user.email}
        </h1>
    )
}
