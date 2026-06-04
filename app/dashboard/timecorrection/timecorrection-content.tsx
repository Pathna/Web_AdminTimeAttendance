"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, getTimeCorrection } from "@/lib/api";
import { getVisiblePageNumbers } from "@/lib/pagination";
import type {
  TimeCorrectionRecord,
  TimeCorrectionResponse,
} from "@/lib/timecorrection";

const PAGE_SIZE = 5;
type StatusFilter = "pending" | "approve" | "reject";

const STATUS_CARDS: Array<{
  key: StatusFilter;
  label: string;
  description: string;
  className: string;
}> = [
  {
    key: "pending",
    label: "รออนุมัติ",
    description: "จำนวนรายการแก้ไขเวลาที่ยังรออนุมัติ",
    className: "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-100",
  },
  {
    key: "approve",
    label: "อนุมัติแล้ว",
    description: "จำนวนรายการแก้ไขเวลาที่อนุมัติแล้ว",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100",
  },
  {
    key: "reject",
    label: "ไม่อนุมัติ",
    description: "จำนวนรายการแก้ไขเวลาที่ไม่อนุมัติ",
    className: "border-red-200 bg-red-50 text-red-700 shadow-red-100",
  },
];

function getStoredToken() {
  return sessionStorage.getItem("authToken") ?? localStorage.getItem("authToken");
}

function getTimeCorrections(data: unknown): TimeCorrectionRecord[] {
  if (Array.isArray(data)) {
    return data as TimeCorrectionRecord[];
  }

  if (typeof data === "object" && data !== null && "data" in data) {
    const response = data as Partial<TimeCorrectionResponse>;

    if (Array.isArray(response.data)) {
      return response.data;
    }
  }

  return [];
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10) || "-";
  }

  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const trimmedValue = value.trim();
  const timeMatch = trimmedValue.match(/(\d{2}:\d{2})(?::\d{2})?/);

  if (timeMatch) {
    return timeMatch[1];
  }

  const date = new Date(trimmedValue.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return trimmedValue || "-";
  }

  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toSearchText(value: string | number | null | undefined) {
  return value == null ? "" : String(value);
}

