"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceRecord } from "@/lib/attendance";
import {
  getAttendanceErrorMessage,
  loadAttendanceRecords,
} from "./attendance-data";
import AttendanceSection from "./attendance-section";

const ATTENDANCE_REFRESH_INTERVAL_MS = 5000;

const departmentStats = [
  { name: "บัญชี", checkedIn: 18, total: 20 },
  { name: "คลังสินค้า", checkedIn: 31, total: 42 },
  { name: "บุคคล", checkedIn: 9, total: 10 },
  { name: "ไอที", checkedIn: 12, total: 15 },
  { name: "ขาย", checkedIn: 26, total: 41 },
];

function countUniqueEmployees(records: AttendanceRecord[]) {
  return new Set(records.map((record) => record.employee_id)).size;
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).format(new Date());
}

function isTodayRecord(record: AttendanceRecord) {
  return record.check_in_time.slice(0, 10) === getTodayDateKey();
}

function isApprovedStatus(status: string) {
  return status.toLowerCase() === "approve";
}

function isPendingStatus(status: string) {
  return status.toLowerCase() === "pending";
}

function getSummaryCardClass(label: string) {
  if (label === "เช็คอินวันนี้") {
    return "border-sky-200 bg-sky-50 text-sky-950";
  }
  if (label === "มาสาย") {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  if (label === "เช็คอินและอนุมัติแล้ว") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
  if (label === "ยังไม่ได้อนุมัติจากหัวหน้า") {
    return "border-purple-200 bg-purple-50 text-purple-950";
  }

  return "border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)]";
}

function getSummaryTextClass(label: string) {
  if (label === "เช็คอินวันนี้") {
    return "text-sky-700";
  }
  if (label === "มาสาย") {
    return "text-amber-700";
  }
  if (label === "เช็คอินและอนุมัติแล้ว") {
    return "text-[#047857]";
  }
  if (label === "ยังไม่ได้อนุมัติจากหัวหน้า") {
    return "text-purple-700";
  }

  return "text-[var(--dashboard-muted)]";
}

export default function DashboardContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAttendance(showLoading = false) {
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const attendanceRecords = await loadAttendanceRecords();

        if (isMounted) {
          setRecords(attendanceRecords);
          setError("");
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getAttendanceErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAttendance(true);
    const intervalId = window.setInterval(
      () => loadAttendance(),
      ATTENDANCE_REFRESH_INTERVAL_MS,
    );

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const summaryCards = useMemo(() => {
    const todayRecords = records.filter(isTodayRecord);
    const checkedInToday = countUniqueEmployees(todayRecords);
    const approvedToday = countUniqueEmployees(
      todayRecords.filter((record) => isApprovedStatus(record.status)),
    );
    const lateToday = countUniqueEmployees(
      todayRecords.filter((record) => record.late_time && record.late_time > 0),
    );
    const pendingApprovalToday = countUniqueEmployees(
      todayRecords.filter((record) => isPendingStatus(record.status)),
    );

    return [
      {
        label: "เช็คอินวันนี้",
        value: isLoading ? "..." : String(checkedInToday),
        detail: "จำนวนเช็คอินวันนี้ทั้งหมด",
      },
      {
        label: "เช็คอินและอนุมัติแล้ว",
        value: isLoading ? "..." : String(approvedToday),
        detail: "จำนวนที่หัวหน้าอนุมัติแล้ววันนี้",
      },
      {
        label: "มาสาย",
        value: isLoading ? "..." : String(lateToday),
        detail:
          lateToday > 0 ? "มีพนักงานมาสายวันนี้" : "ยังไม่มีพนักงานมาสายวันนี้",
      },
      {
        label: "ยังไม่ได้อนุมัติจากหัวหน้า",
        value: isLoading ? "..." : String(pendingApprovalToday),
        detail: "จำนวนรายการวันนี้ที่รอการอนุมัติ",
      },
    ];
  }, [isLoading, records]);

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-5 shadow-sm ${getSummaryCardClass(
              card.label,
            )}`}
          >
            <p className={`text-sm font-medium ${getSummaryTextClass(card.label)}`}>
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
            <p className={`mt-2 text-sm ${getSummaryTextClass(card.label)}`}>
              {card.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <AttendanceSection
          error={error}
          isLoading={isLoading}
          records={records}
        />

        <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-sm">
          <h2 className="text-base font-semibold">สถานะแยกตามแผนก</h2>
          <div className="mt-5 space-y-5">
            {departmentStats.map((item) => {
              const percent = Math.round((item.checkedIn / item.total) * 100);

              return (
                <div key={item.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--dashboard-text)]">
                      {item.name}
                    </span>
                    <span className="text-[var(--dashboard-muted)]">
                      {item.checkedIn}/{item.total}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--dashboard-surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--dashboard-accent)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
