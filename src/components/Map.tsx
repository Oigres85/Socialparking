
'use client';

/**
 * @fileOverview Componente Mappa per Social Parking Italia - Versione 2.5 Stable.
 */

import { useState, useEffect, forwardRef, useMemo } from 'react';
import { Map as ReactMapGL, Marker, MapRef, Source, Layer } from 'react-map-gl';
import { Circle } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type MapProps = {
  viewState: any;
  setViewState: (viewState: any) => void;
  userLocation: { latitude: number; longitude: number; heading: number | null } | null;
  mapParkingSpots: any[];
  navigationTarget?: { latitude: number; longitude: number } | null;
};

const Map = forwardRef<MapRef, MapProps>(({
  viewState,
  setViewState,
  userLocation,
  mapParkingSpots,
  navigationTarget,
}, ref) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const routeGeoJSON = useMemo(() => {
    if (!userLocation || !navigationTarget || !userLocation.longitude || !userLocation.latitude) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [userLocation.longitude, userLocation.latitude],
          [navigationTarget.longitude, navigationTarget.latitude],
        ],
      },
    };
  }, [userLocation, navigationTarget]);

  if (!MAPBOX_TOKEN) return <div className="h-screen w-screen bg-muted flex items-center justify-center text-white font-bold p-10 text-center">CONFIGURA IL TOKEN MAPBOX NELLE VARIABILI D'AMBIENTE</div>;
  if (!isClient) return <div className="h-screen w-screen bg-muted" />;

  return (
    <ReactMapGL
      ref={ref}
      mapboxAccessToken={MAPBOX_TOKEN}
      {...viewState}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v11"
      onMove={(evt) => setViewState(evt.viewState)}
    >
      {userLocation && (
        <Marker
          latitude={userLocation.latitude}
          longitude={userLocation.longitude}
          anchor="center"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
            <div 
              className="h-10 w-10 rounded-full border-4 border-white bg-blue-600 shadow-2xl relative z-10 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${userLocation.heading || 0}deg)` }}
            >
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[14px] border-b-white mb-1" />
            </div>
          </div>
        </Marker>
      )}

      {routeGeoJSON && (
        <Source type="geojson" data={routeGeoJSON as any}>
          <Layer
            id="route"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': '#f97316', 'line-width': 6, 'line-dasharray': [1, 2] }}
          />
        </Source>
      )}

      {Array.isArray(mapParkingSpots) && mapParkingSpots.map((spot: any) => {
        const isBooked = spot.status === 'in arrivo';
        const iconColor = isBooked ? 'text-orange-500' : 'text-green-500';
        return (
          <Marker
            key={spot.id}
            latitude={spot.latitude}
            longitude={spot.longitude}
            anchor="center"
          >
            <div className={`relative flex items-center justify-center ${iconColor} drop-shadow-xl cursor-pointer transition-transform hover:scale-110`}>
              <Circle size={48} strokeWidth={3} />
              <span className="absolute font-black text-xl mb-0.5">P</span>
            </div>
          </Marker>
        )
      })}
    </ReactMapGL>
  );
});

Map.displayName = 'Map';

export default Map;
