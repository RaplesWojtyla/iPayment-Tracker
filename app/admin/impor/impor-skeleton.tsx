import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ImporSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            <Card className="max-w-xl">
                <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-8 w-full rounded-lg" />
                        <Skeleton className="h-3 w-64" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-36 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-9 w-full rounded-lg" />
                </CardContent>
            </Card>
        </div>
    );
}
