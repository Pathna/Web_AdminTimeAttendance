import type { AttendanceRequest, AttendanceResponse } from "@/lib/attendance";
import type { AllEmployeeResponse, EmployeeRequest, EmployeeResponse } from "@/lib/employee";
import type { WorkLocationResponse } from "@/lib/location";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:44348";

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanBaseUrl = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBaseUrl}${cleanPath}`;
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiRequest<T>(
  path: string,
  { body, headers, token, ...options }: ApiOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await readResponse(response);

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "API request failed";

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginUser = {
  id: number;
  login: string;
  active: boolean;
};

export type LoginResponse = {
  status: string;
  token: string;
  user: LoginUser;
};

export function login(credentials: LoginRequest) {
  return api.post<LoginResponse>("/api/Auth/auth/login", credentials);
}

export function getEmployeeMe(request: EmployeeRequest, options?: ApiOptions) {
  return api.post<EmployeeResponse>("/api/attendance/employee/me", request, options);
}

export function getAttendance(request: AttendanceRequest) {
  return api.post<AttendanceResponse>("/api/attendance/todayNoimage", request);
}

export function getlocation(options?: ApiOptions) {
  return api.get<WorkLocationResponse>("/api/attendance/getlocation", options);
}

export function getEmployee(options?: ApiOptions) {
  return api.get<AllEmployeeResponse>("/emp/getemployees", options);
}

export type {
  AttendanceRequest,
  ApiStatus,
  AttendanceApprovalStatus,
  AttendanceInOutStatus,
  AttendanceRecord,
  AttendanceResponse,
} from "@/lib/attendance";

export type {
  EmployeeRequest,
  Employee,
  AllEmployee,
  AllEmployeeResponse,
  EmployeeResponse
} from "@/lib/employee";

export type { WorkLocation, WorkLocationResponse } from "@/lib/location";
