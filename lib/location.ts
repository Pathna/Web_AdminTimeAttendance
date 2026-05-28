export type WorkLocation = {
  id: number;
  location_Name: string;
  latitude: number;
  longitude: number;
  radius: number;
};

export type WorkLocationResponse = WorkLocation[];
