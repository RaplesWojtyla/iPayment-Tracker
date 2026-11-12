import { LoginForm } from "./login-form";

export default function LoginPage() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
            <h1 className="text-xl font-semibold">Masuk</h1>
            <LoginForm />
        </main>
    )
}
