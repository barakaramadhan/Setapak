import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Peta detail & GRATIS: ubin OpenStreetMap (tanpa API key / billing).
const PUSAT_DEFAULT = [-2.5, 118]; // Indonesia
const TILE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const ikon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#292929;border:3px solid #fff;box-shadow:0 0 0 1.5px #292929"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapPane({ places = [], center = null, className = "" }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return undefined;
    const map = L.map(elRef.current, {
      zoomControl: false,
      scrollWheelZoom: true,
    }).setView(PUSAT_DEFAULT, 5);
    L.tileLayer(TILE, {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const titik = places.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lon)
    );
    titik.forEach((p) =>
      L.marker([p.lat, p.lon], { icon: ikon })
        .bindTooltip(p.name, { permanent: true, direction: "right", offset: [8, 0] })
        .addTo(layer)
    );
    if (titik.length > 1) {
      map.fitBounds(titik.map((p) => [p.lat, p.lon]), { padding: [60, 60], maxZoom: 14 });
    } else if (titik.length === 1) {
      map.setView([titik[0].lat, titik[0].lon], 14);
    } else if (center) {
      map.setView(center, 11);
    }
  }, [places, center]);

  return <div ref={elRef} className={className} />;
}

export default MapPane;
