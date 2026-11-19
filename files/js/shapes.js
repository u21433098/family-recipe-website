// Bauhaus-style shapes, one per category. Returns an SVG string (100×100).
export function shape(name, fg, bg = "transparent") {
  const s = {
    dots: `<circle cx="27" cy="27" r="23" fill="${fg}"/><circle cx="73" cy="27" r="23" fill="${fg}"/><circle cx="27" cy="73" r="23" fill="${fg}"/><circle cx="73" cy="73" r="23" fill="${fg}"/>`,
    triangle: `<path d="M0 0 L100 100 L0 100 Z" fill="${fg}"/>`,
    half: `<path d="M8 70 A42 42 0 0 1 92 70 Z" fill="${fg}"/><rect x="8" y="78" width="84" height="12" fill="${fg}"/>`,
    ring: `<circle cx="50" cy="50" r="34" fill="none" stroke="${fg}" stroke-width="22"/><circle cx="50" cy="50" r="10" fill="${fg}"/>`,
    frame: `<rect x="16" y="16" width="68" height="68" fill="none" stroke="${fg}" stroke-width="14"/>`,
    star: `<path d="M50 4 L60 36 L94 30 L70 54 L88 86 L56 72 L50 96 L44 72 L12 86 L30 54 L6 30 L40 36 Z" fill="${fg}"/>`,
    leaf: `<path d="M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z" fill="${fg}"/>`,
    beads: `<path d="M4 50 A15 15 0 0 1 34 50 Z M35 50 A15 15 0 0 1 65 50 Z M66 50 A15 15 0 0 1 96 50 Z" fill="${fg}"/><path d="M4 50 A15 15 0 0 0 34 50 Z M35 50 A15 15 0 0 0 65 50 Z M66 50 A15 15 0 0 0 96 50 Z" fill="${fg}" opacity=".45"/>`,
    pinwheel: `<path d="M0 0 L50 0 L50 50 Z M100 0 L100 50 L50 50 Z M100 100 L50 100 L50 50 Z M0 100 L0 50 L50 50 Z" fill="${fg}"/>`,
  }[name] || "";
  return `<svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><rect width="100" height="100" fill="${bg}"/>${s}</svg>`;
}
