"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError, getEmployeeMe, getlocation, login } from "@/lib/api";

function getLoginToken(data: Awaited<ReturnType<typeof login>>) {
  return data.token;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const remember = formData.get("remember") === "on";

    try {
      const data = await login({ username, password });
      const token = getLoginToken(data);

      if (token) {
        const [employeeData, locations] = await Promise.all([
          getEmployeeMe({ user_id: data.user.id }, { token }),
          getlocation({ token }),
        ]);
        const storage = remember ? localStorage : sessionStorage;

        storage.setItem("authToken", token);
        storage.setItem("authUserId", String(data.user.id));
        storage.setItem("workLocations", JSON.stringify(locations));
        storage.setItem(
          "workLocationIds",
          JSON.stringify(employeeData.employee.work_location_id_ids),
        );
      }

      router.push("/dashboard");
    } catch (caughtError) {
      const message =
        caughtError instanceof ApiError
          ? caughtError.message
          : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-[#0f4c5c] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white text-lg font-bold text-[#0f4c5c]">
              TA
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-100">
                Admin Check-In
              </p>
              <p className="text-base text-cyan-50">Time Attendance</p>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Secure Access
            </p>
            <h1 className="text-5xl font-semibold leading-tight">
              จัดการเวลาเข้าออกงานได้อย่างเป็นระบบ
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-cyan-50">
              เข้าสู่ระบบสำหรับผู้ดูแล เพื่อดูสถานะการเช็คอิน ตรวจสอบข้อมูลพนักงาน
              และติดตามภาพรวมการลงเวลาในแต่ละวัน
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="border-t border-white/30 pt-4">
              <p className="text-2xl font-semibold">24/7</p>
              <p className="mt-1 text-cyan-50">ตรวจสอบสถานะ</p>
            </div>
            <div className="border-t border-white/30 pt-4">
              <p className="text-2xl font-semibold">Real-time</p>
              <p className="mt-1 text-cyan-50">ข้อมูลอัปเดต</p>
            </div>
            <div className="border-t border-white/30 pt-4">
              <p className="text-2xl font-semibold">Admin</p>
              <p className="mt-1 text-cyan-50">สิทธิ์ควบคุม</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-[#0f4c5c] text-lg font-bold text-white">
                TA
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#0f4c5c]">
                Admin Check-In
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-7">
                <p className="text-sm font-medium text-[#0f4c5c]">
                  ยินดีต้อนรับกลับ
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  เข้าสู่ระบบ
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  ใช้อีเมลและรหัสผ่านของผู้ดูแลระบบเพื่อเข้าใช้งาน
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    อีเมลหรือชื่อผู้ใช้
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="admin@example.com หรือ username"
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#0f4c5c] focus:ring-4 focus:ring-[#0f4c5c]/10"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      รหัสผ่าน
                    </label>
                    <a
                      href="#"
                      className="text-sm font-medium text-[#0f4c5c] hover:text-[#0b3844]"
                    >
                      ลืมรหัสผ่าน?
                    </a>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="กรอกรหัสผ่าน"
                    required
                    className="h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base outline-none transition focus:border-[#0f4c5c] focus:ring-4 focus:ring-[#0f4c5c]/10"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-600">
                  <input
                    name="remember"
                    type="checkbox"
                    className="size-4 rounded border-slate-300 accent-[#0f4c5c]"
                  />
                  จดจำการเข้าสู่ระบบ
                </label>

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-lg bg-[#0f4c5c] px-4 text-base font-semibold text-white transition hover:bg-[#0b3844] focus:outline-none focus:ring-4 focus:ring-[#0f4c5c]/20 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              สำหรับผู้ดูแลระบบ Time Attendance เท่านั้น
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
