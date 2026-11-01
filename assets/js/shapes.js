/* shapes.js: the eight shapes, drawn as SVG on a 100x100 grid.
   Shapes use currentColor, so set `color` on the element (or its parent) to colour them. */

export const SHAPES = ['square', 'circle', 'cross', 'diamond', 'heart', 'star', 'rectangle', 'triangle'];

export const SHAPE_LABELS = {
  square: 'Square', circle: 'Circle', cross: 'Cross', diamond: 'Diamond',
  heart: 'Heart', star: 'Star', rectangle: 'Rectangle', triangle: 'Triangle',
};

const star = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 46 : 19.5;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(54 + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

const GEOMETRY = {
  square: '<rect x="14" y="14" width="72" height="72" rx="4"/>',
  rectangle: '<rect x="5" y="27" width="90" height="46" rx="4"/>',
  circle: '<circle cx="50" cy="50" r="42"/>',
  triangle: '<polygon points="50,10 93,87 7,87"/>',
  diamond: '<polygon points="50,5 93,50 50,95 7,50"/>',
  cross: '<polygon points="35,9 65,9 65,35 91,35 91,65 65,65 65,91 35,91 35,65 9,65 9,35 35,35"/>',
  heart: '<path d="M50 90 C22 69 8 51 8 33 C8 19 19 9 32 9 C40 9 47 13 50 20 C53 13 60 9 68 9 C81 9 92 19 92 33 C92 51 78 69 50 90 Z"/>',
  star: `<polygon points="${star}"/>`,
};

/* A small outline of the same colour rounds the corners. */
export function shapeSVG(name, { cls = 'shape-svg', fill = 'currentColor' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">` +
    `<g fill="${fill}" stroke="${fill}" stroke-width="4" stroke-linejoin="round">${GEOMETRY[name]}</g></svg>`;
}
