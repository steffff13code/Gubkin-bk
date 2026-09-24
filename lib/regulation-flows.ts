import type { DepartmentCode } from "@prisma/client";

// Схемы регламента — те же, что на слайдах «Регламент мероприятий»: шаги слева направо,
// ключевой шаг выделен. Показываются на странице регламента и в личном кабинете отдела.

export type FlowStep = { when: string; what: string; key?: boolean; who?: string };
export type Flow = { slug: string; title: string; rows: { label?: string; steps: FlowStep[] }[]; note?: string; footer: string };

export const FLOWS: Record<string, Flow> = {
  "how-event-goes": {
    slug: "how-event-goes",
    title: "Как идёт мероприятие",
    rows: [
      {
        steps: [
          { when: "за 1,5 месяца", what: "Пишем гостю", who: "Гости" },
          { when: "за месяц", what: "Проверка ЦБ", who: "ЦБ" },
          { when: "за 3 недели", what: "Дата зафиксирована", who: "Гости", key: true },
          { when: "за 2 недели", what: "Посты и регистрация", who: "Пиар" },
          { when: "день Д", what: "Мероприятие", who: "Все", key: true }
        ]
      }
    ],
    note: "После фиксации даты параллельно запускаем: аудитория · пиар · съёмка",
    footer: "Проверка в ЦБ занимает месяц — гостей ведём на 1,5–2 месяца вперёд"
  },
  guests: {
    slug: "guests",
    title: "Гости",
    rows: [
      {
        steps: [
          { when: "за 1,5 месяца", what: "Выбрать гостя" },
          { when: "за 1,5 месяца", what: "Согласовать окно из 10 дней" },
          { when: "7 дней", what: "Ждём ЦБ" },
          { when: "за 3 недели", what: "Фиксируем дату", key: true },
          { when: "за 10 дней", what: "Согласовать пост с гостем" }
        ]
      }
    ],
    footer: "Время мероприятия: 15:45, 17:15 или 17:20"
  },
  security: {
    slug: "security",
    title: "ЦБ",
    rows: [
      {
        label: "Гость",
        steps: [
          { when: "за месяц", what: "Заявка за месяц" },
          { when: "+7 дней", what: "Ответ за 7 дней" },
          { when: "в тот же день", what: "Результат в чат", key: true }
        ]
      },
      {
        label: "Участники",
        steps: [
          { when: "за 6 дней", what: "Список за 6 дней" },
          { when: "за 3 дня", what: "Лично за 3 дня" },
          { when: "за 3 дня", what: "Пропуска готовы", key: true }
        ]
      }
    ],
    footer: "В контуре всегда двое, не один"
  },
  pr: {
    slug: "pr",
    title: "Пиар",
    rows: [
      {
        steps: [
          { when: "за 2 недели", what: "Пост №1, регистрация" },
          { when: "за 10 дней", what: "Афиша согласована с гостем", key: true },
          { when: "за неделю", what: "Пост №2, афиша" },
          { when: "за 6 дней", what: "Регистрация закрыта" },
          { when: "за 3 дня", what: "Пост №3" }
        ]
      }
    ],
    footer: "Реклама даёт 20–25% зала, остальное — личные приглашения"
  },
  venue: {
    slug: "venue",
    title: "Аудитория",
    rows: [
      {
        steps: [
          { when: "заранее", what: "Список 15–20 аудиторий" },
          { when: "за 3 недели", what: "Выбор в чате", key: true },
          { when: "за 3 недели", what: "Служебка" },
          { when: "за 2,5 недели", what: "Подтверждение в чат" }
        ]
      }
    ],
    footer: "Аудиторию выбираем вместе, не единолично"
  },
  content: {
    slug: "content",
    title: "Контент",
    rows: [
      {
        steps: [
          { when: "после ответа ЦБ", what: "Анонсный ролик" },
          { when: "день Д", what: "Съёмка мероприятия" },
          { when: "финал", what: "Общее фото", key: true },
          { when: "сразу после", what: "Интервью с гостем" }
        ]
      }
    ],
    footer: "Материал на монтаж — в течение суток"
  },
  stage: {
    slug: "stage",
    title: "Площадка",
    rows: [
      {
        steps: [
          { when: "−2 часа", what: "Техника и презентация" },
          { when: "−40 минут", what: "Волонтёры на посту" },
          { when: "всё мероприятие", what: "Порядок в зале" },
          { when: "после", what: "Вернуть технику" }
        ]
      }
    ],
    footer: "Гостя встречает один человек"
  },
  "event-day": {
    slug: "event-day",
    title: "День мероприятия",
    rows: [
      {
        steps: [
          { when: "−20 минут", what: "Встреча гостя" },
          { when: "0:00", what: "Выступление" },
          { when: "5–7 минут", what: "Вопросы" },
          { when: "7 минут", what: "Питч-сессия" },
          { when: "финал", what: "Общее фото", key: true },
          { when: "сразу после", what: "Гостя уводят" }
        ]
      }
    ],
    footer: "Сначала фото, потом уводим гостя"
  }
};

/** Схемы, которые человек видит в кабинете: своего отдела (Пиар — ещё и аудитория). */
export const DEPARTMENT_FLOWS: Record<DepartmentCode, string[]> = {
  GUESTS: ["guests"],
  SECURITY: ["security"],
  PR: ["pr", "venue"],
  CONTENT: ["content"],
  STAGE: ["stage"],
  INTENSIVES: []
};
