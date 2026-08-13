export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
