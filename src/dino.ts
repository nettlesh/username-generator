// An original pixel-art dinosaur, drawn row by row, facing right. It has two frames of legs,
// which the page alternates so it runs.
const body = [
  ".........######.",
  "........##.#####",
  "........########",
  "........########",
  "........####....",
  "........######..",
  "#......#####....",
  "#.....#######...",
  "##...#########..",
  "###.########.#..",
  "###########.....",
  ".#########......",
  "..#######.......",
  "...#####........",
];
const legs = [
  ["...##..#........", "...#...##......."],
  ["....#.##........", "....##..#......."],
];

export const dino =
  `<svg viewBox="0 0 16 16" shape-rendering="crispEdges">${pixels(body, 0)}` +
  legs.map((frame) => `<g class="legs">${pixels(frame, body.length)}</g>`).join("") +
  `</svg>`;

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
