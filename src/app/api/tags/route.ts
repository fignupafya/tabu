import { errorResponse } from '@/server/http';
import { getWordService } from '@/server/word-service';

export const dynamic = 'force-dynamic';

/** GET /api/tags → { tags: [{ tag, count }] }, most used first */
export async function GET() {
  try {
    return Response.json({ tags: await getWordService().listTags() });
  } catch (error) {
    return errorResponse(error);
  }
}
