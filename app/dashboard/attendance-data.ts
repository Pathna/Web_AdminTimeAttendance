import { ApiError, getAttendance } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/attendance";

const DEFAULT_WORK_LOCATION_ID = 1;

function parseWorkLocationIds(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );
    }
  } catch {
    return [];
  }

  return [];
}

function getStoredWorkLocationIds() {
  const currentStorage = sessionStorage.getItem("authToken")
    ? sessionStorage
    : localStorage;
  const fallbackStorage =
    currentStorage === sessionStorage ? localStorage : sessionStorage;
  const currentIds = parseWorkLocationIds(
    currentStorage.getItem("workLocationIds"),
  );
  const fallbackIds = parseWorkLocationIds(
    fallbackStorage.getItem("workLocationIds"),
  );
  const ids = currentIds.length > 0 ? currentIds : fallbackIds;

  return ids.length > 0 ? ids : [DEFAULT_WORK_LOCATION_ID];
}

function getAttendanceRecords(data: unknown): AttendanceRecord[] {
  if (
    typeof data === "object" &&
    data !== null &&
    "attendance" in data &&
    Array.isArray(data.attendance)
  ) {
    return data.attendance;
  }

  return [];
}

export async function loadAttendanceRecords() {
  const workLocationIds = getStoredWorkLocationIds();
  const attendanceRecords: AttendanceRecord[] = [];

  for (const workLocationId of workLocationIds) {
    const data = await getAttendance({
      work_loca_id: workLocationId,
    });

    attendanceRecords.push(...getAttendanceRecords(data));
  }

  return attendanceRecords;
}

export function getAttendanceErrorMessage(caughtError: unknown) {
  return caughtError instanceof ApiError
    ? caughtError.message
    : "โหลดข้อมูลเช็คอินไม่สำเร็จ";
}
