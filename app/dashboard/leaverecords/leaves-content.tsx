"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, getLeave } from "@/lib/api";
import type { Leave, LeaveResponse } from "@/lib/leave";

const PAGE_SIZE = 5;
const MODAL_PAGE_SIZE = 5;
const LEAVE_TYPE_LABELS: Record<string, string> = {
  L001: "ลาพักร้อน",
  LOO1: "ลาพักร้อน",
  L002: "ลาป่วย",
  L003: "ลากิจ",
};
const LEAVE_TYPE_CODES_BY_NAME: Record<string, string> = {
  ลาพักร้อน: "L001",
  ลาป่วย: "L002",
  "ลาป่วย (ไม่มีใบรับรองแพทย์)": "L002",
  "ลาป่วย (มีใบรับรองแพทย์)": "L002",
  ลากิจ: "L003",
  ลากิจล่วงหน้า: "L003",
};
const LEAVE_TYPE_CARDS = [
  {
    code: "L001",
    label: "ลาพักร้อน",
    description: "จำนวนรายการลาพักร้อนวันนี้",
    className: "border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100",
  },
  {
    code: "L002",
    label: "ลาป่วย",
    description: "จำนวนรายการลาป่วยวันนี้",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-100",
  },
  {
    code: "L003",
    label: "ลากิจ",
    description: "จำนวนรายการลากิจวันนี้",
    className: "border-amber-200 bg-amber-50 text-amber-700 shadow-amber-100",
  },
];

function getStoredToken() {
  return sessionStorage.getItem("authToken") ?? localStorage.getItem("authToken");
}

