import { useRoomStore } from '../store';
import { useSql } from '@sqlrooms/duckdb';
import {
  ChartContainer,
  LineChart,
  BarChart,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Bar,
  Scatter,
  ResponsiveContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@sqlrooms/recharts';
import { SpinnerPane } from '@sqlrooms/ui';

function normalize<T extends Record<string, any>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
  ) as T;
}

export default function CovidCharts() {
  const hasAllTables = useRoomStore((s) =>
    s.db.findTableByName('covid_2020') &&
    s.db.findTableByName('covid_2021') &&
    s.db.findTableByName('covid_2022') &&
    s.db.findTableByName('covid_2023')
  );

  const nationalQuery = useSql<{ year: number; new_cases: number; new_deaths: number }>({
    query: `
      SELECT * FROM (
        SELECT 2020 AS year, SUM(new_cases) AS new_cases, SUM(new_deaths) AS new_deaths FROM covid_2020
        UNION ALL
        SELECT 2021, SUM(new_cases), SUM(new_deaths) FROM covid_2021
        UNION ALL
        SELECT 2022, SUM(new_cases), SUM(new_deaths) FROM covid_2022
        UNION ALL
        SELECT 2023, SUM(new_cases), SUM(new_deaths) FROM covid_2023
      ) ORDER BY year
    `,
    enabled: !!hasAllTables,
  });

  const topStatesQuery = useSql<{ state: string; total_deaths: number }>({
    query: `
      SELECT state, SUM(new_deaths) AS total_deaths
      FROM (
        SELECT state, new_deaths FROM covid_2020
        UNION ALL SELECT state, new_deaths FROM covid_2021
        UNION ALL SELECT state, new_deaths FROM covid_2022
        UNION ALL SELECT state, new_deaths FROM covid_2023
      )
      GROUP BY state
      ORDER BY total_deaths DESC
      LIMIT 10
    `,
    enabled: !!hasAllTables,
  });

  const scatterQuery = (year: number) =>
    useSql<{ state: string; new_cases: number; new_deaths: number }>({
      query: `SELECT state, new_cases, new_deaths FROM covid_${year}`,
      enabled: !!hasAllTables,
    });

  const scatter2020 = scatterQuery(2020);
  const scatter2021 = scatterQuery(2021);
  const scatter2022 = scatterQuery(2022);
  const scatter2023 = scatterQuery(2023);

  if (
    !hasAllTables ||
    nationalQuery.isLoading ||
    topStatesQuery.isLoading ||
    scatter2020.isLoading ||
    scatter2021.isLoading ||
    scatter2022.isLoading ||
    scatter2023.isLoading
  ) {
    return <SpinnerPane className="h-full w-full" />;
  }

  const nationalData = (nationalQuery.data?.toArray() ?? []).map(normalize);
  const topStatesData = (topStatesQuery.data?.toArray() ?? []).map(normalize);
  const data2020 = (scatter2020.data?.toArray() ?? []).map(normalize);
  const data2021 = (scatter2021.data?.toArray() ?? []).map(normalize);
  const data2022 = (scatter2022.data?.toArray() ?? []).map(normalize);
  const data2023 = (scatter2023.data?.toArray() ?? []).map(normalize);

  const renderScatterPlot = (year: number, data: any[]) => (
    <section>
      <h3 className="text-lg font-semibold mt-6 mb-2">Deaths vs. Cases by State ({year})</h3>
      <ChartContainer
        config={{
          new_cases: { label: `New Cases (${year})`, color: '#10b981' },
          new_deaths: { label: `New Deaths (${year})`, color: '#ef4444' },
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="new_cases" name="New Cases" stroke="#ccc" />
            <YAxis dataKey="new_deaths" name="New Deaths" stroke="#ccc" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-600 rounded p-2 shadow">
                    <div className="font-semibold">{payload[0].payload.state}</div>
                    <div>New Cases: {payload[0].payload.new_cases}</div>
                    <div>New Deaths: {payload[0].payload.new_deaths}</div>
                  </div>
                ) : null
              }
            />
            <Scatter data={data} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
        In {year}, different states exhibited varying degrees of fatality despite similar caseloads. This chart highlights those disparities.
      </p>
    </section>
  );

  return (
    <div className="w-full h-full p-6 space-y-10 overflow-y-auto scrollbar-thin scrollbar-thumb-[hsl(var(--border))] scrollbar-track-transparent bg-[hsl(var(--background))] text-[hsl(var(--foreground))] border-none">
      <section>
        <h2 className="text-2xl font-bold mb-2">Remembering the Impact of COVID-19 (2020–2023)</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          COVID-19 was one of the most disastrous global events in recent memory. It affected millions across the U.S.
          with far-reaching health, economic, and social consequences. This dashboard is designed to reflect and remember
          the pandemic’s scale from 2020 to 2023 by visualizing patterns and disparities in case counts and fatalities.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mt-4 mb-2">1. National Case and Death Trends</h3>
        <ChartContainer
          config={{
            new_cases: { label: 'New Cases', color: '#3b82f6' },
            new_deaths: { label: 'New Deaths', color: '#ef4444' },
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={nationalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="year" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="new_cases" stroke="#3b82f6" />
              <Line type="monotone" dataKey="new_deaths" stroke="#ef4444" />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
          2021 saw the highest fatalities, whereas 2022 reported the most cases.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mt-4 mb-2">2. Top 10 States by Total Deaths</h3>
        <ChartContainer
          config={{
            total_deaths: { label: 'Total Deaths', color: '#6366f1' },
          }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" data={topStatesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis type="number" stroke="#ccc" />
              <YAxis dataKey="state" type="category" stroke="#ccc" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total_deaths" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
          Urban centers and early-affected regions like New York and California reported the highest fatality totals.
        </p>
      </section>

      {renderScatterPlot(2020, data2020)}
      {renderScatterPlot(2021, data2021)}
      {renderScatterPlot(2022, data2022)}
      {renderScatterPlot(2023, data2023)}

      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Conclusion</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          The COVID-19 pandemic reshaped global and local public health policy. These visualizations serve
          as a reminder of the urgency for preparedness, equitable healthcare, and transparent data during crises.
        </p>
      </section>
    </div>
  );
}
