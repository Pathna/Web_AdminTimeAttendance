"use client";

import { useEffect, useMemo, useState } from "react";
import type { AttendanceRecord } from "@/lib/attendance";
import type { WorkLocation } from "@/lib/location";
import {
  getAttendanceErrorMessage,
  loadAttendanceRecords,
} from "../attendance-data";
import LeafletMapView from "./leaflet-map-view";

type ActiveModal = "locations" | "employees" | "largeMap" | null;

type MapPoint = {
  id: string;
  employeeName: string;
  departmentName: string;
  lat: number;
  lng: number;
  status: string;
  time: string;
};

function parseCoordinate(value: string | null) {
  if (!value) {
    return null;
  }

  const matches = value.match(/-?\d+(?:\.\d+)?/g);

  if (!matches || matches.length < 2) {
    return null;
  }

  const lat = Number(matches[0]);
  const lng = Number(matches[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function parseStoredLocations(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return parsedValue.filter(
        (item): item is WorkLocation =>
          typeof item === "object" &&
          item !== null &&
          "id" in item &&
          "location_Name" in item &&
          "latitude" in item &&
          "longitude" in item &&
          "radius" in item &&
          typeof item.id === "number" &&
          typeof item.location_Name === "string" &&
          typeof item.latitude === "number" &&
          typeof item.longitude === "number" &&
          typeof item.radius === "number",
      );
    }
  } catch {
    return [];
  }

  return [];
}

function getStoredLocations() {
  const currentStorage = sessionStorage.getItem("authToken")
    ? sessionStorage
    : localStorage;
  const fallbackStorage =
    currentStorage === sessionStorage ? localStorage : sessionStorage;
  const currentLocations = parseStoredLocations(
    currentStorage.getItem("workLocations"),
  );
  const fallbackLocations = parseStoredLocations(
    fallbackStorage.getItem("workLocations"),
  );

  return currentLocations.length > 0 ? currentLocations : fallbackLocations;
}

function formatDateTime(value: string) {
  const date = new Date(value.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).format(new Date());
}

function isTodayRecord(record: AttendanceRecord) {
  return record.check_in_time.slice(0, 10) === getTodayDateKey();
}

function toMapPoints(records: AttendanceRecord[]): MapPoint[] {
  return records.flatMap((record) => {
    const coordinate = parseCoordinate(record.check_in_location);

    if (!coordinate) {
      return [];
    }

    return [
      {
        id: `${record.attendance_id}-${record.employee_id}`,
        employeeName: record.employee_name,
        departmentName: record.department_name ?? "-",
        lat: coordinate.lat,
        lng: coordinate.lng,
        status: record.status,
        time: formatDateTime(record.check_in_time),
      },
    ];
  });
}

function getPointClass(status: string) {
  if (status.toLowerCase() === "approve") {
    return "bg-emerald-500 ring-emerald-200";
  }

  if (status.toLowerCase() === "pending") {
    return "bg-amber-500 ring-amber-200";
  }

  return "bg-slate-500 ring-slate-200";
}

export default function MapContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [focusedLocationId, setFocusedLocationId] = useState<number | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMapData() {
      try {
        const attendanceRecords = await loadAttendanceRecords();
        const storedLocations = getStoredLocations();

        if (isMounted) {
          setRecords(attendanceRecords);
          setLocations(storedLocations);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getAttendanceErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMapData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeModal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal]);

  const todayRecords = useMemo(() => records.filter(isTodayRecord), [records]);
  const points = useMemo(() => toMapPoints(todayRecords), [todayRecords]);
  const filteredLocations = useMemo(() => {
    const normalizedSearch = locationSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return locations;
    }

    return locations.filter((location) =>
      location.location_Name.toLowerCase().includes(normalizedSearch),
    );
  }, [locationSearch, locations]);

  function closeModal() {
    setActiveModal(null);
    setLocationSearch("");
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-5 py-8 text-sm text-[var(--dashboard-muted)]">
        กำลังโหลดแผนที่การเข้างาน...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-sm">
        <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">แผนที่การเข้างาน</h2>
              <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                แสดงตำแหน่งจากข้อมูล check-in location
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveModal("largeMap")}
                className="h-9 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-medium hover:bg-[var(--dashboard-surface-muted)]"
              >
                แผนที่ใหญ่
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("locations")}
                className="h-9 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-medium hover:bg-[var(--dashboard-surface-muted)]"
              >
                Location
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("employees")}
                className="h-9 rounded-lg bg-[var(--dashboard-accent)] px-4 text-sm font-medium text-white hover:bg-[var(--dashboard-accent-hover)]"
              >
                พนักงานวันนี้
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-0 h-[620px] overflow-hidden bg-[var(--dashboard-surface-muted)]">
          <LeafletMapView
            focusedLocationId={focusedLocationId}
            locations={locations}
            points={points}
          />
        </div>
      </div>

      <aside className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-sm">
        <h2 className="text-base font-semibold">ตำแหน่งล่าสุด</h2>
        <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
          พบข้อมูลพิกัด {points.length} รายการ
        </p>

        <div className="mt-5 max-h-[560px] space-y-3 overflow-auto">
          {points.map((point) => (
            <div
              key={point.id}
              className="rounded-lg border border-[var(--dashboard-border)] p-3"
            >
              <p className="text-sm font-medium">{point.employeeName}</p>
              <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                {point.departmentName}
              </p>
              <p className="mt-2 text-xs text-[var(--dashboard-muted)]">
                {point.time}
              </p>
            </div>
          ))}
        </div>
      </aside>

      {activeModal ? (
        <div
          className="fixed inset-0 isolate z-[1000] flex items-center justify-center bg-slate-950/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-modal-title"
        >
          <div
            className={`flex h-[82vh] flex-col overflow-hidden rounded-lg bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-xl ${
              activeModal === "largeMap"
                ? "w-[min(1280px,calc(100vw-32px))]"
                : "w-[min(920px,calc(100vw-32px))]"
            }`}
          >
            <div className="border-b border-[var(--dashboard-border)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="map-modal-title" className="text-lg font-semibold">
                    {activeModal === "locations"
                      ? "Location ทั้งหมด"
                      : activeModal === "largeMap"
                        ? "แผนที่ใหญ่"
                        : "พนักงานที่ลงงานวันนี้"}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--dashboard-muted)]">
                    {activeModal === "locations"
                      ? `พบ location ${filteredLocations.length} รายการ`
                      : activeModal === "largeMap"
                        ? "ค้นหา location และดูรัศมีรอบพื้นที่"
                        : `พบพนักงานพร้อมพิกัด ${points.length} รายการ`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex size-9 items-center justify-center rounded-lg border border-[var(--dashboard-border)] text-sm font-semibold text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-muted)]"
                  aria-label="ปิด"
                >
                  X
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-5">
              {activeModal === "locations" ? (
                <>
                  <div className="mb-4">
                    <label htmlFor="location-search" className="sr-only">
                      ค้นหา location
                    </label>
                    <input
                      id="location-search"
                      type="search"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      placeholder="ค้นหา location"
                      className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10 md:max-w-sm"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredLocations.length === 0 ? (
                      <p className="text-sm text-[var(--dashboard-muted)]">
                        ไม่พบข้อมูล location
                      </p>
                    ) : (
                      filteredLocations.map((location) => (
                        <div
                          key={location.id}
                          className="rounded-lg border border-[var(--dashboard-border)] p-4"
                        >
                          <p className="text-sm font-semibold">
                            {location.location_Name}
                          </p>
                          <p className="mt-2 text-xs text-[var(--dashboard-muted)]">
                            {location.latitude.toFixed(6)},{" "}
                            {location.longitude.toFixed(6)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                            รัศมี {location.radius} เมตร
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : activeModal === "largeMap" ? (
                <div className="grid h-full min-h-[620px] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="relative z-0 min-h-[620px] overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)]">
                    <LeafletMapView
                      focusedLocationId={focusedLocationId}
                      locations={filteredLocations}
                      points={points}
                    />
                  </div>

                  <aside className="relative z-10 min-h-0 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4">
                    <label htmlFor="large-map-search" className="sr-only">
                      ค้นหา location
                    </label>
                    <input
                      id="large-map-search"
                      type="search"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      placeholder="ค้นหา location"
                      className="h-10 w-full rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm outline-none transition placeholder:text-[var(--dashboard-muted)] focus:border-[var(--dashboard-accent)] focus:ring-4 focus:ring-cyan-500/10"
                      autoFocus
                    />
                    <div className="mt-4 max-h-[540px] space-y-3 overflow-auto">
                      {filteredLocations.map((location) => (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => setFocusedLocationId(location.id)}
                          className="w-full rounded-lg border border-[var(--dashboard-border)] p-3 text-left hover:bg-[var(--dashboard-surface-muted)]"
                        >
                          <p className="text-sm font-medium">
                            {location.location_Name}
                          </p>
                          <p className="mt-2 text-xs text-[var(--dashboard-muted)]">
                            รัศมี {location.radius} เมตร
                          </p>
                        </button>
                      ))}
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {points.length === 0 ? (
                    <p className="text-sm text-[var(--dashboard-muted)]">
                      ยังไม่มีพนักงานที่มีพิกัด check-in วันนี้
                    </p>
                  ) : (
                    points.map((point) => (
                      <div
                        key={point.id}
                        className="rounded-lg border border-[var(--dashboard-border)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {point.employeeName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                              {point.departmentName}
                            </p>
                          </div>
                          <span
                            className={`mt-1 size-3 rounded-full ${getPointClass(
                              point.status,
                            )
                              .split(" ")
                              .at(0)}`}
                          />
                        </div>
                        <p className="mt-3 text-xs text-[var(--dashboard-muted)]">
                          {point.time}
                        </p>
                        <p className="mt-1 text-xs text-[var(--dashboard-muted)]">
                          {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
