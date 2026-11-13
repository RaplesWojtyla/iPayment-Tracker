import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AkunMasterSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-52" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-8 w-32 rounded-lg" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-border pb-2">
                <Skeleton className="h-6 w-36 rounded-md" />
                <Skeleton className="h-6 w-32 rounded-md" />
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                </div>
            </Card>

            {/* Table */}
            <Card className="p-0">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <Skeleton className="size-4 rounded" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-10" />
                    </div>
                    <div className="divide-y divide-border">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-4 py-3.5"
                            >
                                <Skeleton className="size-4 rounded" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="size-7 rounded-md" />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <Skeleton className="h-4 w-44" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="size-7 rounded-md" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="size-7 rounded-md" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
