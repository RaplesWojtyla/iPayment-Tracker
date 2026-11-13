import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { AppNavSkeleton } from "@/components/app-nav-skeleton";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "iPayment Track",
    description: "Pelacak tunggakan pelanggan per No. Akun",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            lang="id"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col bg-muted/30 text-foreground">
                <Suspense fallback={<AppNavSkeleton />}>
                    <AppNav />
                </Suspense>
                <div className="flex-1">{children}</div>
            </body>
        </html>
    );
}
