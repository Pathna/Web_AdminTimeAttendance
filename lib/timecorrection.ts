
export type TimeCorrectionResponse = {
  status: boolean;
  data: TimeCorrectionRecord[];
}

export type TimeCorrectionRecord = {
  id: number;
  name: string | null;
  employee_Id: number | null;
  request_date: string | null;
  work_time_in: string | null;
  work_time_out: string | null;
  attendance_work_location_id: number | null;
  attendance_department_id: number | null;
  attendance_company_id: number | null;
  time_correction_name: string | null;
  remark: string | null;
  status_name: string | null;
  remark_status: string | null;
  emp_approve: string | null;
}
