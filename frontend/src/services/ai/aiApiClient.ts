/**
 * Isolated HTTP client for CertiFlow AI backend endpoints (/api/v1/ai/*).
 * Strictly separates real API responses from mock fallback execution.
 */
export class AiEndpointUnavailableError extends Error {
  constructor(message = 'AI backend endpoint is unavailable.') {
    super(message);
    this.name = 'AiEndpointUnavailableError';
  }
}

export async function requestAiEndpoint<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new AiEndpointUnavailableError();
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  // Vite SPA fallback serves text/html on unmatched /api/* routes when no backend is attached.
  if (
    response.status === 404 ||
    response.status === 502 ||
    response.status === 503 ||
    !isJson
  ) {
    throw new AiEndpointUnavailableError();
  }

  const body = (await response.json()) as T & { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(
      body.message || body.error || `AI service request failed (${response.status}).`
    );
  }

  return body;
}
