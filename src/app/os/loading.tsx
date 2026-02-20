import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function OSListLoading() {
    return (
        <div className="min-h-screen bg-muted/30 pb-20">
            {/* Header Mirror */}
            <div className="h-16 bg-card border-b border-border mb-6" />

            <div className="container mx-auto p-4 space-y-6">
                {/* Search and Filters Skeleton */}
                <div className="flex flex-col md:flex-row gap-4">
                    <Skeleton className="h-12 flex-1" />
                    <Skeleton className="h-12 w-full md:w-40" />
                    <Skeleton className="h-12 w-full md:w-32" />
                </div>

                {/* List Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i} className="border-border shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between">
                                    <Skeleton className="h-5 w-24" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <Skeleton className="h-8 w-24" />
                                    <Skeleton className="h-6 w-12" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
