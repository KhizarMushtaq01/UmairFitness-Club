function Shimmer({ className }: { className: string }) {
  return (
    <div
      className={`${className} bg-[linear-gradient(90deg,var(--skel)_25%,var(--skel2)_50%,var(--skel)_75%)] bg-[length:200%_100%] animate-[fcShimmer_1.4s_linear_infinite]`}
    />
  );
}

export function StatRowSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((k) => (
        <Shimmer key={k} className="h-[110px]" />
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return <Shimmer className="h-[320px]" />;
}

export function TableSkeleton() {
  return <Shimmer className="h-[220px]" />;
}
