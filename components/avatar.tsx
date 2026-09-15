const PALETTE = ["#2E7BFF", "#E8B86D", "#4ADE80", "#FF6B6B", "#B98CFF", "#3FC1C9"];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-bg"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: colorFor(name)
      }}
    >
      {initials(name)}
    </span>
  );
}
