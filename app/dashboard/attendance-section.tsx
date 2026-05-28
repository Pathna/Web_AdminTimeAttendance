"use client";

import { useEffect, useState } from "react";
import type { AttendanceRecord } from "@/lib/attendance";
import AttendanceTable from "./attendance-table";

type AttendanceSectionProps = {
  records: AttendanceRecord[];
  error: string;
  isLoading: boolean;
};

export default function AttendanceSection({
  records,
  error,
  isLoading,
}: AttendanceSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  function closeModal() {
    setIsModalOpen(false);
    setSearchTerm("");
  }

  return (
    <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">รายการเช็คอินล่าสุด</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              อัปเดตสถานะประจำวัน
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="h-9 rounded-lg bg-[var(--dashboard-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--dashboard-accent-hover)]"
          >
            ดูทั้งหมด
          </button>
        </div>
      </div>

      <AttendanceTable
        error={error}
        isLoading={isLoading}
        records={records}
        searchTerm=""
        showAll={false}
      />

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-modal-title"
        >
          <div className="flex h-[82vh] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-xl">
            <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="attendance-modal-title" className="text-lg font-semibold">
                    รายการเช็คอินทั้งหมด
                  </h2>
                  <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                    ค้นหาและตรวจสอบข้อมูลเช็คอินตามชื่อพนักงาน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex size-9 items-center justify-center rounded-lg border border-[var(--dashboard-border)] text-sm font-semibold text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-muted)]"
                  aria-label="ปิด"
                >
                  X
                </button>
              </div>

              <div className="mt-4">
                <label htmlFor="attendance-search" className="sr-only">
                  ค้นหาชื่อพนักงาน
                </label>
                <input
                  id="attendance-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="ค้นหาชื่อพนักงาน"
                  className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 md:max-w-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <AttendanceTable
                error={error}
                isLoading={isLoading}
                records={records}
                searchTerm={searchTerm}
                showAll
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
