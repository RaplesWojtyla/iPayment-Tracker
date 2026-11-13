import { OtpForm } from "./otp-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function OtpPage() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Verifikasi OTP</CardTitle>
                    <CardDescription>
                        Kami mengirim kode 6 digit ke email Anda. Masukkan kode
                        untuk melanjutkan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OtpForm />
                </CardContent>
            </Card>
        </main>
    );
}
