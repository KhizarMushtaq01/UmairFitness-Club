import { ChartSkeleton } from "@/components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="p-4 md:p-7">
      <ChartSkeleton />
    </div>
  );
}
