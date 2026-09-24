import type { EventDetail } from "@/lib/queries/event-detail";
import { ATTACHMENT_KIND_LABELS } from "@/lib/labels";
import { displayName } from "@/lib/auth";
import { formatDate } from "@/lib/time";
import { addAttachmentAction, deleteAttachmentAction } from "@/lib/actions/attachment-actions";

export function FilesTab({
  event,
  canPost,
  currentUserId,
  isAdmin
}: {
  event: EventDetail;
  canPost: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const byKind = new Map<string, EventDetail["attachments"]>();
  for (const a of event.attachments) {
    byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), a]);
  }

  return (
    <div className="space-y-6">
      {Array.from(byKind.entries()).map(([kind, files]) => (
        <section key={kind}>
          <h2 className="mb-2 text-sm font-bold text-ink">
            {ATTACHMENT_KIND_LABELS[kind as keyof typeof ATTACHMENT_KIND_LABELS]}
          </h2>
          <ul className="space-y-1 rounded border border-line bg-surface p-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <a href={f.url} target="_blank" rel="noreferrer" className="text-ink underline hover:text-gold">
                  {f.title}
                </a>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {displayName(f.addedBy)} · {formatDate(f.createdAt)}
                  {(isAdmin || f.addedById === currentUserId) && (
                    <form action={deleteAttachmentAction.bind(null, event.id, f.id)}>
                      <button type="submit" className="hover:text-danger">
                        Удалить
                      </button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {event.attachments.length === 0 && <p className="text-sm text-muted">Файлов пока нет.</p>}

      {canPost && (
        <form action={addAttachmentAction.bind(null, event.id)} className="rounded border border-line bg-surface p-4">
          <h2 className="mb-2 text-sm font-bold text-ink">Добавить ссылку</h2>
          <div className="flex flex-wrap gap-2">
            <select name="kind" className="rounded border border-line bg-bg px-2 py-1.5 text-sm">
              {Object.entries(ATTACHMENT_KIND_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="Название" className="flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm" />
            <input name="url" type="url" required pattern="https://.*" title="Ссылка должна начинаться с https://" placeholder="https://drive.google.com/..." className="flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm" />
            <button type="submit" className="rounded bg-gold px-3 py-1.5 text-sm font-bold text-bg hover:bg-gold/90">
              Добавить
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
