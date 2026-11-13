"use client";

import { useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm() {
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
                    window.location.replace("/");
                },
            },
        );

        setPending(false);
        if (error) {
            setError(error.message ?? "Gagal masuk.");
        }
    };

    return (
        <form onSubmit={onSubmit}>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="login-email">Email</FieldLabel>
                    <Input
                        id="login-email"
                        type="email"
                        name="email"
                        required
                        autoComplete="username"
                        placeholder="nama@perusahaan.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </Field>

                <Field>
                    <FieldLabel htmlFor="login-password">Password</FieldLabel>
                    <Input
                        id="login-password"
                        type="password"
                        name="password"
                        required
                        autoComplete="current-password"
                        placeholder="Masukkan password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </Field>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircleIcon />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button type="submit" disabled={pending} className="w-full">
                    {pending && <Spinner data-icon="inline-start" />}
                    {pending ? "Memproses…" : "Masuk"}
                </Button>
            </FieldGroup>
        </form>
    );
}
