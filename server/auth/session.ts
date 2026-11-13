import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from ".";

export type Actor = {
    id: string;
    role: "admin" | "pic";
    email: string;
    name: string;
};

export async function getSession() {
    "use cache: private";
    return auth.api.getSession({
        headers: await headers(),
    });
}

export async function requireActor(): Promise<Actor> {
    const session = await getSession();
    if (!session || !session.user || (session.user as { active?: boolean }).active === false) {
        redirect("/login");
    }

    return {
        id: session.user.id,
        role: ((session.user as { role?: string }).role as "admin" | "pic") || "pic",
        email: session.user.email,
        name: session.user.name,
    };
}

export async function requireAdmin(): Promise<Actor> {
    const actor = await requireActor();
    if (actor.role !== "admin") {
        throw new Error("FORBIDDEN: Akses khusus admin.");
    }
    return actor;
}
