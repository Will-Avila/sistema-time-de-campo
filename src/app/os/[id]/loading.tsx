import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function OSDetailLoading() {
    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            {/* Header Mirror */}
            <div className="h-16 bg-card border-b border-border mb-6" />

            <div className="container mx-auto p-4 space-y-6">
                {/* OS Header Info */}
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                </div>

                {/* Tabs Mirror */}
                <div className="flex gap-2 border-b border-border overflow-x-auto pb-px">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-24 shrink-0" />
                    ))}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 border-border">
                        <CardHeader className="border-b">
                            <Skeleton className="h-6 w-48" />
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <Skeleton className="h-6 w-6 rounded" />
                                    <div className="flex-1 space-y-1">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                    <Skeleton className="h-8 w-20" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-border">
                            <CardContent className="p-6 space-y-4">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-6 w-full" />
                                <Skeleton className="h-4 w-20 pt-4" />
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
