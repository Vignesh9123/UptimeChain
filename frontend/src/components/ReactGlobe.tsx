import { useRef, useEffect, useState } from "react";
import Globe from "react-globe.gl";
import { useTheme } from "@/components/theme-provider"
import { axiosClient, getRandomMarkersFromData } from "@/config";
import { Loader2 } from "lucide-react";

const markers = [
  { lat: 20, lng: 78, label: "Asia Marker" },
  { lat: 24, lng: 78, label: "Asia Marker" },
  { lat: -10, lng: -55, label: "South America Marker" },
  { lat: -10, lng: -45, label: "South America Marker" },
  { lat: 51, lng: 10, label: "Europe Marker" },
  { lat: -25, lng: 133, label: "Australia Marker" },
  { lat: -25, lng: 125, label: "Australia Marker" },
  { lat: 0, lng: 20, label: "Africa Marker" },
  { lat: 40, lng: -100, label: "North America Marker" },
];

const labels = [
  { lat: 34, lng: 100, text: "Asia" },
  { lat: 54, lng: 15, text: "Europe" },
  { lat: 0, lng: 20, text: "Africa" },
  { lat: -15, lng: -60, text: "South America" },
  { lat: 45, lng: -100, text: "North America" },
  { lat: -25, lng: 135, text: "Australia" },
];

export default function GlobeComponent() {
  const { theme } = useTheme();
  console.log(theme);
  const globeRef = useRef(undefined);
  const [regionData, setRegionData] = useState<Record<string, number>>({});
  const [realMarkers, setRealMarkers] = useState([]);
  const [regionDataLoading, setRegionDataLoading] = useState(true);
  const regionEntries = Object.entries(regionData ?? {}).sort((a, b) => b[1] - a[1]);
  const totalValidators = regionEntries.reduce((sum, [, count]) => sum + count, 0);
    useEffect(() => {
      axiosClient
        .get("/validators/get-by-region")
        .then((response) => {
          const {data} = response.data
          const markers:any = getRandomMarkersFromData(data)
          setRegionData(data);
          setRealMarkers(markers);
          setRegionDataLoading(false);
        })
        .catch((error) => {
          console.error(error);
          setRegionDataLoading(false);
        });
    }, [])
  useEffect(() => {
    if (globeRef.current) {
      (globeRef.current as any).pointOfView({ lat: 20, lng: 78, altitude: 2 });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background max-w-[90vw]">
        {regionDataLoading ? (
          <div className="flex items-center justify-center h-[240px] w-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : regionEntries.length > 0 ? (
          <div className="w-full max-w-5xl pb-6">
            <div className="flex flex-col gap-1 rounded-2xl border bg-card/60 p-5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold tracking-tight">
                    Validators by region
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Distribution across regions
                  </p>
                </div>
                <div className="shrink-0 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-foreground/80">
                  Total: {totalValidators.toLocaleString()}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {regionEntries.map(([region, count]) => (
                  <div
                    key={region}
                    className="group rounded-xl border bg-background/40 p-4 transition-colors hover:bg-background/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{region}</p>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {count.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500/70 transition-all group-hover:bg-emerald-500"
                        style={{
                          width: `${Math.max(
                            6,
                            Math.round((count / Math.max(1, totalValidators)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl pb-6">
            <div className="rounded-2xl border bg-card/60 p-6 text-center shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/40">
              <p className="text-sm font-medium">No region data found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try again in a moment.
              </p>
            </div>
          </div>
        )}
          <Globe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor={theme == "dark" ? "#0a0a0a" : "#ffffff"}
            pointsData={realMarkers || markers}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => "#22c55e"}
            pointAltitude={0.02}
            pointRadius={0.6}
            labelsData={labels}
            labelLat="lat"
            labelLng="lng"
            labelText="text"
            labelSize={1.5}
            labelColor={() => "#ffffff"}
            labelDotRadius={0.3}
          />
          
       
    </div>
  );
}