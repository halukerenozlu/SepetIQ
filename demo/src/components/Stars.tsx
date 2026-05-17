interface StarsProps {
  value: number;
  label?: string;
}

export function Stars({ value, label }: StarsProps) {
  const rounded = Math.round(value);

  return (
    <span
      aria-label={label ?? `${value.toFixed(1)} yıldız`}
      className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < rounded ? "★" : "☆"}
        </span>
      ))}
      <span className="ml-1 text-zinc-600">{value.toFixed(1)}</span>
    </span>
  );
}
