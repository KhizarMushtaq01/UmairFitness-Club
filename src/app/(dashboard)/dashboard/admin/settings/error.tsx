"use client";
import { ErrorState } from "@/components/shared/ErrorState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-4 md:p-7">
      <ErrorState onRetry={reset} />
    </div>
  );
}
