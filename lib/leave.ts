export type LeaveResponse = {
  status: Leave[];
}

export type Leave = {
    id: number;
    name: string;
    employee_id: number;
    employee_code: string;
    attendance_work_location_id: number;
    work_name: string;
    attendance_department_id: number;
    department_name: string;
    leave_type_id: number;
    leve_type_name: string;
    status_approve: string;
    start_date: string;
    end_date: string;
    remark: string;
    images: string;
}
