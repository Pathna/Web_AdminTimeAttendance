"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { WorkLocation } from "@/lib/location";

export type LeafletMapPoint = {
  id: string;
  employeeName: string;
  lat: number;
  lng: number;
};

type LeafletMapViewProps = {
  focusedLocationId: number | null;
  locations: WorkLocation[];
  points: LeafletMapPoint[];
};

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

function getInitialCenter(
  locations: WorkLocation[],
  points: LeafletMapPoint[],
): [number, number] {
  const firstLocation = locations[0];
  const firstPoint = points[0];

  if (firstLocation) {
    return [firstLocation.latitude, firstLocation.longitude];
  }

  if (firstPoint) {
    return [firstPoint.lat, firstPoint.lng];
  }

  return DEFAULT_CENTER;
}

function createLocationIcon(leaflet: typeof Leaflet) {
  return leaflet.divIcon({
    className: "",
    html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#06b6d4;border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(34,211,238,0.28);"></span>',
    iconAnchor: [9, 9],
    iconSize: [18, 18],
  });
}

function createEmployeeIcon(leaflet: typeof Leaflet) {
  return leaflet.divIcon({
    className: "",
    html: '<span style="display:block;width:16px;height:16px;border-radius:999px;background:#f59e0b;border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(245,158,11,0.28);"></span>',
    iconAnchor: [8, 8],
    iconSize: [16, 16],
  });
}

export default function LeafletMapView({
  focusedLocationId,
  locations,
  points,
}: LeafletMapViewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerGroupRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [error, setError] = useState("");
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      try {
        const leaflet = await import("leaflet");

        if (!isMounted || !mapElementRef.current || mapRef.current) {
          return;
        }

        leafletRef.current = leaflet;
        const map = leaflet
          .map(mapElementRef.current, {
            center: getInitialCenter(locations, points),
            zoom: 13,
            zoomControl: true,
          })
          .setView(getInitialCenter(locations, points), 13);

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          })
          .addTo(map);

        layerGroupRef.current = leaflet.layerGroup().addTo(map);
        mapRef.current = map;
        setIsMapReady(true);

        window.setTimeout(() => {
          map.invalidateSize();
        }, 0);
      } catch {
        if (isMounted) {
          setError("โหลด Leaflet map ไม่สำเร็จ");
        }
      }
    }

    initializeMap();

    return () => {
      isMounted = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations, points]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;

    if (!isMapReady || !leaflet || !map || !layerGroup) {
      return;
    }

    layerGroup.clearLayers();

    const bounds = leaflet.latLngBounds([]);
    const locationIcon = createLocationIcon(leaflet);
    const employeeIcon = createEmployeeIcon(leaflet);

    locations.forEach((location) => {
      const position: [number, number] = [
        location.latitude,
        location.longitude,
      ];
      const marker = leaflet
        .marker(position, {
          icon: locationIcon,
          title: location.location_Name,
        })
        .bindPopup(
          `<strong>${location.location_Name}</strong><br/>${location.latitude.toFixed(
            6,
          )}, ${location.longitude.toFixed(6)}<br/>รัศมี ${
            location.radius
          } เมตร`,
        );
      const circle = leaflet.circle(position, {
        color: "#0891b2",
        fillColor: "#22d3ee",
        fillOpacity: 0.14,
        radius: location.radius,
        weight: 1,
      });

      marker.on("click", () => {
        map.flyTo(position, 17, { duration: 0.7 });
      });

      marker.addTo(layerGroup);
      circle.addTo(layerGroup);
      bounds.extend(position);
    });

    points.forEach((point) => {
      const position: [number, number] = [point.lat, point.lng];

      leaflet
        .marker(position, {
          icon: employeeIcon,
          title: point.employeeName,
        })
        .bindPopup(
          `<strong>${point.employeeName}</strong><br/>${point.lat.toFixed(
            6,
          )}, ${point.lng.toFixed(6)}`,
        )
        .on("click", () => {
          map.flyTo(position, 18, { duration: 0.7 });
        })
        .addTo(layerGroup);

      bounds.extend(position);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { maxZoom: 15, padding: [32, 32] });
    }

    window.setTimeout(() => {
      map.invalidateSize();
    }, 0);
  }, [isMapReady, locations, points]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || focusedLocationId === null) {
      return;
    }

    const location = locations.find((item) => item.id === focusedLocationId);

    if (!location) {
      return;
    }

    map.flyTo([location.latitude, location.longitude], 17, { duration: 0.7 });
  }, [focusedLocationId, locations]);

  if (error) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] px-6 text-center text-sm text-[var(--dashboard-muted)]">
        {error}
      </div>
    );
  }

  return <div ref={mapElementRef} className="h-full min-h-[420px] w-full" />;
}
