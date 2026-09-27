import { z } from 'zod';
import { errorResponse, readJson } from '@/server/http';
import { getWordService } from '@/server/word-service';

export const dynamic = 'force-dynamic';

const markRequest = z.object({ ids: z.array(z.string().min(1).max(100)).max(5000) });

/** GET /api/played → { played }: words that came up in games, newest first */
export async function GET() {
  try {
    return Response.json({ played: await getWordService().listPlayed() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/played — body { ids }: records words that came up in a game (idempotent) */
export async function POST(request: Request) {
  try {
    const body = markRequest.safeParse(await readJson(request));
    if (!body.success) {
      return Response.json(
        { error: 'Geçersiz istek', details: body.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }
    await getWordService().markPlayed(body.data.ids);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/played — clears the list: every word can come up again */
export async function DELETE() {
  try {
    await getWordService().clearPlayed();
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
