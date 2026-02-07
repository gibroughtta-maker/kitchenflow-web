/**
 * Phase 5：后端 REST 客户端
 * 遵循 integrating-backend-api：基址从 env 读取、超时与取消、错误显式处理、契约一致
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base || typeof base !== 'string') throw new Error('VITE_API_BASE_URL 未设置');
  return base.replace(/\/$/, '');
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * 统一请求：JSON 请求体、JSON 响应、超时、非 2xx 抛 ApiError
 */
export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { signal: outerSignal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let offAbort: (() => void) | undefined;
  if (outerSignal) {
    if (outerSignal.aborted) {
      clearTimeout(timeoutId);
      throw new ApiError('请求已取消', undefined, 'ABORTED');
    }
    const onAbort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    outerSignal.addEventListener('abort', onAbort);
    offAbort = () => outerSignal.removeEventListener('abort', onAbort);
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    offAbort?.();

    let data: unknown;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === 'object' && 'message' in data && String((data as { message: unknown }).message)) ||
        res.statusText ||
        `HTTP ${res.status}`;
      const code = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : undefined;
      throw new ApiError(String(msg), res.status, code, data);
    }

    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    offAbort?.();
    if (err instanceof ApiError) throw err;
    if (err instanceof Error) {
      if (err.name === 'AbortError') throw new ApiError('请求超时，请稍后重试', undefined, 'TIMEOUT');
      throw new ApiError(err.message || '网络错误，请检查连接后重试', undefined, 'NETWORK');
    }
    throw new ApiError('请求失败，请稍后重试');
  }
}

export function isBackendConfigured(): boolean {
  return import.meta.env.VITE_USE_BACKEND === 'true' && !!import.meta.env.VITE_API_BASE_URL;
}
