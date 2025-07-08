import { SpinnerPane } from '@sqlrooms/ui';
import { useMemo, useState, useEffect } from 'react';
import { StateFeature } from './MapView';
import MapView from './MapView';
import CovidCharts from './CovidCharts';

// Define the structure of your JSON file
interface StateFeatureCollection {
  type: 'FeatureCollection';
  features: StateFeature[];
}

export const MainView: React.FC = () => {
  const [data, setData] = useState<StateFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the JSON file
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Replace 'states.json' with the actual path to your JSON file
        const response = await fetch('../../us_state_centroids.json');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        const jsonData: StateFeatureCollection = await response.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const stateFeatures = useMemo(() => {
    return data?.features || [];
  }, [data]);

  // Debug logging
  console.log('MainView Debug:', {
    isLoading,
    error,
    featuresCount: stateFeatures?.length,
  });

  return (
    <div className="flex h-full w-full">
      {/* Left half - MapView */}
      <div className="w-1/2 h-full">
        {isLoading ? (
          <SpinnerPane className="h-full w-full" />
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="p-4 bg-red-100 border border-red-400 rounded">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : stateFeatures && stateFeatures.length > 0 ? (
          <MapView stateFeatures={stateFeatures} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p>No state data available</p>
              <p className="text-sm text-gray-500 mt-2">
                Data loaded: {data ? 'Yes' : 'No'}<br/>
                Features: {stateFeatures?.length || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right half - Additional content */}
      <div className="w-1/2 h-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))] p-6 overflow-y-auto custom-scrollbar">
          <CovidCharts /> 
      </div>
    </div>
  );
};