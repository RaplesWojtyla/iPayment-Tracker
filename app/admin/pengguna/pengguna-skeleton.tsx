import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PenggunaSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-8 w-36 rounded-lg" />
            </div>

            <Card className="p-0">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <div className="divide-y divide-border">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-4 py-3.5"
                            >
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-7 w-24 rounded-md" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
