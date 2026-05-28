"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ThemeSync } from "./theme-toggle";

const navItems = [
  { label: "ภาพรวม", href: "/dashboard" },
  { label: "พนักงาน", href: "/dashboard/employees" },
  { label: "เวลาเข้าออก", href: "/dashboard/attendancerecords" },
  { label: "แผนที่การเข้างาน", href: "/dashboard/map" },
  { label: "ตั้งค่า", href: "/dashboard/settings" },
];

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/attendancerecords")) {
    return "Attendance Records";
  }

  if (pathname === "/dashboard/employees") {
    return "พนักงาน";
  }

  if (pathname === "/dashboard/map") {
    return "แผนที่การเข้างาน";
  }

  if (pathname === "/dashboard/settings") {
    return "ตั้งค่า";
  }

  return "Dashboard";
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[var(--dashboard-bg)] text-[var(--dashboard-text)]">
      <ThemeSync />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-5 py-6 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-[var(--dashboard-accent)] text-lg font-bold text-white">
              TA
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-accent)]">
                Admin
              </p>
              <p className="text-sm text-[var(--dashboard-muted)]">
                Time Attendance
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href !== "#" &&
                (pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href)));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex h-11 items-center rounded-lg px-3 text-sm font-medium ${
                    isActive
                      ? "bg-[var(--dashboard-accent)] text-white"
                      : "text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-muted)] hover:text-[var(--dashboard-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="border-b border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--dashboard-accent)]">
                  {new Date().toLocaleDateString("th-TH", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {getPageTitle(pathname)}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-10 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]">
                  ส่งออกรายงาน
                </button>
              </div>
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
