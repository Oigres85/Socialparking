'use client';

/**
 * @fileOverview Componente Mappa per Social Parking.
 */

import { forwardRef, useMemo, memo } from 'react';
import { Map as ReactMapGL, Marker, MapRef, Source, Layer } from 'react-map-gl';
import { Circle } from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type MapProps = {
  viewState: any;
  setViewState: (viewState: any) => void;
  userLocation: { latitude: number; longitude: number; heading: number | null } | null;
  mapParkingSpots: any[];
  navigationTarget?: { latitude: number; longitude: number } | null;
  car?: { latitude: number; longitude: number } | null;
  carLabel?: string;
  onSpotClick?: (spot: any) => void;
};

const Map = forwardRef<MapRef, MapProps>(({
  viewState,
  setViewState,
  userLocation,
  mapParkingSpots,
  navigationTarget,
  car,
  carLabel,
  onSpotClick,
}, ref) => {
  const routeGeoJSON = useMemo(() => {
    if (!userLocation || !navigationTarget) return null;
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

  if (!MAPBOX_TOKEN) return <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white font-bold p-10 text-center">CONFIGURA NEXT_PUBLIC_MAPBOX_TOKEN NEL FILE .env.local</div>;

  return (
    <div className="relative w-full h-full">
      <ReactMapGL
        ref={ref}
        mapboxAccessToken={MAPBOX_TOKEN}
        {...viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        onMove={(evt) => setViewState(evt.viewState)}
        // Attribuzione compatta: richiesta dai termini d'uso Mapbox (e verificata in review dagli store)
        attributionControl={{ compact: true }}
        logoPosition="bottom-left"
      >
        {car && (
          <Marker latitude={car.latitude} longitude={car.longitude} anchor="bottom">
            <div className="flex flex-col items-center">
              <div className="bg-white text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg mb-1 whitespace-nowrap">{carLabel}</div>
              <div className="h-10 w-10 rounded-full bg-black border-4 border-white shadow-2xl flex items-center justify-center text-xl">🚗</div>
            </div>
          </Marker>
        )}

        {userLocation && (
          <Marker latitude={userLocation.latitude} longitude={userLocation.longitude} anchor="center">
            <div className="relative">
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
          return (
            <Marker
              key={spot.id}
              latitude={spot.latitude}
              longitude={spot.longitude}
              anchor="center"
              onClick={(e) => { e.originalEvent.stopPropagation(); onSpotClick?.(spot); }}
            >
              <div className={`relative flex items-center justify-center ${isBooked ? 'text-orange-500' : 'text-green-500'} drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)] cursor-pointer transition-transform hover:scale-110`}>
                {!isBooked && <div className="absolute inset-1 rounded-full bg-green-500/25 animate-ping" />}
                <Circle size={48} strokeWidth={3} />
                <span className="absolute font-black text-xl mb-0.5">P</span>
              </div>
            </Marker>
          );
        })}
      </ReactMapGL>
    </div>
  );
});

Map.displayName = 'Map';

export default memo(Map);
