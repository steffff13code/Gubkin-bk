import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { RIGHT_ERRORS } from "@/lib/roles";
import { createEventAction } from "@/lib/actions/event-actions";
import { SpeakerForm } from "@/components/events/speaker-form";

export default async function NewEventPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/events/new");

  if (!userCan(user, "CREATE_EVENT")) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        {RIGHT_ERRORS.CREATE_EVENT}{" "}
        <Link href="/" className="text-gold hover:underline">
          К мероприятиям
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/" className="text-sm text-muted hover:text-gold">
        ← Мероприятия
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-ink">Новое мероприятие</h1>
      <p className="mb-4 text-sm text-muted">
        Спикер одобрил окно дат — заполните карточку. Если всё заполнено, мероприятие сразу уйдёт на подбор дат:
        Администратор и Пиар получат уведомление. Не всё известно — сохраните черновик и допишите позже.
      </p>
      {searchParams.error && (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          {searchParams.error}
        </p>
      )}
      <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <SpeakerForm action={createEventAction} submitLabel="Сохранить карточку" />
      </div>
    </div>
  );
}
