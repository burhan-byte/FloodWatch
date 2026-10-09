type TokenKind = 'owner' | 'claim';
type Stored = Record<string, Partial<Record<TokenKind, string>>>;

const KEY = 'floodwatch.tokens';

// localStorage can throw (private mode, blocked storage); tokens are a convenience, never required
function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(stored: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // ignore
  }
}

export function getTokens(id: string): Partial<Record<TokenKind, string>> {
  return read()[id] ?? {};
}

export function saveToken(id: string, kind: TokenKind, token: string): void {
  const stored = read();
  stored[id] = { ...stored[id], [kind]: token };
  write(stored);
}

export function clearToken(id: string, kind: TokenKind): void {
  const stored = read();
  if (!stored[id]) return;
  delete stored[id][kind];
  write(stored);
}
