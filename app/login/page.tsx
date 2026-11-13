import { LoginForm } from "./login-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Masuk</CardTitle>
                    <CardDescription>
                        Masuk ke akun iPayment Track Anda.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginForm />
                </CardContent>
            </Card>
        </main>
    );
}
