import type { CreateRequestInput, PublicCase, Status, UpdateRequest } from '../../shared/schema';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {}
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Token'] = token;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่', data.fields);
  return data as T;
}

export const api = {
  list: (statuses: Status[]) => call<PublicCase[]>('GET', `/requests?status=${statuses.join(',')}`),
  get: (id: string) => call<PublicCase>('GET', `/requests/${id}`),
  create: (input: CreateRequestInput) => call<{ id: string; ownerToken: string }>('POST', '/requests', input),
  update: (id: string, patch: Partial<UpdateRequest>, token: string) =>
    call<PublicCase>('PATCH', `/requests/${id}`, patch, token),
  revealPhone: (id: string) => call<{ phone: string | null }>('POST', `/requests/${id}/phone`),
  claim: (id: string, name: string) => call<{ claimToken: string }>('POST', `/requests/${id}/claim`, { name }),
  release: (id: string, token: string) => call<PublicCase>('POST', `/requests/${id}/release`, undefined, token),
  resolve: (id: string, token: string) => call<PublicCase>('POST', `/requests/${id}/resolve`, undefined, token),
  flag: (id: string) => call<void>('POST', `/requests/${id}/flag`),
};
