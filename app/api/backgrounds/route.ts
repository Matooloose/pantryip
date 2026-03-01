import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const dir = path.join(process.cwd(), 'public', 'backgrounds');

    try {
        const files = fs.readdirSync(dir);
        const images = files
            .filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
            .map((f) => `/backgrounds/${f}`);

        return NextResponse.json({ images });
    } catch {
        return NextResponse.json({ images: [] });
    }
}
