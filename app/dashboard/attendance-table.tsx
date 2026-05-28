"use client";

import { useMemo } from "react";
import type { AttendanceRecord } from "@/lib/attendance";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    const dateText = value.slice(0, 10);
    const timeText = value.slice(11, 16);

    return [dateText, timeText].filter(Boolean).join(" ") || "-";
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

function getDisplayStatus(record: AttendanceRecord) {
  if (record.status === "Pending") {
    return "รออนุมัติ";
  }

  if (record.late_time && record.late_time > 0) {
    return "มาสาย";
  }

  if (record.status_approve_in_out === "Out") {
    return "เช็คเอาต์";
  }

  return "ตรงเวลา";
}

function getStatusClass(status: string) {
  if (status === "ตรงเวลา" || status === "เช็คเอาต์") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "มาสาย") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

type AttendanceTableProps = {
  records: AttendanceRecord[];
  error: string;
  isLoading: boolean;
  searchTerm: string;
  showAll: boolean;
};

export default function AttendanceTable({
  records,
  error,
  isLoading,
  searchTerm,
  showAll,
}: AttendanceTableProps) {
  const displayRecords = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const sortedRecords = [...records].sort(
      (a, b) =>
        new Date(b.check_in_time.replace(" ", "T")).getTime() -
        new Date(a.check_in_time.replace(" ", "T")).getTime(),
    );
    const filteredRecords = normalizedSearchTerm
      ? sortedRecords.filter((record) =>
          record.employee_name.toLowerCase().includes(normalizedSearchTerm),
        )
      : sortedRecords;

    return showAll ? filteredRecords : filteredRecords.slice(0, 10);
  }, [records, searchTerm, showAll]);

  if (isLoading) {
    return (
      <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
        กำลังโหลดข้อมูลเช็คอิน...
      </div>
    );
  }

  if (error) {
    return <div className="px-5 py-8 text-sm text-red-600">{error}</div>;
  }

  if (displayRecords.length === 0) {
    return (
      <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
        {searchTerm ? "ไม่พบรายชื่อที่ค้นหา" : "ยังไม่มีข้อมูลเช็คอิน"}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
          <tr>
            <th className="px-5 py-3 font-medium">ชื่อพนักงาน</th>
            <th className="px-5 py-3 font-medium">แผนก</th>
            <th className="px-5 py-3 font-medium">เวลา</th>
            <th className="px-5 py-3 font-medium">สถานะ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--dashboard-border)]">
          {displayRecords.map((record) => {
            const status = getDisplayStatus(record);

            return (
              <tr key={`${record.attendance_id}-${record.status_approve_in_out}`}>
                <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                  {record.employee_name}
                </td>
                <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                  {record.department_name ?? "-"}
                </td>
                <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                  {formatDateTime(record.check_in_time)}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClass(
                      status,
                    )}`}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
