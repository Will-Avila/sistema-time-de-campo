import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function EquipesLoading() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header Mirror */}
            <div className="h-16 bg-card border-b border-border mb-6" />

            <div className="container pt-6 pb-8 space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                        <Skeleton className="h-9 w-40" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </header>

                <Card className="border-border">
                    <CardHeader className="border-b flex flex-row items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-10 w-48" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-48" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-8 w-16" />
                                        <Skeleton className="h-8 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
