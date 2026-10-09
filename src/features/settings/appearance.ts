export const APPEARANCE_KEY = 'devorbit.appearance.v1'
export const modes = ['light', 'dark', 'system'] as const
export type AppearanceMode = (typeof modes)[number]
export type ResolvedTheme = 'light' | 'dark'

// Pastel fills keep dark text readable on buttons and on the favicon.
// Text colors are separate, darker shades for links on light surfaces.
export const accents = {
  green: {
    name: 'Green',
    fill: '#c0f2ad',
    text: '#416333',
    solid: '#6c9557',
    planetHue: 60,
  },
  red: {
    name: 'Red',
    fill: '#f5adb4',
    text: '#963d4a',
    solid: '#be5362',
    planetHue: 310,
  },
  orange: {
    name: 'Orange',
    fill: '#f6c08c',
    text: '#885020',
    solid: '#b77634',
    planetHue: 350,
  },
  yellow: {
    name: 'Yellow',
    fill: '#f2d779',
    text: '#756016',
    solid: '#9a812b',
    planetHue: 10,
  },
  blue: {
    name: 'Blue',
    fill: '#a9cff7',
    text: '#315f96',
    solid: '#4e86bd',
    planetHue: 180,
  },
  purple: {
    name: 'Purple',
    fill: '#e1b3ef',
    text: '#7c418d',
    solid: '#a15db3',
    planetHue: 250,
  },
  violet: {
    name: 'Violet',
    fill: '#c6b7fa',
    text: '#604699',
    solid: '#8665bf',
    planetHue: 210,
  },
} as const
export type AccentColor = keyof typeof accents
export const accentNames = Object.keys(accents) as AccentColor[]
export interface Appearance {
  version: 1
  mode: AppearanceMode
  accent: AccentColor
}
export const defaultAppearance: Appearance = {
  version: 1,
  mode: 'system',
  accent: 'green',
}

export function readAppearance(): { preferences: Appearance; error: string } {
  try {
    const stored = localStorage.getItem(APPEARANCE_KEY)
    if (!stored) return { preferences: defaultAppearance, error: '' }
    const value: unknown = JSON.parse(stored)
    if (
      value &&
      typeof value === 'object' &&
      'version' in value &&
      value.version === 1 &&
      'mode' in value &&
      modes.includes(value.mode as AppearanceMode) &&
      'accent' in value &&
      accentNames.includes(value.accent as AccentColor)
    ) {
      return {
        preferences: {
          version: 1,
          mode: value.mode as AppearanceMode,
          accent: value.accent as AccentColor,
        },
        error: '',
      }
    }
    return {
      preferences: defaultAppearance,
      error:
        'Saved appearance preferences could not be read. Choose an appearance to save new preferences.',
    }
  } catch {
    return {
      preferences: defaultAppearance,
      error:
        'Appearance preferences could not be loaded. You can still personalize this session.',
    }
  }
}

export function applyAppearance(
  preferences: Appearance,
  systemDark: boolean,
): ResolvedTheme {
  const theme =
    preferences.mode === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : preferences.mode
  const palette = accents[preferences.accent]
  const root = document.documentElement
  root.dataset.theme = theme
  root.dataset.appearance = preferences.mode
  root.dataset.accent = preferences.accent
  root.style.setProperty('--accent', palette.fill)
  root.style.setProperty('--accent-light-text', palette.text)
  root.style.setProperty('--accent-solid', palette.solid)
  root.style.setProperty('--planet-hue', `${palette.planetHue}deg`)
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (icon) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="12" fill="${palette.fill}"/><circle cx="20" cy="20" r="7" fill="#182028"/><ellipse cx="20" cy="20" rx="16" ry="11" transform="rotate(-35 20 20)" fill="none" stroke="#182028" stroke-width="2"/></svg>`
    icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
  }
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#111418' : '#f7f8f5')
  return theme
}
