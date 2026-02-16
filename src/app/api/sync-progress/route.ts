import { NextResponse } from 'next/server';
import { syncProgressStore } from '@/lib/sync-progress';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (!session || !session.isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = syncProgressStore.get();
    return NextResponse.json(progress);
}
