import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header Mirror */}
            <div className="h-16 bg-card border-b border-border mb-6" />

            <div className="container mx-auto p-4 md:p-8 space-y-8 pt-6">
                {/* Header Section Skeleton */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-40" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Stats Grid Skeleton - 6 cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="border-border shadow-sm overflow-hidden h-32">
                            <CardContent className="p-4 flex flex-col justify-between h-full">
                                <Skeleton className="h-3 w-20 mb-2" />
                                <Skeleton className="h-8 w-12" />
                                <div className="mt-auto pt-3 border-t border-border/50 flex gap-1">
                                    <Skeleton className="h-4 w-6" />
                                    <Skeleton className="h-4 w-6" />
                                    <Skeleton className="h-4 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Middle Row Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Placeholder for Deadline */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <Skeleton className="h-5 w-40" />
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <Skeleton className="h-4 w-8" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-6 w-8 rounded" />
                                        <Skeleton className="h-6 w-8 rounded" />
                                        <Skeleton className="h-6 w-8 rounded" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Placeholder for Activity */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <Skeleton className="h-5 w-40" />
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-2 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Placeholder for Performance */}
                    <Card className="lg:col-span-1 border-border shadow-sm">
                        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex gap-2">
                                        <Skeleton className="h-2 w-2 rounded-full mt-1" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                    <div className="ml-4 border-l border-border pl-3 flex justify-between">
                                        <Skeleton className="h-3 w-32" />
                                        <Skeleton className="h-3 w-12" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Table Skeleton */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex gap-4 border-b border-border/50 pb-4">
                            {[...Array(6)].map((_, i) => (
                                <Skeleton key={i} className="h-4 flex-1" />
                            ))}
                        </div>
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 flex-[2]" />
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 flex-1" />
                                <Skeleton className="h-10 flex-1" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
