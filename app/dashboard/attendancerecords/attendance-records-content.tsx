"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceRecord } from "@/lib/attendance";
import {
  getAttendanceErrorMessage,
  loadAttendanceRecords,
} from "../attendance-data";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusClass(status: string) {
  if (status.toLowerCase() === "approve") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status.toLowerCase() === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function AttendanceRecordsContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      try {
        const attendanceRecords = await loadAttendanceRecords();

        if (isMounted) {
          setRecords(attendanceRecords);
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

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const sortedRecords = [...records].sort(
      (a, b) =>
        new Date(b.check_in_time.replace(" ", "T")).getTime() -
        new Date(a.check_in_time.replace(" ", "T")).getTime(),
    );

    if (!normalizedSearchTerm) {
      return sortedRecords;
    }

    return sortedRecords.filter((record) =>
      [
        record.employee_name,
        record.department_name ?? "",
        record.work_location ?? "",
        record.status,
      ].some((value) => value.toLowerCase().includes(normalizedSearchTerm)),
    );
  }, [records, searchTerm]);

  return (
    <section className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">เวลาเข้าออกทั้งหมด</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              พบข้อมูล {filteredRecords.length} รายการ
            </p>
          </div>
          <label htmlFor="attendance-record-search" className="sr-only">
            ค้นหารายการเวลาเข้าออก
          </label>
          <input
            id="attendance-record-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาชื่อ แผนก สถานที่ หรือสถานะ"
            className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 md:max-w-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          กำลังโหลดรายการเวลาเข้าออก...
        </div>
      ) : null}

      {error ? <div className="px-5 py-8 text-sm text-red-600">{error}</div> : null}

      {!isLoading && !error && filteredRecords.length === 0 ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          ไม่พบรายการเวลาเข้าออก
        </div>
      ) : null}

      {!isLoading && !error && filteredRecords.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">พนักงาน</th>
                <th className="px-5 py-3 font-medium">แผนก</th>
                <th className="px-5 py-3 font-medium">เช็คอิน</th>
                <th className="px-5 py-3 font-medium">เช็คเอาต์</th>
                <th className="px-5 py-3 font-medium">สถานะ</th>
                <th className="px-5 py-3 font-medium">สถานที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dashboard-border)]">
              {filteredRecords.map((record) => (
                <tr key={`${record.attendance_id}-${record.employee_id}`}>
                  <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                    {record.employee_name}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {record.department_name ?? "-"}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {formatDateTime(record.check_in_time)}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {formatDateTime(record.check_out_time)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClass(
                        record.status,
                      )}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {record.work_location ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
