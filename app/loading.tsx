export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton h-4 w-80" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-48" />
        ))}
      </div>
    </div>
  );
}
