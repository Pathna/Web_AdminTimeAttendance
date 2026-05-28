"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getEmployee } from "@/lib/api";
import type { AllEmployee } from "@/lib/employee";

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

function getStatusClass(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function EmployeesContent() {
  const [employees, setEmployees] = useState<AllEmployee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        const token = getStoredToken();
        const data = await getEmployee(token ? { token } : undefined);

        if (isMounted) {
          setEmployees(getEmployeeList(data));
        }
      } catch (caughtError) {
        if (isMounted) {
          const message =
            caughtError instanceof ApiError
              ? caughtError.message
              : "โหลดข้อมูลพนักงานไม่สำเร็จ";

          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.name,
        employee.employee_code ?? "",
        employee.email ?? "",
        employee.mobile_phone ?? "",
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearchTerm)),
    );
  }, [employees, searchTerm]);

  return (
    <section className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">รายชื่อพนักงาน</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              พบข้อมูล {filteredEmployees.length} รายการ
            </p>
          </div>
          <label className="sr-only" htmlFor="employee-search">
            ค้นหาพนักงาน
          </label>
          <input
            id="employee-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาชื่อ รหัส อีเมล หรือเบอร์โทร"
            className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 md:max-w-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          กำลังโหลดข้อมูลพนักงาน...
        </div>
      ) : null}

      {error ? <div className="px-5 py-8 text-sm text-red-600">{error}</div> : null}

      {!isLoading && !error && filteredEmployees.length === 0 ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          ไม่พบข้อมูลพนักงาน
        </div>
      ) : null}

      {!isLoading && !error && filteredEmployees.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">รหัส</th>
                <th className="px-5 py-3 font-medium">ชื่อพนักงาน</th>
                <th className="px-5 py-3 font-medium">อีเมล</th>
                <th className="px-5 py-3 font-medium">เบอร์โทร</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">สถานะ</th>
                <th className="px-5 py-3 font-medium">รายการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dashboard-border)]">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {employee.employee_code || "-"}
                  </td>
                  <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                    {employee.name}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {employee.email || "-"}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {employee.mobile_phone || "-"}
                  </td>
                  <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                    {employee.attendance_company_id}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClass(
                        Boolean(employee.active_flag),
                      )}`}
                    >
                      {employee.active_flag ? "ใช้งาน" : "ปิดใช้งาน"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/attendancerecords/${
                        employee.id
                      }?name=${encodeURIComponent(employee.name)}&code=${encodeURIComponent(
                        employee.employee_code ?? "",
                      )}`}
                      className="inline-flex h-9 items-center rounded-lg border border-[var(--dashboard-border)] px-3 text-xs font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
                    >
                      ดูรายการ
                    </Link>
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
