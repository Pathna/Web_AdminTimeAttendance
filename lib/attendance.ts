export type AttendanceRequest = {
  work_loca_id: number;
};

export type ApiStatus = "success" | "error";

export type AttendanceApprovalStatus = "Approve" | "Pending" | "Reject";

export type AttendanceInOutStatus = "In" | "Out";

export type AttendanceRecord = {
  attendance_id: number;
  employee_id: number;
  employee_name: string;
  check_in_time: string;
  check_out_time: string | null;
  worked_hours: number | null;
  late_time: number | null;
  check_in_location: string | null;
  check_in_distance: string | null;
  check_out_distance: string | null;
  status: AttendanceApprovalStatus | string;
  status_approve_in_out: AttendanceInOutStatus | string;
  details: string | null;
  day_period: string | null;
  hour_from: number | null;
  hour_to: number | null;
  emergency_phone: string | null;
  department_id: number | null;
  department_name: string | null;
  work_location: string | null;
};

export type AttendanceResponse = {
  status: ApiStatus | string;
  date: string | null;
  attendance: AttendanceRecord[];
};
