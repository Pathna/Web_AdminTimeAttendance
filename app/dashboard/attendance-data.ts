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

function isOutRecord(record: AttendanceRecord) {
  return record.status_approve_in_out.toLowerCase() === "out";
}

function getRecordKey(record: AttendanceRecord) {
  return String(record.attendance_id);
}

function getMergedRecord(
  currentRecord: AttendanceRecord,
  nextRecord: AttendanceRecord,
): AttendanceRecord {
  return {
    ...currentRecord,
    check_out_time: currentRecord.check_out_time ?? nextRecord.check_out_time,
    worked_hours: currentRecord.worked_hours ?? nextRecord.worked_hours,
    check_out_distance:
      currentRecord.check_out_distance ?? nextRecord.check_out_distance,
    status_approve_in_out:
      isOutRecord(currentRecord) || isOutRecord(nextRecord) ? "Out" : "In",
  };
}

function mergeDuplicateAttendanceRecords(records: AttendanceRecord[]) {
  const recordMap = new Map<string, AttendanceRecord>();

  for (const record of records) {
    const recordKey = getRecordKey(record);
    const currentRecord = recordMap.get(recordKey);

    recordMap.set(
      recordKey,
      currentRecord ? getMergedRecord(currentRecord, record) : record,
    );
  }

  return Array.from(recordMap.values());
}

export async function loadAttendanceRecords() {
  const workLocationIds = getStoredWorkLocationIds();
  const attendanceRecords: AttendanceRecord[] = [];

  for (const workLocationId of workLocationIds) {
    const data = await getAttendance({
      work_loca_id: workLocationId,
    });

    console.log(`Loaded attendance for work location ${workLocationId}:`, data);

    attendanceRecords.push(...getAttendanceRecords(data));
  }

  return mergeDuplicateAttendanceRecords(attendanceRecords);
}

export function getAttendanceErrorMessage(caughtError: unknown) {
  return caughtError instanceof ApiError
    ? caughtError.message
    : "โหลดข้อมูลเช็คอินไม่สำเร็จ";
}