function getLeaveList(data: unknown): Leave[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (typeof data === "object" && data !== null && "status" in data) {
    const response = data as Partial<LeaveResponse>;

    if (Array.isArray(response.status)) {
      return response.status;
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

function getDateStart(value: string) {
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

function isLeaveActiveToday(leave: Leave) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTime = today.getTime();
  const startTime = getDateStart(leave.start_date);
  const endTime = getDateStart(leave.end_date || leave.start_date);

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return false;
  }

  return startTime <= todayTime && todayTime <= endTime;
}

function getLeaveTypeLabel(leaveTypeCode: string) {
  const normalizedCode = normalizeLeaveTypeCode(leaveTypeCode);

  return LEAVE_TYPE_LABELS[normalizedCode] ?? leaveTypeCode;
}

function normalizeLeaveTypeCode(leaveTypeCode: string) {
  const trimmedLeaveType = leaveTypeCode.trim();
  const normalizedCode = trimmedLeaveType.toUpperCase();

  if (normalizedCode === "LOO1") {
    return "L001";
  }

  if (trimmedLeaveType in LEAVE_TYPE_CODES_BY_NAME) {
    return LEAVE_TYPE_CODES_BY_NAME[trimmedLeaveType];
  }

  return normalizedCode;
}

function formatLeaveType(leaveTypeCode: string) {
  const normalizedCode = normalizeLeaveTypeCode(leaveTypeCode);

  if (!normalizedCode) {
    return "-";
  }

  return normalizedCode;
}

function getStatusClass(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "approve" || normalizedStatus === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (normalizedStatus === "reject" || normalizedStatus === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getSortTime(leave: Leave) {
  const date = new Date(leave.start_date.replace(" ", "T"));

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function LeavesContent() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalPage, setModalPage] = useState(1);
  const [isAllRecordsOpen, setIsAllRecordsOpen] = useState(false);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<Leave | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLeaves() {
      try {
        const token = getStoredToken();
        const data = await getLeave(token ? { token } : undefined);

        if (isMounted) {
          setLeaves(getLeaveList(data));
        }
      } catch (caughtError) {
        if (isMounted) {
          const message =
            caughtError instanceof ApiError
              ? caughtError.message
              : "โหลดข้อมูลการลาไม่สำเร็จ";

          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaves();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAllRecordsOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isAllRecordsOpen]);

  const sortedLeaves = useMemo(
    () => [...leaves].sort((a, b) => getSortTime(b) - getSortTime(a)),
    [leaves],
  );
  const leaveTypeCounts = useMemo(
    () =>
      sortedLeaves.reduce<Record<string, number>>((counts, leave) => {
        if (!isLeaveActiveToday(leave)) {
          return counts;
        }

        const leaveTypeCode = normalizeLeaveTypeCode(leave.leve_type_name);

        counts[leaveTypeCode] = (counts[leaveTypeCode] ?? 0) + 1;

        return counts;
      }, {}),
    [sortedLeaves],
  );

  const filteredModalLeaves = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return sortedLeaves;
    }

    return sortedLeaves.filter((leave) =>
      [
        leave.name,
        leave.employee_code,
        leave.department_name,
        leave.work_name,
        leave.leve_type_name,
        formatLeaveType(leave.leve_type_name),
        getLeaveTypeLabel(leave.leve_type_name),
        leave.status_approve,
        leave.remark ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedSearchTerm)),
    );
  }, [searchTerm, sortedLeaves]);

  const totalPages = Math.max(1, Math.ceil(filteredModalLeaves.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const modalTotalPages = Math.max(
    1,
    Math.ceil(filteredModalLeaves.length / MODAL_PAGE_SIZE),
  );
  const activeModalPage = Math.min(modalPage, modalTotalPages);
  const displayLeaves = filteredModalLeaves.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const modalDisplayLeaves = filteredModalLeaves.slice(
    (activeModalPage - 1) * MODAL_PAGE_SIZE,
    activeModalPage * MODAL_PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const modalPageNumbers = Array.from(
    { length: modalTotalPages },
    (_, index) => index + 1,
  );

  return (
    <section className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
      <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold">รายการลาทั้งหมด</h2>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
              พบข้อมูล {filteredModalLeaves.length} รายการ
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
            <label htmlFor="leave-record-search" className="sr-only">
              ค้นหารายการลา
            </label>
            <input
              id="leave-record-search"
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
                setModalPage(1);
              }}
              placeholder="ค้นหาชื่อ รหัส แผนก สถานที่ ประเภทลา"
              className="h-9 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 sm:w-80"
            />
            {/* <button
              type="button"
              onClick={() => {
                setModalPage(1);
                setIsAllRecordsOpen(true);
              }}
              className="h-9 rounded-lg bg-[var(--dashboard-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--dashboard-accent-hover)]"
            >
              ดูทั้งหมด
            </button> */}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-[var(--dashboard-border)] px-5 py-4 md:grid-cols-3">
        {LEAVE_TYPE_CARDS.map((leaveType) => (
          <div
            key={leaveType.code}
            className={`rounded-lg border px-5 py-4 shadow-sm ${leaveType.className}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{leaveType.code}</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--dashboard-text)]">
                  {leaveType.label}
                </h3>
              </div>
              <p className="text-3xl font-semibold text-[var(--dashboard-text)]">
                {leaveTypeCounts[leaveType.code] ?? 0}
              </p>
            </div>
            <p className="mt-3 text-sm">{leaveType.description}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          กำลังโหลดรายการลา...
        </div>
      ) : null}

      {error ? <div className="px-5 py-8 text-sm text-red-600">{error}</div> : null}

      {!isLoading && !error && filteredModalLeaves.length === 0 ? (
        <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
          ไม่พบรายการลา
        </div>
      ) : null}

      {!isLoading && !error && filteredModalLeaves.length > 0 ? (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">พนักงาน</th>
                  <th className="px-5 py-3 font-medium">รหัส</th>
                  <th className="px-5 py-3 font-medium">แผนก</th>
                  <th className="px-5 py-3 font-medium">ประเภทลา</th>
                  <th className="px-5 py-3 font-medium">วันที่เริ่ม</th>
                  <th className="px-5 py-3 font-medium">วันที่สิ้นสุด</th>
                  <th className="px-5 py-3 font-medium">รายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--dashboard-border)]">
                {displayLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                      {leave.name}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {leave.employee_code || "-"}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {leave.department_name || "-"}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatLeaveType(leave.leve_type_name)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDate(leave.start_date)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      {formatDate(leave.end_date)}
                    </td>
                    <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                      <button
                        type="button"
                        onClick={() => setSelectedLeaveDetail(leave)}
                        className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-xs font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
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
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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

      {isAllRecordsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-leave-records-title"
        >
          <div className="flex h-[88vh] min-h-[520px] w-full max-w-6xl flex-col rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-xl">
            <div className="flex flex-col gap-3 border-b border-[var(--dashboard-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 id="all-leave-records-title" className="text-base font-semibold">
                  ข้อมูล leave records ทั้งหมด
                </h3>
                <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                  พบข้อมูล {filteredModalLeaves.length} รายการ
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsAllRecordsOpen(false)}
                  className="h-10 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
                >
                  X
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {filteredModalLeaves.length === 0 ? (
                <div className="px-5 py-8 text-sm text-[var(--dashboard-muted)]">
                  ไม่พบรายการลา
                </div>
              ) : (
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-muted)]">
                    <tr>
                      <th className="px-5 py-3 font-medium">พนักงาน</th>
                      <th className="px-5 py-3 font-medium">รหัส</th>
                      <th className="px-5 py-3 font-medium">แผนก</th>
                      <th className="px-5 py-3 font-medium">ประเภทลา</th>
                      <th className="px-5 py-3 font-medium">วันที่เริ่ม</th>
                      <th className="px-5 py-3 font-medium">วันที่สิ้นสุด</th>
                      <th className="px-5 py-3 font-medium">สถานะ</th>
                      <th className="px-5 py-3 font-medium">สถานที่</th>
                      <th className="px-5 py-3 font-medium">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--dashboard-border)]">
                    {modalDisplayLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <td className="px-5 py-4 font-medium text-[var(--dashboard-text)]">
                          {leave.name}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {leave.employee_code || "-"}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {leave.department_name || "-"}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {formatLeaveType(leave.leve_type_name)}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {formatDate(leave.start_date)}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {formatDate(leave.end_date)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${getStatusClass(
                              leave.status_approve,
                            )}`}
                          >
                            {leave.status_approve || "-"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          {leave.work_name || "-"}
                        </td>
                        <td className="px-5 py-4 text-[var(--dashboard-muted)]">
                          <button
                            type="button"
                            onClick={() => setSelectedLeaveDetail(leave)}
                            className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-xs font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
                          >
                            ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {modalTotalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-[var(--dashboard-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--dashboard-muted)]">
                  หน้า {activeModalPage} จาก {modalTotalPages}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPage((page) => Math.max(1, page - 1))}
                    disabled={activeModalPage === 1}
                    className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ก่อนหน้า
                  </button>
                  {modalPageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setModalPage(page)}
                      className={`h-9 min-w-9 rounded-lg border px-3 text-sm font-medium ${
                        activeModalPage === page
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
                      setModalPage((page) => Math.min(modalTotalPages, page + 1))
                    }
                    disabled={activeModalPage === modalTotalPages}
                    className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {selectedLeaveDetail ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-detail-title"
        >
          <div className="w-full max-w-2xl rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--dashboard-border)] px-5 py-4">
              <div>
                <h3 id="leave-detail-title" className="text-base font-semibold">
                  รายละเอียดการลา
                </h3>
                <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                  {selectedLeaveDetail.name} ·{" "}
                  {formatLeaveType(selectedLeaveDetail.leve_type_name)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaveDetail(null)}
                className="h-9 rounded-lg border border-[var(--dashboard-border)] px-3 text-sm font-medium text-[var(--dashboard-text)] hover:bg-[var(--dashboard-surface-muted)]"
              >
                X
              </button>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              {[
                ["พนักงาน", selectedLeaveDetail.name],
                ["รหัส", selectedLeaveDetail.employee_code || "-"],
                ["แผนก", selectedLeaveDetail.department_name || "-"],
                ["ประเภทลา", formatLeaveType(selectedLeaveDetail.leve_type_name)],
                ["วันที่เริ่ม", formatDate(selectedLeaveDetail.start_date)],
                ["วันที่สิ้นสุด", formatDate(selectedLeaveDetail.end_date)],
                ["สถานะ", selectedLeaveDetail.status_approve || "-"],
                ["สถานที่", selectedLeaveDetail.work_name || "-"],
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
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-[var(--dashboard-muted)]">
                  เหตุผล
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--dashboard-text)]">
                  {selectedLeaveDetail.remark || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
