// ─── Theme Customizer helpers ─────────────────────────────────────────────────

export const TC_DEFAULTS = { accent: '#6366f1', radius: 6 };
export const TC_LS_KEY   = 'lf-docs-theme-customizer';

export interface TCState { accent: string; radius: number }

export function loadTC(): TCState {
  try {
    const raw = localStorage.getItem(TC_LS_KEY);
    if (raw) return { ...TC_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...TC_DEFAULTS };
}

export function saveTC(s: TCState): void {
  try { localStorage.setItem(TC_LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** Convert a hex color to an HSL-lightened hex (pure, no deps). */
export function lighten(hex: string, amount: number): string {
  let r: number, g: number, b: number;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h.charAt(0) + h.charAt(0), 16);
    g = parseInt(h.charAt(1) + h.charAt(1), 16);
    b = parseInt(h.charAt(2) + h.charAt(2), 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let hh = 0, ss = 0;
  if (d !== 0) {
    ss = d / (1 - Math.abs(2 * l - 1));
    if (max === rn)      hh = ((gn - bn) / d + 6) % 6;
    else if (max === gn) hh = (bn - rn) / d + 2;
    else                 hh = (rn - gn) / d + 4;
    hh /= 6;
  }
  const l2 = Math.min(1, l + amount / 100);
  const hue2rgb = (p: number, q: number, t: number) => {
    const tt = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (tt < 1/6) return p + (q - p) * 6 * tt;
    if (tt < 1/2) return q;
    if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
    return p;
  };
  const q2 = l2 < 0.5 ? l2 * (1 + ss) : l2 + ss - l2 * ss;
  const p2 = 2 * l2 - q2;
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p2, q2, hh + 1/3))}${toHex(hue2rgb(p2, q2, hh))}${toHex(hue2rgb(p2, q2, hh - 1/3))}`;
}

export const TC_SWATCHES = [
  { color: '#6366f1', label: 'Indigo'   },
  { color: '#8b5cf6', label: 'Violet'   },
  { color: '#3b82f6', label: 'Blue'     },
  { color: '#10b981', label: 'Emerald'  },
  { color: '#f59e0b', label: 'Amber'    },
  { color: '#ef4444', label: 'Red'      },
  { color: '#ec4899', label: 'Pink'     },
  { color: '#14b8a6', label: 'Teal'     },
];
