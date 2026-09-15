export default function LoginPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const username = process.env.TELEGRAM_BOT_USERNAME;
  const appUrl = process.env.APP_URL || "";

  return (
    <div className="mx-auto max-w-sm rounded border border-line bg-surface p-6 text-center">
      <h1 className="text-lg font-bold">Вход через Telegram</h1>
      <p className="mt-2 text-sm text-muted">
        Нажмите на кнопку и подтвердите вход в Telegram. Паролей и регистрации нет.
      </p>
      {searchParams.error && (
        <p className="mt-3 rounded border border-danger/30 bg-danger/5 p-2 text-sm text-danger">
          Не удалось подтвердить вход. Попробуйте ещё раз.
        </p>
      )}
      {username ? (
        <div className="mt-5 flex justify-center">
          <script
            async
            src="https://telegram.org/js/telegram-widget.js?22"
            data-telegram-login={username}
            data-size="large"
            data-radius="6"
            data-auth-url={`${appUrl}/api/auth/telegram`}
            data-request-access="write"
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-danger">
          Бот не настроен: заполните TELEGRAM_BOT_USERNAME в .env.
        </p>
      )}
    </div>
  );
}
