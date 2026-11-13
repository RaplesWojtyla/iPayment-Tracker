import { Skeleton } from "@/components/ui/skeleton";

export function AppNavSkeleton() {
    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-5 w-28" />
                    <div className="hidden items-center gap-2 md:flex">
                        <Skeleton className="h-7 w-20 rounded-md" />
                        <Skeleton className="h-7 w-22 rounded-md" />
                        <Skeleton className="h-7 w-22 rounded-md" />
                        <Skeleton className="h-7 w-14 rounded-md" />
                        <Skeleton className="h-7 w-14 rounded-md" />
                    </div>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="size-8 rounded-md md:hidden" />
            </div>
        </header>
    );
}
