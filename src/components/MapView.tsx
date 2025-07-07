import { Map, Popup, NavigationControl, useControl } from 'react-map-gl/maplibre';
import { useState, useMemo, useCallback } from 'react';
import { GeoJsonLayer } from 'deck.gl';
import { MapboxOverlay as DeckOverlay, MapboxOverlayProps } from '@deck.gl/mapbox';
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

export default function MapView({ 
  stateFeatures, 
  onStateClick,
  fillColor = [0, 150, 255, 180],
  hoveredFillColor = [255, 100, 100, 220],
  pointRadius = 8
}: MapViewProps) {
  const [hovered, setHovered] = useState<HoverInfo | null>(null);

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
      getFillColor: (d: any) => {
        // Highlight hovered state
        if (hovered?.feature === d) {
          return hoveredFillColor;
        }
        return fillColor;
      },
      pickable: true,
      autoHighlight: true,
      onHover: handleHover,
      onClick: handleClick,
      updateTriggers: {
        getFillColor: [hovered?.feature, fillColor, hoveredFillColor],
      },
    }),
  ], [stateFeatures, hovered, fillColor, hoveredFillColor, pointRadius, handleHover, handleClick]);

  return (
    <div className="relative w-full h-full">
      <Map 
        initialViewState={INITIAL_VIEW_STATE} 
        mapStyle={MAP_STYLE}
        cursor={hovered ? 'pointer' : 'grab'}
      >
        {/* Hover tooltip */}
        {hovered && (
          <Popup
            anchor="top"
            longitude={hovered.longitude}
            latitude={hovered.latitude}
            closeButton={false}
            closeOnClick={false}
            className="pointer-events-none"
            offset={[0, -20]}
          >
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg border border-gray-700">
              <div className="font-semibold">{hovered.name}</div>
              <div className="text-xs text-gray-300">{hovered.abbrev}</div>
            </div>
          </Popup>
        )}

        <DeckGLOverlay layers={layers} />
        <NavigationControl position="top-left" />
      </Map>
    </div>
  );
}