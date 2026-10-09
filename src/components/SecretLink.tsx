import { useState } from 'react';

/** A private management link (owner or claim) with copy/share buttons and a note to keep it */
export function SecretLink({ link, title, note, shareTitle }: { link: string; title: string; note: string; shareTitle: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard
      ?.writeText(link)
      .then(() => setCopied(true))
      .catch(() => undefined);
  const share = () => navigator.share?.({ title: shareTitle, url: link }).catch(() => undefined);

  return (
    <div className="space-y-2 rounded-2xl border border-amber-600/60 bg-amber-950/40 p-4 text-left">
      <p className="text-sm font-bold text-amber-200">{title}</p>
      <p className="text-xs text-amber-100/80">{note}</p>
      <p className="break-all rounded-lg bg-slate-950 p-2 font-mono text-xs text-slate-200">{link}</p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
        </button>
        {'share' in navigator && (
          <button type="button" onClick={share} className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white">
            แชร์
          </button>
        )}
      </div>
    </div>
  );
}
