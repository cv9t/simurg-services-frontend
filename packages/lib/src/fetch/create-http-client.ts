import { errorToString } from '../string';
import { sleep } from '../time';
import {
  BadDataError,
  ConflictError,
  ForbiddenError,
  type HttpError,
  HttpErrorStatus,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  NetworkError,
  PreparationError,
} from './api-error';

export type ContentType = 'application/json' | 'multipart/form-data';

export type ResponseType = 'json' | 'arraybuffer' | 'stream';

export type RequestMethod = 'POST' | 'GET' | 'DELETE' | 'PUT' | 'PATCH';

export type RequestOptions<T> = {
  path: string;
  method: RequestMethod;
  data?: T;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  contentType?: ContentType;
  responseType?: ResponseType;
  delay?: number;
};

export type HttpClient = {
  request: <TData, TResult>(options: RequestOptions<TData>) => Promise<TResult>;
};

export type CreateHttpClientOptions = {
  baseUrl: string;
  withCredentials?: boolean;
};

export const createHttpClient = (createOptions: CreateHttpClientOptions): HttpClient => {
  const buildEndpoint = (path: string, query?: Record<string, any>): string => {
    const params = query ? new URLSearchParams(query) : undefined;
    return `${createOptions.baseUrl}/${path}${params ? `?${params}` : ''}`;
  };

  const request: HttpClient['request'] = async (options) => {
    const headers = new Headers(options.headers);
    if (options.contentType !== 'multipart/form-data') {
      contentDefault(headers, options.contentType ?? 'application/json');
    }

    const endpoint = buildEndpoint(options.path, options.query);
    const body =
      contentIs(headers, 'application/json') && options.data
        ? JSON.stringify(options.data)
        : (options.data as BodyInit);

    if (options.delay) {
      await sleep(options.delay);
    }

    const res = await fetch(endpoint, {
      method: options.method,
      headers,
      body,
      credentials: createOptions.withCredentials ? 'include' : undefined,
    }).catch((error) => {
      throw new NetworkError(errorToString(error));
    });

    if (res.ok) {
      try {
        const data = await parseResponse(res, options.responseType ?? 'json');
        return data;
      } catch (error) {
        throw new PreparationError(errorToString(error));
      }
    }
    throw await parseHttpError(res);
  };

  return {
    request,
  };
};

function contentIs(headers: Headers, type: ContentType): boolean {
  return Boolean(headers.get('content-type')?.includes(type));
}

function contentDefault(headers: Headers, type: ContentType): void {
  if (!headers.has('content-type')) {
    headers.set('content-type', type);
  }
}

async function parseResponse(res: Response, resType: ResponseType): Promise<any> {
  if (resType === 'stream') {
    return res.text();
  }
  if (resType === 'arraybuffer') {
    return res.arrayBuffer();
  }
  return res.json();
}

async function parseHttpError(res: Response): Promise<HttpError> {
  const message = await res.text();
  switch (res.status) {
    case HttpErrorStatus.BAD_DATA:
      return new BadDataError(message);
    case HttpErrorStatus.UNAUTHORIZED:
      return new UnauthorizedError(message);
    case HttpErrorStatus.FORBIDDEN:
      return new ForbiddenError(message);
    case HttpErrorStatus.NOT_FOUND:
      return new NotFoundError(message);
    case HttpErrorStatus.CONFLICT:
      return new ConflictError(message);
    default:
      return new ServerError(message);
  }
}
