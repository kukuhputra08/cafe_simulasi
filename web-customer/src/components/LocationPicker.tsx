import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = L.divIcon({
  html: '📍',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();

  const handleClick = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 16);
        onLocate(latitude, longitude);
      },
      () => alert('Gagal mengambil lokasi. Pastikan izin lokasi diaktifkan.'),
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        padding: '8px 12px',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 6,
      }}
    >
      📍 Lokasi Saya
    </button>
  );
}

export default function LocationPicker({ onChange }: Props) {
  const defaultCenter: [number, number] = [-7.2575, 112.7521]; // fallback: Surabaya
  const [position, setPosition] = useState<[number, number]>(defaultCenter);

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(lat, lng);
  };

  return (
    <div style={{ position: 'relative', height: 280, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={position} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Marker
          position={position}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const latlng = e.target.getLatLng();
              handleSelect(latlng.lat, latlng.lng);
            },
          }}
        />
        <ClickHandler onSelect={handleSelect} />
        <FlyToButton onLocate={handleSelect} />
      </MapContainer>
    </div>
  );
}