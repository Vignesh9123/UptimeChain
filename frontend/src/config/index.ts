export * from './env'
export * from './api'

export const markersByContinent: MarkersByContinent = {
    "Asia": [
      { lat: 20, lng: 78, label: "Asia Marker 1" },
      { lat: 25, lng: 90, label: "Asia Marker 2" },
      { lat: 35, lng: 105, label: "Asia Marker 3" },
      { lat: 15, lng: 100, label: "Asia Marker 4" },
      { lat: 30, lng: 70, label: "Asia Marker 5" },
      { lat: 10, lng: 110, label: "Asia Marker 6" },
      { lat: 40, lng: 120, label: "Asia Marker 7" },
      { lat: 5, lng: 95, label: "Asia Marker 8" },
      { lat: 45, lng: 80, label: "Asia Marker 9" },
      { lat: 22, lng: 88, label: "Asia Marker 10" },
    ],
  
    "Europe": [
      { lat: 51, lng: 10, label: "Europe Marker 1" },
      { lat: 48, lng: 2, label: "Europe Marker 2" },
      { lat: 52, lng: 13, label: "Europe Marker 3" },
      { lat: 41, lng: 12, label: "Europe Marker 4" },
      { lat: 40, lng: -3, label: "Europe Marker 5" },
      { lat: 55, lng: 37, label: "Europe Marker 6" },
      { lat: 59, lng: 18, label: "Europe Marker 7" },
      { lat: 50, lng: 14, label: "Europe Marker 8" },
      { lat: 60, lng: 25, label: "Europe Marker 9" },
      { lat: 45, lng: 7, label: "Europe Marker 10" },
    ],
  
    "Africa": [
      { lat: 0, lng: 20, label: "Africa Marker 1" },
      { lat: -1, lng: 36, label: "Africa Marker 2" },
      { lat: 6, lng: 3, label: "Africa Marker 3" },
      { lat: 30, lng: 31, label: "Africa Marker 4" },
      { lat: -26, lng: 28, label: "Africa Marker 5" },
      { lat: 15, lng: 32, label: "Africa Marker 6" },
      { lat: 12, lng: -1, label: "Africa Marker 7" },
      { lat: -18, lng: 47, label: "Africa Marker 8" },
      { lat: 33, lng: -7, label: "Africa Marker 9" },
      { lat: 9, lng: 8, label: "Africa Marker 10" },
    ],
  
    "North America": [
      { lat: 40, lng: -100, label: "North America Marker 1" },
      { lat: 34, lng: -118, label: "North America Marker 2" },
      { lat: 43, lng: -79, label: "North America Marker 3" },
      { lat: 19, lng: -99, label: "North America Marker 4" },
      { lat: 61, lng: -150, label: "North America Marker 5" },
      { lat: 25, lng: -80, label: "North America Marker 6" },
      { lat: 49, lng: -123, label: "North America Marker 7" },
      { lat: 45, lng: -73, label: "North America Marker 8" },
      { lat: 32, lng: -96, label: "North America Marker 9" },
      { lat: 39, lng: -104, label: "North America Marker 10" },
    ],
  
    "South America": [
      { lat: -10, lng: -55, label: "South America Marker 1" },
      { lat: -23, lng: -46, label: "South America Marker 2" },
      { lat: -34, lng: -58, label: "South America Marker 3" },
      { lat: -12, lng: -77, label: "South America Marker 4" },
      { lat: 4, lng: -74, label: "South America Marker 5" },
      { lat: -33, lng: -70, label: "South America Marker 6" },
      { lat: -16, lng: -68, label: "South America Marker 7" },
      { lat: -3, lng: -60, label: "South America Marker 8" },
      { lat: -22, lng: -43, label: "South America Marker 9" },
      { lat: -8, lng: -35, label: "South America Marker 10" },
    ],
  
    "Oceania": [
      { lat: -25, lng: 133, label: "Australia Marker 1" },
      { lat: -33, lng: 151, label: "Australia Marker 2" },
      { lat: -37, lng: 144, label: "Australia Marker 3" },
      { lat: -27, lng: 153, label: "Australia Marker 4" },
      { lat: -31, lng: 115, label: "Australia Marker 5" },
      { lat: -42, lng: 147, label: "Australia Marker 6" },
      { lat: -12, lng: 130, label: "Australia Marker 7" },
      { lat: -35, lng: 149, label: "Australia Marker 8" },
      { lat: -28, lng: 114, label: "Australia Marker 9" },
      { lat: -20, lng: 140, label: "Australia Marker 10" },
    ],
};

type Marker = {
    lat: number;
    lng: number;
    label: string;
  };
  
  type MarkersByContinent = {
    [continent: string]: Marker[];
  };
  
  type DataInput = {
    [continent: string]: number;
  };
  
export function getRandomMarkersFromData(
    data: DataInput  
): Marker[] {
    const result: Marker[] = [];
  
    for (const [continent, count] of Object.entries(data)) {
      const markers = markersByContinent[continent];
      if (!markers) continue;
  
      const shuffled = [...markers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
  
      const selected = shuffled.slice(0, count).map((m) => ({
        lat: m.lat,
        lng: m.lng,
        label: `${continent} Marker`,
      }));
  
      result.push(...selected);
    }
  
    return result;
  }