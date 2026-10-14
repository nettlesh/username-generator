// An original pixel-art flying saucer, drawn row by row, over a faint beam. Each frame moves every
// light one pixel along the rim, so as the page steps through them the saucer spins.
const saucer = [
  ".....####.....",
  "....######....",
  ".############.",
  "##############",
  "..##########..",
];
const lights = ["..#..#..#..#..", "...#..#..#....", "....#..#..#..."];
const beam = [
  ".....####.....",
  "....######....",
  "...########...",
  "..##########..",
  ".############.",
];
const rim = 3;
const width = saucer[0].length;

// The frames of lights are stacked from the rim down and clipped to it; the page slides the stack
// up one row at a time to show each in turn.
export const sprite =
  `<svg viewBox="0 0 ${width} ${saucer.length + beam.length}" shape-rendering="crispEdges">` +
  `<clipPath id="ufo-rim"><rect y="${rim}" width="${width}" height="1" /></clipPath>` +
  `<g class="beam">${pixels(beam, saucer.length)}</g>` +
  `<g class="saucer">${pixels(saucer, 0)}<g clip-path="url(#ufo-rim)">` +
  `<g class="lights" style="--frames: ${lights.length}">${pixels(lights, rim)}</g>` +
  `</g></g></svg>`;

/** Draws each run of `#` as one rectangle. */
function pixels(rows: string[], top: number): string {
  return rows
    .flatMap((row, y) =>
      [...row.matchAll(/#+/g)].map(
        (run) => `<rect x="${run.index}" y="${top + y}" width="${run[0].length}" height="1" />`,
      ),
    )
    .join("");
}
