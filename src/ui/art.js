// Hand-drawn SVG pieces: the corduroy bunny and the HDB block whose windows light up.

export const BLOCK_FLOORS = 8;
export const BLOCK_UNITS = 4;
export const BLOCK_WINDOWS = BLOCK_FLOORS * BLOCK_UNITS;

let patternCount = 0;

/**
 * A corduroy bunny holding a coin. Without a colour it takes its fabric from the nearest
 * [data-color] around it, so a card's bunny follows the card's colour.
 */
export function bunnySVG(color) {
  const patternId = `cord-${patternCount++}`;
  const fabric = `style="fill: url(#${patternId})"`;
  const ownColor = color ? ` data-color="${color}"` : '';
  return `<svg class="bunny" viewBox="0 0 64 64" aria-hidden="true"${ownColor}>
    <defs>
      <pattern id="${patternId}" width="3" height="3" patternUnits="userSpaceOnUse">
        <rect class="cord-base" width="3" height="3" />
        <rect class="cord-rib" width="1.2" height="3" />
        <rect class="cord-groove" x="2.4" width="0.6" height="3" />
      </pattern>
    </defs>
    <rect class="bunny-fabric" ${fabric} x="17" y="2" width="11" height="28" rx="5.5" transform="rotate(-10 22 30)" />
    <rect class="bunny-inner" x="20" y="7" width="5" height="18" rx="2.5" transform="rotate(-10 22 30)" />
    <path class="bunny-fabric" ${fabric} d="M37 26 C38 10 50 4 57 9 C62 13 58 21 46 27 Z" />
    <ellipse class="bunny-fabric" ${fabric} cx="32" cy="38" rx="19" ry="17" />
    <path class="bunny-line" d="M22 37 q3 -3.5 6 0 M36 37 q3 -3.5 6 0" />
    <ellipse class="bunny-blush" cx="21" cy="43" rx="3.2" ry="2" />
    <ellipse class="bunny-blush" cx="43" cy="43" rx="3.2" ry="2" />
    <ellipse class="bunny-nose" cx="32" cy="41.5" rx="2.2" ry="1.6" />
    <path class="bunny-line" d="M29 45 q1.5 2 3 0 q1.5 2 3 0" />
    <circle class="bunny-coin" cx="32" cy="56" r="6.5" />
    <path class="bunny-coin-mark" d="M32 52.5 v7" />
    <ellipse class="bunny-fabric" ${fabric} cx="24.5" cy="56" rx="4.5" ry="3.8" />
    <ellipse class="bunny-fabric" ${fabric} cx="39.5" cy="56" rx="4.5" ry="3.8" />
  </svg>`;
}

/** The HDB block's parts. Its windows light up from the bottom floor, left to right. */
export function blockSVG() {
  const parts = [
    '<rect class="ground" x="0" y="232" width="240" height="6" rx="3" />',
    '<rect class="trunk" x="20" y="208" width="4" height="26" rx="2" />',
    '<circle class="tree" cx="22" cy="204" r="16" />',
    '<rect class="trunk" x="216" y="214" width="4" height="20" rx="2" />',
    '<circle class="tree" cx="218" cy="210" r="12" />',
    '<rect class="trim" x="38" y="14" width="164" height="14" rx="5" />',
    '<rect class="wall" x="44" y="26" width="152" height="206" rx="4" />',
    '<rect class="trim" x="44" y="26" width="8" height="172" />',
    '<rect class="trim" x="188" y="26" width="8" height="172" />',
    '<rect class="void" x="52" y="198" width="136" height="34" />',
    '<rect class="wall" x="70" y="198" width="10" height="34" />',
    '<rect class="wall" x="115" y="198" width="10" height="34" />',
    '<rect class="wall" x="160" y="198" width="10" height="34" />',
  ];
  for (let i = 0; i < BLOCK_WINDOWS; i++) {
    const floor = BLOCK_FLOORS - 1 - Math.floor(i / BLOCK_UNITS);
    const unit = i % BLOCK_UNITS;
    parts.push(`<rect class="win" x="${60 + unit * 32}" y="${38 + floor * 20}" width="24" height="12" rx="3" />`);
  }
  return parts.join('');
}
