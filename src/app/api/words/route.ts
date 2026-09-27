import type { NextRequest } from 'next/server';
import { errorResponse, readJson, tagsParam } from '@/server/http';
import { getWordService } from '@/server/word-service';

/** GET /api/words?search=çay&tags=yemek,içecek → { words } */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const words = await getWordService().listWords({ search, tags: tagsParam(request.nextUrl) });
    return Response.json({ words });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/words — body: one word entry → 201 { entry, warnings } */
export async function POST(request: Request) {
  try {
    const saved = await getWordService().createWord(await readJson(request));
    return Response.json(saved, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