function getSortTime(record: TimeCorrectionRecord) {
  if (!record.request_date) {
    return 0;
  }

  const date = new Date(record.request_date.replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getDateStart(value: string | null | undefined) {
  if (!value) {
    return Number.NaN;
  }

  const dateText = value.trim().slice(0, 10);
  const dateParts = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateParts) {
    const [, year, month, day] = dateParts;

    return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  }

  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return Number.NaN;
  }

  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

function getDateRangeTime(value: string, rangeEnd = false) {
  if (!value) {
    return rangeEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }

  const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!dateParts) {
    return rangeEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }

  const [, year, month, day] = dateParts;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (rangeEnd) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

function normalizeStatus(status: string | null | undefined) {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  if (
    normalizedStatus.includes("approve") ||
    normalizedStatus.includes("อนุมัติ")
  ) {
    return normalizedStatus.includes("reject") ||
      normalizedStatus.includes("ไม่") ||
      normalizedStatus.includes("ปฏิเสธ")
      ? "reject"
      : "approve";
  }

  if (
    normalizedStatus.includes("reject") ||
    normalizedStatus.includes("cancel") ||
    normalizedStatus.includes("ไม่") ||
    normalizedStatus.includes("ปฏิเสธ")
  ) {
    return "reject";
  }

  if (
    normalizedStatus.includes("pending") ||
    normalizedStatus.includes("wait") ||
    normalizedStatus.includes("รอ")
  ) {
    return "pending";
  }

  return "other";
}

function getStatusClass(status: string | null | undefined) {
  const normalizedStatus = normalizeStatus(status);

  if (normalizedStatus === "approve") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (normalizedStatus === "reject") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function isActionKey(key: string) {
  return key === "Enter" || key === " ";
}

export default function TimeCorrectionContent() {
  const [timeCorrections, setTimeCorrections] = useState<TimeCorrectionRecord[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<StatusFilter | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTimeCorrection, setSelectedTimeCorrection] =
    useState<TimeCorrectionRecord | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadTimeCorrections() {
      try {
        const token = getStoredToken();
        const data = await getTimeCorrection(token ? { token } : undefined);

        if (isMounted) {
          setTimeCorrections(getTimeCorrections(data));
        }
      } catch (caughtError) {
        if (isMounted) {
          const message =
            caughtError instanceof ApiError
              ? caughtError.message
              : "โหลดข้อมูลการแก้ไขเวลาไม่สำเร็จ";

          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTimeCorrections();

    return () => {
      isMounted = false;
    };
  }, []);

  const sortedTimeCorrections = useMemo(
    () => [...timeCorrections].sort((a, b) => getSortTime(b) - getSortTime(a)),
    [timeCorrections],
  );
  const searchFilteredTimeCorrections = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const effectiveDateFrom = dateFrom || dateTo;
    const effectiveDateTo = dateTo || dateFrom;
    const startTime = getDateRangeTime(effectiveDateFrom);
    const endTime = getDateRangeTime(effectiveDateTo, true);

    return sortedTimeCorrections.filter((record) => {
      const requestTime = getDateStart(record.request_date);
      const isInDateRange =
        Number.isNaN(requestTime) || (startTime <= requestTime && requestTime <= endTime);

      if (!isInDateRange) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      return [
        record.name,
        record.employee_Id,
        record.time_correction_name,
        record.status_name,
        record.remark,
        record.remark_status,
        record.emp_approve,
        formatDate(record.request_date),
        formatTime(record.work_time_in),
        formatTime(record.work_time_out),
      ].some((value) =>
        toSearchText(value).toLowerCase().includes(normalizedSearchTerm),
      );
    });
  }, [dateFrom, dateTo, searchTerm, sortedTimeCorrections]);
  const statusCounts = useMemo(
    () =>
      searchFilteredTimeCorrections.reduce<Record<string, number>>((counts, record) => {
        const status = normalizeStatus(record.status_name);

        counts[status] = (counts[status] ?? 0) + 1;

        return counts;
      }, {}),
    [searchFilteredTimeCorrections],
  );
  const filteredTimeCorrections = useMemo(
    () =>
      activeStatusFilter
        ? searchFilteredTimeCorrections.filter(
            (record) => normalizeStatus(record.status_name) === activeStatusFilter,
          )
        : searchFilteredTimeCorrections,
    [activeStatusFilter, searchFilteredTimeCorrections],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTimeCorrections.length / PAGE_SIZE),
  );
  const activePage = Math.min(currentPage, totalPages);
  const displayTimeCorrections = filteredTimeCorrections.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const pageNumbers = getVisiblePageNumbers(activePage, totalPages);

  return (
    <section className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">รายการแก้ไขเวลาทั้งหมด</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              พบข้อมูล {filteredTimeCorrections.length} รายการ
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
            <label htmlFor="time-correction-search" className="sr-only">
              ค้นหารายการแก้ไขเวลา
            </label>
            <input
              id="time-correction-search"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหาชื่อ"
              className="h-9 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 sm:w-80"
            />
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:w-auto">
              <div>
                <label
                  htmlFor="time-correction-date-from"
                  className="sr-only"
                >
                  วันที่เริ่มต้น
                </label>
                <input
                  id="time-correction-date-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>
              <div>
                <label htmlFor="time-correction-date-to" className="sr-only">
                  วันที่สิ้นสุด
                </label>
                <input
                  id="time-correction-date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setCurrentPage(1);
                }}
                disabled={!dateFrom && !dateTo}
                className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] transition hover:bg-[var(--dashboard-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ล้างช่วง
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-[var(--dashboard-border)] px-5 py-4 md:grid-cols-3">
        {STATUS_CARDS.map((status) => (
          <button
            key={status.key}
            type="button"
            aria-pressed={activeStatusFilter === status.key}
            onClick={() => {
              setActiveStatusFilter((currentStatus) =>
                currentStatus === status.key ? null : status.key,
              );
              setCurrentPage(1);
            }}
            className={`rounded-lg border px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-500/20 ${
              activeStatusFilter === status.key
                ? "ring-2 ring-[var(--dashboard-accent)]"
                : ""
            } ${status.className}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Status</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--dashboard-text)]">
                  {status.label}
                </h3>
              </div>
              <p className="text-3xl font-semibold text-[var(--dashboard-text)]">
                {statusCounts[status.key] ?? 0}
              </p>
            </div>
            <p className="mt-3 text-sm">{status.description}</p>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          กำลังโหลดรายการแก้ไขเวลา...
        </div>
      ) : null}

      {error ? <div className="px-5 py-8 text-sm text-red-600">{error}</div> : null}

      {!isLoading && !error && filteredTimeCorrections.length === 0 ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          ไม่พบรายการแก้ไขเวลา
        </div>
      ) : null}

      {!isLoading && !error && filteredTimeCorrections.length > 0 ? (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">พนักงาน</th>
                  {/* <th className="px-5 py-3 font-medium">รหัส</th> */}
                  <th className="px-5 py-3 font-medium">ประเภทแก้ไขเวลา</th>
                  <th className="px-5 py-3 font-medium">วันที่ขอ</th>
                  <th className="px-5 py-3 font-medium">เวลาเข้า</th>
                  <th className="px-5 py-3 font-medium">เวลาออก</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                  <th className="px-5 py-3 font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dashboard-border)]">
                {displayTimeCorrections.map((record) => (
                  <tr
                    key={record.id}
                    tabIndex={0}
                    className="cursor-pointer transition hover:bg-[var(--dashboard-surface-muted)]"
                    onClick={() => setSelectedTimeCorrection(record)}
                    onKeyDown={(event) => {
                      if (isActionKey(event.key)) {
                        event.preventDefault();
                        setSelectedTimeCorrection(record);
                      }
                    }}
                  >
                    <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                      {record.name || "-"}
                    </td>
                    {/* <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {record.employee_Id || "-"}
                    </td> */}
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {record.time_correction_name || "-"}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDate(record.request_date)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatTime(record.work_time_in)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatTime(record.work_time_out)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClass(
                          record.status_name,
                        )}`}
                      >
                        {record.status_name || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTimeCorrection(record);
                        }}
                        className="h-9 rounded-lg border border-[var(--dashboard-accent)] px-3 text-xs font-semibold text-[var(--dashboard-accent)] transition hover:bg-[var(--dashboard-accent)] hover:text-white focus:outline-none focus:ring-4 focus:ring-cyan-500/20"
                      >
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 border-t border-[var(--dashboard-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--dashboard-muted)]">
                หน้า {activePage} จาก {totalPages}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={activePage === 1}
                  className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-medium ${
                      activePage === page
                        ? "border-[var(--dashboard-accent)] bg-cyan-50 text-[var(--dashboard-accent)]"
                        : "border-[var(--dashboard-border)] text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={activePage === totalPages}
                  className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedTimeCorrection ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-correction-detail-title"
        >
          <div className="w-full max-w-2xl rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--dashboard-border)] px-5 py-4">
              <div>
                <h3
                  id="time-correction-detail-title"
                  className="text-base font-semibold"
                >
                  รายละเอียดการแก้ไขเวลา
                </h3>
                <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                  {selectedTimeCorrection.name} ·{" "}
                  {selectedTimeCorrection.time_correction_name || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTimeCorrection(null)}
                className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
              >
                X
              </button>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              {[
                ["พนักงาน", selectedTimeCorrection.name || "-"],
                ["รหัส", String(selectedTimeCorrection.employee_Id || "-")],
                [
                  "ประเภทแก้ไขเวลา",
                  selectedTimeCorrection.time_correction_name || "-",
                ],
                ["วันที่ขอ", formatDate(selectedTimeCorrection.request_date)],
                ["เวลาเข้า", formatTime(selectedTimeCorrection.work_time_in)],
                ["เวลาออก", formatTime(selectedTimeCorrection.work_time_out)],
                ["สถานะ", selectedTimeCorrection.status_name || "-"],
                ["ผู้อนุมัติ", selectedTimeCorrection.emp_approve || "-"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--dashboard-text)]">
                    {value}
                  </p>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                  Location ID
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--dashboard-text)]">
                  {selectedTimeCorrection.attendance_work_location_id || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                  Department ID
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--dashboard-text)]">
                  {selectedTimeCorrection.attendance_department_id || "-"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                  เหตุผล
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--dashboard-text)]">
                  {selectedTimeCorrection.remark || "-"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                  หมายเหตุสถานะ
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--dashboard-text)]">
                  {selectedTimeCorrection.remark_status || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
