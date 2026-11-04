export type IconName =
  | 'home'
  | 'plus'
  | 'bookmark'
  | 'settings'
  | 'arrow-left'
  | 'arrow-right'
  | 'map'
  | 'clock'
  | 'pin'
  | 'trash'
  | 'edit'
  | 'check'
  | 'navigation'
  | 'external'
  | 'store'
  | 'arrow-up'
  | 'arrow-down'
  | 'copy'
  | 'download'
  | 'upload'
  | 'shield'
  | 'heart'
  | 'sparkle'
  | 'coffee'
  | 'utensils'
  | 'leaf'
  | 'film'
  | 'bag'
  | 'gamepad'
  | 'palette'
  | 'walk'
  | 'train'
  | 'bus'
  | 'motorbike'
  | 'car'
  | 'shuffle'
  | 'calendar'
  | 'wallet'
  | 'chevron-left'
  | 'chevron-right'
  | 'sun'
  | 'sunset'
  | 'moon'
  | 'star'
  | 'compass'
  | 'flower'
  | 'refresh'
  | 'sliders'
  | 'building';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  plus: 'M12 5v14M5 12h14',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  check: 'M5 12.5 10 17 19 7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5l2 2M15.5 15.5l2 2M6.5 17.5l2-2M15.5 8.5l2-2',
  coffee: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3',
  utensils: 'M6 3v8a2 2 0 0 0 2 2v8M10 3v8M8 3v6M16 21V3c2.5 1.5 3 4 3 7h-3',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c3-4 6-6 9-8',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  gamepad: 'M7 9h10a4 4 0 0 1 3.9 4.8l-.6 2.6a2 2 0 0 1-3.5.7L15 15H9l-1.8 2.1a2 2 0 0 1-3.5-.7l-.6-2.6A4 4 0 0 1 7 9zM8 11.5v3M6.5 13h3M15.5 12.5h.01M17.5 13.5h.01',
  palette: 'M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.2-4-7.5-9-7.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  walk: 'M13 4.5a1.5 1.5 0 1 0 0-.01M10 21l2-6 3 3v3M12 15l-1-5 4 2 2 3M11 10l-3 2v3',
  train: 'M7 3h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM5 10h14M8 21l2-4M16 21l-2-4M8.5 13.5h.01M15.5 13.5h.01',
  bus: 'M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11H5zM5 11h14M7 17v3M17 17v3M8 14h.01M16 14h.01',
  motorbike: 'M5 17.5a2.5 2.5 0 1 0 0-.01M19 17.5a2.5 2.5 0 1 0 0-.01M7.5 17.5h7l3-6H14l-2-3H9M14 11.5l-4 6',
  car: 'M5 13l1.5-5A2 2 0 0 1 8.4 6.5h7.2a2 2 0 0 1 1.9 1.5L19 13M4 13h16v4H4zM7 17v2M17 17v2M7.5 15h.01M16.5 15h.01',
  shuffle: 'M4 7h3c4 0 6 10 10 10h3M4 17h3c1.5 0 2.7-1.4 3.7-3M17 7h3M14 9.5C15 8 16 7 17 7M18 4l3 3-3 3M18 14l3 3-3 3',
  calendar: 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9H6a2 2 0 0 1-2-2zM4 7l11-3v3M16 13h.01',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sunset: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5 11l1.5 1.5M19 11l-1.5 1.5M9 7l3-3 3 3',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  star: 'M12 3l2.6 5.6 6 .6-4.5 4.1 1.3 6L12 16.3 6.6 19.3l1.3-6L3.4 9.2l6-.6z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  flower: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 9V4M12 15v5M9 12H4M15 12h5M9.9 9.9 6.3 6.3M14.1 14.1l3.6 3.6M9.9 14.1l-3.6 3.6M14.1 9.9l3.6-3.6',
  refresh: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  building: 'M5 21V5l7-2v18M12 8l7 2v11M8 8h.01M8 12h.01M8 16h.01M15 13h.01M15 17h.01M3 21h18',
  navigation: 'M3 11 21 3l-8 18-2-8z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  store: 'M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6',
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
