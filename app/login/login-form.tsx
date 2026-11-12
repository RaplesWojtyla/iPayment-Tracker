"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setPending(true);

        const { error } = await authClient.signIn.email(
            { email, password },
            {
                onSuccess(ctx) {
                    if (ctx.data?.twoFactorRedirect) return;
                    router.replace("/")
                },
            },
        );

        setPending(false);
        if (error) {
            setError(error.message ?? "Gagal masuk.");
        }
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
                type="email"
                name="email"
                required
                autoComplete="username"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border px-3 py-2"
            />
            <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border px-3 py-2"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
                type="submit"
                disabled={pending}
                className="rounded bg-black px-3 py-2 text-white"
            >
                {pending ? "Memproses…" : "Masuk"}
            </button>
        </form>
    )
}
