export type EmployeeRequest = {
    user_id: number;
}

export type EmployeeResponse = {
  status: string;
  employee: Employee;
}

export type Employee = {
  id: number;
  company_id: number;
  work_location_id: number;
  work_location_id_ids: number[];
  calendar_id: number;
  attendance_user_id: number;

  employee_code: string;
  name: string;
  role: string;
  job_position: string;
  job_Level: string;
  department: string;

  email: string;
  mobile_phone: string;
  address_home: string;

  gender: string;
  marital: string;
  children: string;

  hiring_date: string;
  termination_date: string;

  last_check_in: string;
  last_check_out: string;

  employee_image: string;
}

export type AllEmployeeResponse = AllEmployee[] | {
    status: string;
    employees: AllEmployee[];
}

export type AllEmployee = {
    id: number;
    name: string;
    attendance_company_id: number;
    attendance_department_id: number;
    employee_code: string | null;
    email: string | null;
    mobile_phone: string | null;
    attendance_user_id: number | null;
    active_flag: boolean | null;
    employee_type_id: number | null;
}

