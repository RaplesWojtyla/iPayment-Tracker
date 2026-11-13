import { getSession } from "@/server/auth/session";
import { AppNavClient } from "./app-nav-client";

export async function AppNav() {
    const session = await getSession();
    if (!session || !session.user) {
        return null;
    }

    const role = ((session.user as { role?: string }).role as "admin" | "pic") || "pic";

    return (
        <AppNavClient
            user={{
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role,
            }}
        />
    );
}

