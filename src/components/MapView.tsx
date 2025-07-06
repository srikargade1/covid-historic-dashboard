import { Map, Popup, NavigationControl, useControl } from 'react-map-gl/maplibre';
import { useState } from 'react';
import { GeoJsonLayer } from 'deck.gl';
import { MapboxOverlay as DeckOverlay } from '@deck.gl/mapbox';
import 'maplibre-gl/dist/maplibre-gl.css';

// Define types for better TypeScript support
export interface StateFeature extends GeoJSON.Feature {
  properties: {
    name: string;
    [key: string]: any;
  };
}

interface MapViewProps {
  stateFeatures: StateFeature[];
}

interface SelectedState {
  longitude: number;
  latitude: number;
  name: string;
}

const INITIAL_VIEW_STATE = {
  latitude: 37.8, // Center of continental US
  longitude: -96,
  zoom: 3.5,
  bearing: 0,
  pitch: 0,
};

const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function DeckGLOverlay(props: any) {
  const overlay = useControl(() => new DeckOverlay(props));
  overlay.setProps(props);
  return null;
}

export default function MapView({ stateFeatures }: MapViewProps) {
  const [selected, setSelected] = useState<SelectedState | null>(null);

  const layers = [
    new GeoJsonLayer({
      id: 'states-layer',
      data: stateFeatures as GeoJSON.Feature[],
      filled: true,
      stroked: false,
      getFillColor: [0, 150, 255, 200],
      pickable: true,
      onClick: (info: any) => {
        if (info?.object && info?.coordinate) {
          setSelected({
            longitude: info.coordinate[0],
            latitude: info.coordinate[1],
            name: info.object.properties?.name || 'Unknown',
          });
        }
      },
    }),
  ];

  return (
    <Map initialViewState={INITIAL_VIEW_STATE} mapStyle={MAP_STYLE}>
      {selected && (
        <Popup
          anchor="bottom"
          longitude={selected.longitude}
          latitude={selected.latitude}
          onClose={() => setSelected(null)}
          closeOnClick={false}
        >
          <div className="text-black font-semibold">{selected.name}</div>
        </Popup>
      )}

      <DeckGLOverlay layers={layers} />
      <NavigationControl position="top-left" />
    </Map>
  );
}