import ThemeToggle from "../theme-toggle";

export default function SettingsPage() {
  return (
    <section className="max-w-3xl">
      <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">ธีม</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              เลือกรูปแบบสีของหน้า dashboard
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </section>
  );
}
