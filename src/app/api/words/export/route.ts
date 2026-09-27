import { serializeWordFile } from '@/core/words/word-file';
import { errorResponse } from '@/server/http';
import { getWordService } from '@/server/word-service';

export const dynamic = 'force-dynamic';

/** GET /api/words/export — every word as a downloadable file in the import format. */
export async function GET() {
  try {
    const words = await getWordService().listWords();
    const date = new Date().toISOString().slice(0, 10);
    return new Response(serializeWordFile(words), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tabu-kelimeler-${date}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
