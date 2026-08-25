import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';

const driverIcon = L.divIcon({
  html: '🛵',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destIcon = L.divIcon({
  html: '📍',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

type Props = {
  token: string;
  destLat: number;
  destLng: number;
};

export default function LiveTrackingMap({ token, destLat, destLng }: Props) {
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      const { data, error } = await supabase.rpc('get_driver_location_by_token', { token });
      if (!error && data && data.length > 0) {
        setDriverPos([data[0].lat, data[0].lng]);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 5000); // polling tiap 5 detik
    return () => clearInterval(interval);
  }, [token]);

  const center: [number, number] = driverPos || [destLat, destLng];

  return (
    <div style={{ height: 280, borderRadius: 8, overflow: 'hidden' }}>
      <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Marker position={[destLat, destLng]} icon={destIcon} />
        {driverPos && <Marker position={driverPos} icon={driverIcon} />}
      </MapContainer>
    </div>
  );
}