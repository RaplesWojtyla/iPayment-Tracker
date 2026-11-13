import { Suspense } from "react";
import { getSession } from "@/server/auth/session";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Suspense fallback={<HomeSkeleton />}>
                <Profile />
            </Suspense>
        </main>
    );
}

function HomeSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-16" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
}

async function Profile() {
    const session = await getSession();
    if (!session) return null;

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">
                        Halo, {session.user.name || session.user.email}
                    </CardTitle>
                    <CardDescription>
                        Selamat datang di dashboard iPayment Track.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
