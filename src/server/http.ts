import 'server-only';
import { normalizeText } from '@/core/words/word';
import { WordFileError } from '@/core/words/word-file';
import { WordServiceError } from '@/core/words/word-service';

const STATUS: Record<WordServiceError['code'], number> = { invalid: 400, not_found: 404, conflict: 409 };

/**
 * Context of the `[id]` route handlers. Written out rather than Next's generated `RouteContext<…>`:
 * the static build leaves route handlers out, so their generated route types don't exist there.
 */
export interface IdRouteContext {
  params: Promise<{ id: string }>;
}

/** Error body shared by every endpoint: `{ error, details? }`. */
export function errorResponse(error: unknown): Response {
  if (error instanceof WordServiceError) {
    return Response.json({ error: error.message, details: error.details }, { status: STATUS[error.code] });
  }
  if (error instanceof WordFileError) {
    return Response.json(
      { error: `Kelime dosyası okunamadı: ${error.message}`, details: error.problems },
      { status: 500 },
    );
  }
  console.error(error);
  return Response.json({ error: 'Beklenmeyen bir hata oluştu' }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new WordServiceError('invalid', 'İstek gövdesi geçerli bir JSON değil');
  }
}

/** `?tags=yemek,içecek` → ['yemek', 'içecek'] */
export function tagsParam(url: URL): string[] {
  return (url.searchParams.get('tags') ?? '').split(',').map(normalizeText).filter(Boolean);
}

/** Route params may arrive percent-encoded depending on the client; decode defensively. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
