"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getEmployee } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/attendance";
import type { AllEmployee } from "@/lib/employee";
import {
  getAttendanceErrorMessage,
  loadAttendanceRecords,
} from "../../attendance-data";

function getStoredAuthUserId() {
  const rawValue =
    sessionStorage.getItem("authUserId") ?? localStorage.getItem("authUserId");
  const userId = Number(rawValue);

  return Number.isFinite(userId) ? userId : null;
}

function getStoredToken() {
  return sessionStorage.getItem("authToken") ?? localStorage.getItem("authToken");
}

function getEmployeeList(data: unknown): AllEmployee[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "employees" in data &&
    Array.isArray(data.employees)
  ) {
    return data.employees;
  }

  return [];
}

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

function formatDuration(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value} ชม.`;
}

function formatLateTime(value: number | null) {
  if (!value || value <= 0) {
    return "-";
  }

  return `${value} นาที`;
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
  const params = useParams<{ employeeId: string }>();
  const searchParams = useSearchParams();
  const employeeId = Number(params.employeeId);
  const employeeName = searchParams.get("name") ?? "พนักงาน";
  const employeeCode = searchParams.get("code") ?? "";
  const [authorizedEmployee, setAuthorizedEmployee] =
    useState<AllEmployee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadRecords() {
      try {
        const authUserId = getStoredAuthUserId();

        if (authUserId === null) {
          throw new Error("missing-auth-user-id");
        }

        const token = getStoredToken();
        const employeeData = await getEmployee(token ? { token } : undefined);
        const employee = getEmployeeList(employeeData).find(
          (item) =>
            item.id === employeeId && item.attendance_user_id === authUserId,
        );

        if (!employee) {
          throw new Error("unauthorized-employee-records");
        }

        const attendanceRecords = await loadAttendanceRecords();

        if (isMounted) {
          setAuthorizedEmployee(employee);
          setRecords(
            attendanceRecords.filter(
              (record) => record.employee_id === employee.id,
            ),
          );
        }
      } catch (caughtError) {
        if (isMounted) {
          if (
            caughtError instanceof Error &&
            caughtError.message === "unauthorized-employee-records"
          ) {
            setError("ไม่สามารถดูรายการของพนักงานคนนี้ได้");
          } else if (
            caughtError instanceof Error &&
            caughtError.message === "missing-auth-user-id"
          ) {
            setError("ไม่พบข้อมูลผู้ใช้ที่เข้าสู่ระบบ");
          } else {
            setError(
              caughtError instanceof ApiError
                ? caughtError.message
                : getAttendanceErrorMessage(caughtError),
            );
          }
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
  }, [employeeId]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.check_in_time.replace(" ", "T")).getTime() -
          new Date(a.check_in_time.replace(" ", "T")).getTime(),
      ),
    [records],
  );

  const lateCount = records.filter(
    (record) => record.late_time && record.late_time > 0,
  ).length;
  const pendingCount = records.filter(
    (record) => record.status.toLowerCase() === "pending",
  ).length;
  const displayEmployeeCode =
    (authorizedEmployee?.employee_code ?? employeeCode) || `ID ${employeeId}`;
  const displayEmployeeName = authorizedEmployee?.name ?? employeeName;

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--dashboard-accent)]">
              {displayEmployeeCode}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{displayEmployeeName}</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              รายการเช็คอินเฉพาะพนักงานคนนี้
            </p>
          </div>
          <Link
            href="/dashboard/employees"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] px-4 text-sm font-medium hover:bg-[var(--dashboard-surface-muted)]"
          >
            กลับหน้าพนักงาน
          </Link>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "รายการทั้งหมด", value: isLoading ? "..." : records.length },
          { label: "มาสาย", value: isLoading ? "..." : lateCount },
          { label: "รออนุมัติ", value: isLoading ? "..." : pendingCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-[var(--dashboard-muted)]">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
        <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
          <h2 className="text-base font-semibold">Attendance Records</h2>
          <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
            แสดงเฉพาะรายการของ {displayEmployeeName}
          </p>
        </div>

        {isLoading ? (
          <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
            กำลังโหลดรายการ...
          </div>
        ) : null}

        {error ? (
          <div className="px-5 py-8 text-sm text-red-600">{error}</div>
        ) : null}

        {!isLoading && !error && sortedRecords.length === 0 ? (
          <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
            ไม่พบรายการของพนักงานคนนี้
          </div>
        ) : null}

        {!isLoading && !error && sortedRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">เช็คอิน</th>
                  <th className="px-5 py-3 font-medium">เช็คเอาต์</th>
                  <th className="px-5 py-3 font-medium">ชั่วโมงทำงาน</th>
                  <th className="px-5 py-3 font-medium">มาสาย</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                  <th className="px-5 py-3 font-medium">สถานที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dashboard-border)]">
                {sortedRecords.map((record) => (
                  <tr key={`${record.attendance_id}-${record.check_in_time}`}>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDateTime(record.check_in_time)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDateTime(record.check_out_time)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDuration(record.worked_hours)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatLateTime(record.late_time)}
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
                      {record.work_location ?? record.check_in_location ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}
