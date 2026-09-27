import type { NextRequest } from 'next/server';
import { DIFFICULTY_LEVELS, isDifficultyLevel } from '@/core/words/difficulty';
import { errorResponse, tagsParam } from '@/server/http';
import { getWordService } from '@/server/word-service';

/** GET /api/deck?difficulty=medium&tags=yemek,spor → { cards } with taboo words resolved for the level */
export async function GET(request: NextRequest) {
  try {
    const difficulty = request.nextUrl.searchParams.get('difficulty') ?? 'medium';
    if (!isDifficultyLevel(difficulty)) {
      return Response.json(
        { error: `Geçersiz zorluk: "${difficulty}" (geçerli: ${DIFFICULTY_LEVELS.join(', ')})` },
        { status: 400 },
      );
    }
    const cards = await getWordService().buildDeck({ difficulty, tags: tagsParam(request.nextUrl) });
    return Response.json({ cards });
  } catch (error) {
    return errorResponse(error);
  }
}
