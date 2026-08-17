export function MemberSearchForm({ q }: { q: string }) {
  return (
    <form method="GET" className="flex flex-col sm:flex-row gap-3 w-full sm:max-w-[560px]">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search name or email"
        aria-label="Search members by name or email"
        className="flex-1 border border-[var(--line2)] bg-transparent p-3 min-h-[44px] text-[var(--txt)]"
      />
      <button
        type="submit"
        className="bg-[var(--red)] text-white px-6 py-3 min-h-[44px] font-bold uppercase tracking-widest text-xs"
      >
        Search
      </button>
    </form>
  );
}
