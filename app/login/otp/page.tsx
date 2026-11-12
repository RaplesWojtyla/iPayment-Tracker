import { OtpForm } from "./otp-form";

export default function OtpPage() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
            <h1 className="text-xl font-semibold">Verifikasi OTP</h1>
            <p className="text-sm text-zinc-600">
                Kami mengirim kode 6 digit ke email Anda. Masukkan kode untuk
                melanjutkan.
            </p>
            <OtpForm />
        </main>
    )
}
