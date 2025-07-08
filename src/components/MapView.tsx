import { Map, Popup, NavigationControl, useControl } from 'react-map-gl/maplibre';
import { useState, useMemo, useCallback } from 'react';
import { GeoJsonLayer } from 'deck.gl';
import { MapboxOverlay as DeckOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
import { useRoomStore } from '../store';
import { useSql } from '@sqlrooms/duckdb';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface StateFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: {
    name: string;
    abbrev: string;
    [key: string]: any;
  };
}

interface MapViewProps {
  stateFeatures: StateFeature[];
  onStateClick?: (feature: StateFeature) => void;
  fillColor?: [number, number, number, number];
  hoveredFillColor?: [number, number, number, number];
  pointRadius?: number;
}

interface HoverInfo {
  longitude: number;
  latitude: number;
  name: string;
  abbrev: string;
  feature: StateFeature;
}

const INITIAL_VIEW_STATE = {
  latitude: 37.8,
  longitude: -96,
  zoom: 3.5,
  bearing: 0,
  pitch: 0,
};

const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new DeckOverlay(props));
  overlay.setProps(props);
  return null;
}

function normalize<T extends Record<string, any>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
  ) as T;
}

export default function MapView({
  stateFeatures,
  onStateClick,
  fillColor = [0, 150, 255, 180],
  hoveredFillColor = [255, 100, 100, 220],
  pointRadius = 8,
}: MapViewProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);

  const hasTable = useRoomStore((s) => s.db.findTableByName('covid_totals'));

  const covidDataQuery = useSql<{
    State: string;
    Abbreviation: string;
    "Total Cases": number;
    "Total Deaths": number;
  }>({
    query: `
      SELECT State, Abbreviation, "Total Cases", "Total Deaths" 
      FROM covid_totals
      ORDER BY State
    `,
    enabled: Boolean(hasTable),
  });

  const covidData = (covidDataQuery.data?.toArray() ?? []).map(normalize);

  const covidLookup = useMemo(() => {
    const lookup: Record<string, { totalCases: number; totalDeaths: number; abbrev: string }> = {};
    covidData.forEach((state) => {
      lookup[state.State] = {
        totalCases: state["Total Cases"],
        totalDeaths: state["Total Deaths"],
        abbrev: state.Abbreviation,
      };
    });
    return lookup;
  }, [covidData]);

  const handleHover = useCallback((info: any) => {
    if (info?.object && info?.coordinate) {
      const [longitude, latitude] = info.coordinate;
      setHovered({
        longitude,
        latitude,
        name: info.object.properties?.name || 'Unknown',
        abbrev: info.object.properties?.abbrev || '',
        feature: info.object,
      });
    } else {
      setHovered(null);
    }
  }, []);

  const handleClick = useCallback((info: any) => {
    if (info?.object && onStateClick) {
      onStateClick(info.object);
    }
  }, [onStateClick]);

  const layers = useMemo(() => [
    new GeoJsonLayer({
      id: 'states-layer',
      data: stateFeatures,
      filled: true,
      pointRadiusMinPixels: pointRadius,
      pointRadiusScale: 1000,
      getPointRadius: () => pointRadius,
      getFillColor: fillColor,
      pickable: true,
      autoHighlight: true,
      onHover: handleHover,
      onClick: handleClick,
    }),
  ], [stateFeatures, fillColor, pointRadius, handleHover, handleClick]);

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString();
  };

  const hoveredCovidData = useMemo(() => {
    if (!hovered) return null;
    const key = hovered.name.trim();
    return covidLookup[key] || null;
  }, [hovered, covidLookup]);

  return (
    <div className="relative w-full h-full">
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE}
        cursor={hovered ? 'pointer' : 'grab'}
      >
        {hovered && (
          <Popup
            anchor="bottom"
            longitude={hovered.longitude}
            latitude={hovered.latitude}
            closeButton={false}
            closeOnClick={false}
            className="pointer-events-none"
            offset={[0, -pointRadius - 15]}
            style={{ zIndex: 1000 }}
          >
            <div 
              className="bg-white text-black rounded-lg shadow-2xl border border-gray-200 min-w-0 overflow-hidden"
              style={{ 
                padding: '12px 16px',
                minWidth: '200px',
                maxWidth: '280px',
                zIndex: 1001,
                position: 'relative'
              }}
            >
              {/* Header */}
              <div className="border-b border-gray-100 pb-2 mb-3">
                <div className="font-semibold text-gray-900 text-base leading-tight">
                  {hovered.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {hoveredCovidData?.abbrev || hovered.abbrev}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Cases</span>
                  <span className="text-sm font-semibold text-blue-600 tabular-nums">
                    {formatNumber(hoveredCovidData?.totalCases)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Deaths</span>
                  <span className="text-sm font-semibold text-red-600 tabular-nums">
                    {formatNumber(hoveredCovidData?.totalDeaths)}
                  </span>
                </div>
              </div>

              {/* Tooltip arrow */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0"
                style={{
                  bottom: '-6px',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid white',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}
              />
            </div>
          </Popup>
        )}
        <DeckGLOverlay layers={layers} />
        <NavigationControl position="top-left" />
      </Map>
    </div>
  );
}