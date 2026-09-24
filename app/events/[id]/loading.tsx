export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка">
      <div className="skeleton h-32" />
      <div className="skeleton h-10 w-96" />
      <div className="skeleton h-24" />
      <div className="skeleton h-24" />
    </div>
  );
}
