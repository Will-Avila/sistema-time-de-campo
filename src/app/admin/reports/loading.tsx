import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportLoading() {
    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header Mirror */}
            <div className="h-16 bg-card border-b border-border mb-6" />

            <div className="container p-6 space-y-8">
                {/* Title & Desc Skeleton */}
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>

                {/* Back Button & Selector Skeleton */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-44 rounded-lg" />
                    <Skeleton className="h-10 w-48 rounded-md" />
                </div>

                {/* Summary Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border-border shadow-sm">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-7 w-16" />
                                </div>
                                <Skeleton className="h-10 w-10 rounded-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content (Chart/Table) Skeleton */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="pb-3 border-b border-border/50">
                        <Skeleton className="h-6 w-48" />
                    </CardHeader>
                    <CardContent className="p-8">
                        {/* Fake Chart area */}
                        <div className="h-[400px] flex items-end justify-around gap-4">
                            {[...Array(10)].map((_, i) => (
                                <Skeleton key={i} className={`w-full rounded-t-sm`} style={{ height: `${Math.random() * 80 + 20}%` }} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
