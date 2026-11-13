"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const COOLDOWN = 60;
const RESEND_LABEL = "Kirim ulang kode";

export function OtpForm() {
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
        window.location.replace("/");
    };

    return (
        <form onSubmit={onSubmit}>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="otp-code">Kode Verifikasi</FieldLabel>
                    <Input
                        id="otp-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="000000"
                        value={code}
                        onChange={(e) =>
                            setCode(e.target.value.replace(/\D/g, ""))
                        }
                        className="text-center font-mono text-base tracking-[0.35em]"
                    />
                </Field>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col gap-2">
                    <Button
                        type="submit"
                        disabled={pending || code.length < 6}
                        className="w-full"
                    >
                        {pending && <Spinner data-icon="inline-start" />}
                        {pending ? "Memverifikasi…" : "Verifikasi"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={cooldown > 0}
                        onClick={send}
                        className="w-full"
                    >
                        {cooldown > 0
                            ? `${RESEND_LABEL} (${cooldown}s)`
                            : RESEND_LABEL}
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}
