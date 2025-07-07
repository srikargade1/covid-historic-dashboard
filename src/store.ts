import {
  BaseRoomConfig,
  createRoomShellSlice,
  createRoomStore,
  RoomShellSliceState,
} from '@sqlrooms/room-shell';
import {MapIcon} from 'lucide-react';
import {z} from 'zod';
import {MainView} from './components/MainView';
import {
  createDefaultSqlEditorConfig,
  createSqlEditorSlice,
  SqlEditorSliceConfig,
  SqlEditorSliceState,
} from '@sqlrooms/sql-editor';
import Random from './components/Random';

/**
 * Room config schema is the part of the app state meant for saving.
 */
export const RoomConfig = BaseRoomConfig.merge(SqlEditorSliceConfig)
export type RoomConfig = z.infer<typeof RoomConfig>;

/**
 * The whole app state.
 */
export type RoomState = RoomShellSliceState<RoomConfig> & {
  // Add your app state here
} & SqlEditorSliceState;

/**
 * Create the room store. You can combine your custom state and logic
 * with the slices from the SQLRooms modules.
 */
export const {roomStore, useRoomStore} = createRoomStore<RoomConfig, RoomState>(
  (set, get, store) => ({
    ...createRoomShellSlice<RoomConfig>({
      config: {
        title: 'Minimal SQLRooms App',
        dataSources: [
          {
            tableName: 'covid_2020',
            type: 'url',
            url: '../data/covid_2020.csv',
          },
          {
            tableName: 'covid_2021',
            type: 'url',
            url: '../data/covid_2021.csv',
          },
          {
            tableName: 'covid_2022',
            type: 'url',
            url: '../data/covid_2022.csv',
          },
          {
            tableName: 'covid_2023',
            type: 'url',
            url: '../data/covid_2023.csv',
          },
        ],
        ...createDefaultSqlEditorConfig(),
      },
      room: {
        panels: {
          // For the minimal example we only define the main panel, no side panels
          main: {
            title: 'Main view',
            icon: MapIcon,
            component: MainView,
            placement: 'main',
          },
        },
      },
    })(set, get, store),
    ...createSqlEditorSlice()(set, get, store),
  }),
);
