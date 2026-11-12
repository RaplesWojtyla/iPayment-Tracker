"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const COOLDOWN = 60;
const RESEND_LABEL = "Kirim ulang kode";

export function OtpForm() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const sentOnce = useRef(false);

    const send = async () => {
        await authClient.twoFactor.sendOtp({});
        setCooldown(COOLDOWN);
    };

    useEffect(() => {
        if (sentOnce.current) return;

        sentOnce.current = true;
        send();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;

        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const onSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setPending(true);

        const { error } = await authClient.twoFactor.verifyOtp({ code });
        setPending(false);
        if (error) {
            setError(error.message ?? "Kode OTP salah.");
            return;
        }
        router.replace("/");
    };

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                autoFocus
                placeholder="Kode 6 digit"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="rounded border px-3 py-2 tracking-[0.3em]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
                type="submit"
                disabled={pending || code.length < 6}
                className={`rounded bg-black px-3 py-2 text-white ${cooldown == 0 ? "cursor-pointer" : ""}`}
            >
                {pending ? "Memverifikasi…" : "Verifikasi"}
            </button>
            <button
                type="button"
                disabled={cooldown > 0}
                onClick={send}
                className={`text-sm underline disabled:opacity-50 ${cooldown == 0 ? "cursor-pointer" : ""}`}
            >
                {cooldown > 0 ? `${RESEND_LABEL} (${cooldown}s)` : RESEND_LABEL}
            </button>
        </form>
    );
}
