/** Returns a uniformly random integer from 0 to n - 1. */
export type Random = (n: number) => number;

export type Range = { min: number; max: number };

/** How many characters go in a position, and the characters they're drawn from. */
export type Slot = Range & { characters: string };

export type Join = "and" | "or";

export type Options = {
  words: Range;
  case: "lower" | "capitalized" | "upper" | "random";
  leetspeak: boolean;
  /** A separator such as "-" draws from that one character, so a count of 2 is "--". */
  between: Slot;
  start: Slot;
  end: Slot;
  /** How many spots inside the words take characters; inside is how many go in each spot. */
  spots: Range;
  inside: Slot;
  /** How start, end and inside combine, read as "start [0] end, [1] inside". */
  joins: [Join, Join];
};

/** The options that are counts, each set with a slider. */
export type Count = "words" | "between" | "start" | "end" | "spots" | "inside";

// GitHub's 39 is the longest username limit among major sites. No username is longer than the
// characters limit: every count is kept within it, so only the words give way.
export const limits = { words: 5, characters: 40 };

/** The shortest and longest of the words drawn from. */
export type Lengths = { shortest: number; longest: number };

/**
 * A username's random choices, kept apart from how it's written, so changing the case or leetspeak
 * rewrites the same username instead of drawing another.
 */
export type Draft = {
  /** Each word as listed, and with a random case drawn for each letter. */
  words: { lower: string; mixed: string }[];
  between: string[];
  start: string;
  end: string;
  /** The blocks of characters inside the words, and the word and offset each goes at. */
  inside: string[];
  spots: { word: number; at: number }[];
};

/** The parts of a draft that a change of options redraws. */
export type Part = "words" | "between" | "places";

/**
 * Draws a username. Given the last draft and the parts whose options changed since, it keeps the
 * other parts, and draws the words again only if they no longer fit.
 */
export function draw(
  options: Options,
  words: string[],
  random: Random,
  last?: { draft: Draft; changed: Part[] },
): Draft {
  check(options, words);
  // Counts can all come out 0, so an empty username is drawn again, from scratch.
  for (let prior = last; ; prior = undefined) {
    const draft = compose(options, words, random, prior);
    if (format(draft, options)) return draft;
  }
}

export function format(draft: Draft, options: Options): string {
  const words = draft.words.map((word) => shape(word, options));
  // Blocks go in from the end of each word, so the offsets before them still hold.
  const blocks = draft.spots
    .map((spot, i) => ({ ...spot, text: draft.inside[i] }))
    .sort((a, b) => b.at - a.at);
  for (const { word, at, text } of blocks) {
    words[word] = words[word].slice(0, at) + text + words[word].slice(at);
  }
  return (
    draft.start +
    words.map((word, i) => (i ? draft.between[i - 1] : "") + word).join("") +
    draft.end
  );
}

/** Returns the shortest and longest words, which the limits on counts are worked out from. */
export function measure(words: string[]): Lengths {
  if (!words.length) return { shortest: 0, longest: 0 };
  let shortest = Infinity;
  let longest = 0;
  for (const word of words) {
    shortest = Math.min(shortest, word.length);
    longest = Math.max(longest, word.length);
  }
  return { shortest, longest };
}

/**
 * The longest username the counts can make. Keeping it within the limit means every draw fits, so
 * no count is ever cut short. Given the current words, it counts their letters, so a count can't
 * take the room they use; otherwise it counts the most words at their shortest, since words are
 * drawn to fit the room the counts leave.
 */
export function need(options: Options, { shortest, longest }: Lengths, current?: string[]): number {
  const n = current ? current.length : options.words.max;
  const sets = outcomes(options, n > 0);
  // Every outcome has to fit beside the same words, so they leave room for the largest.
  const spots = sets.some((set) => set.includes("inside")) ? options.spots.max : 0;
  // Each spot takes its own gap between two letters.
  const gaps = current
    ? sum(current.map((word) => word.length - 1))
    : Math.max(1, options.words.min) * (longest - 1);
  if (spots > 0 && spots > gaps) return Infinity;
  return (
    (current ? sum(current.map((word) => word.length)) : letters(n, spots, shortest)) +
    Math.max(0, n - 1) * options.between.max +
    Math.max(...sets.map((set) => size(options, set, "max")))
  );
}

/** The shortest and longest usernames the options can make. */
export function span(options: Options, { shortest, longest }: Lengths): Range {
  const { min, max } = options.words;
  const sets = outcomes(options);
  const low = sets.map((set) => {
    // Without words, a draw has nowhere inside to put characters.
    const placed = min > 0 ? set : set.filter((place) => place !== "inside");
    return (
      letters(min, placed.includes("inside") ? options.spots.min : 0, shortest) +
      Math.max(0, min - 1) * options.between.min +
      size(options, placed, "min")
    );
  });
  const high = sets.map(
    (set) => max * longest + Math.max(0, max - 1) * options.between.max + size(options, set, "max"),
  );
  // An empty draw is drawn again, so no username is shorter than 1.
  return {
    min: Math.max(1, Math.min(...low)),
    max: Math.min(Math.max(...high), limits.characters),
  };
}

/** The highest a count can go with the rest as they are, so every draw still fits the limit. */
export function room(options: Options, count: Count, lengths: Lengths, current?: string[]): number {
  const limit = count === "words" ? limits.words : limits.characters;
  for (let max = limit; max > 0; max--) {
    const min = Math.min(options[count].min, max);
    if (need(adjust(options, count, { min, max }), lengths, current) <= limits.characters) {
      return max;
    }
  }
  return 0;
}

/**
 * The highest a count can go if every other count gives way, down to its minimum. Given the
 * current words, they stay as they are, so the number of words doesn't give way either.
 */
export function reach(
  options: Options,
  count: Count,
  lengths: Lengths,
  current?: string[],
): number {
  const lowered = lowest(options, count);
  return room(current ? { ...lowered, words: options.words } : lowered, count, lengths, current);
}

/**
 * Lowers the highest counts until every draw fits the limit: the largest count of characters
 * first, then the separator, then the number of words. No count goes below its minimum, the count
 * being set, if any, keeps its value, and given the current words, they stay as they are.
 */
export function fit(options: Options, lengths: Lengths, keep?: Count, current?: string[]): Options {
  let fitted = options;
  const partner = keep && partners[keep];
  while (need(fitted, lengths, current) > limits.characters) {
    const used = (["start", "end", "spots", "inside"] as const).filter((count) =>
      on(fitted, count === "spots" ? "inside" : count),
    );
    // Spots and per spot are one place, so one never gives way to the other. Nor does per spot go
    // below 1 here, which would switch inside off rather than shrink it; fewer spots shrink it.
    const lowers = (count: Count) =>
      count !== keep &&
      count !== partner &&
      fitted[count].max > Math.max(fitted[count].min, count === "inside" ? 1 : 0);
    const lowerable = used.filter(lowers);
    const count: Count | undefined = lowerable.length
      ? lowerable.reduce((a, b) => (fitted[b].max > fitted[a].max ? b : a))
      : lowers("between")
        ? "between"
        : !current && lowers("words")
          ? "words"
          : undefined;
    if (!count) break;
    fitted = adjust(fitted, count, { min: fitted[count].min, max: fitted[count].max - 1 });
  }
  return fitted;
}

/** The shortest the longest username can be, with every count at its minimum. */
export function least(options: Options, lengths: Lengths): number {
  return Math.max(1, need(lowest(options), lengths));
}

export function randomInt(n: number): number {
  // Redrawing values at or above the largest multiple of n keeps every result equally likely.
  const limit = 2 ** 32 - (2 ** 32 % n);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= limit);
  return value[0] % n;
}

type Place = "start" | "end" | "inside";

const counts: Count[] = ["words", "between", "start", "end", "spots", "inside"];

/** Throws a message the page can show when the options can't produce a username. */
function check(options: Options, words: string[]) {
  const names: Record<Count, string> = {
    words: "Words",
    between: "Between words",
    start: "Start",
    end: "End",
    spots: "Inside spots",
    inside: "Inside",
  };
  for (const count of counts) {
    const { min, max } = options[count];
    const limit = count === "words" ? limits.words : limits.characters;
    if (![min, max].every(Number.isInteger) || min < 0 || max > limit) {
      throw new RangeError(`${names[count]}: choose a whole number from 0 to ${limit}`);
    }
    if (min > max) throw new RangeError(`${names[count]}: the minimum is above the maximum`);
  }
  // Separators need two words, and inside needs one; otherwise they're left out.
  const slots = (["between", "start", "end", "inside"] as const).filter(
    (slot) =>
      (slot !== "between" || options.words.max >= 2) && (slot !== "inside" || on(options, slot)),
  );
  for (const slot of slots) {
    const { max, characters } = options[slot];
    if (max > 0 && !characters) throw new RangeError(`${names[slot]}: choose some characters`);
  }
  if (options.words.max > 0 && words.length === 0) throw new RangeError("Words: choose a list");
  if (Math.max(options.words.max, options.start.max, options.end.max) === 0) {
    throw new RangeError("Choose words or characters to generate");
  }
  if (need(options, measure(words)) > limits.characters) {
    throw new RangeError(`These options don't fit in ${limits.characters} characters`);
  }
}

function on(options: Options, place: Place): boolean {
  return place === "inside"
    ? options.words.max > 0 && options.spots.max > 0 && options.inside.max > 0
    : options[place].max > 0;
}

/**
 * The sets of places a draw can use, each as likely: "and" takes both sides and "or" either one.
 * The first join pairs start and end before the second brings in inside, as a comma would.
 */
function outcomes(options: Options, hasWords = true): Place[][] {
  const one = (place: Place) =>
    on(options, place) && (hasWords || place !== "inside") ? [[place]] : [];
  const join = (a: Place[][], b: Place[][], how: Join) =>
    !a.length
      ? b
      : !b.length
        ? a
        : how === "and"
          ? a.flatMap((x) => b.map((y) => [...x, ...y]))
          : [...a, ...b];
  const [first, second] = options.joins;
  const sets = join(join(one("start"), one("end"), first), one("inside"), second);
  return sets.length ? sets : [[]];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** The fewest letters n words can have, leaving a gap between two letters for every spot. */
function letters(n: number, spots: number, shortest: number): number {
  return n === 0 ? 0 : Math.max(n * shortest, n + spots);
}

/** The characters a set of places adds, at its fewest or most. */
function size(options: Options, set: Place[], end: "min" | "max"): number {
  return set.reduce(
    (total, place) =>
      total + (place === "inside" ? options.spots[end] * options.inside[end] : options[place][end]),
    0,
  );
}

/** The counts that make up one place together: inside's spots, and the characters in each. */
const partners: Partial<Record<Count, Count>> = { spots: "inside", inside: "spots" };

/** The options with every count at its minimum, but the one kept and its partner. */
function lowest(options: Options, keep?: Count): Options {
  let lowered = options;
  const partner = keep && partners[keep];
  for (const count of counts) {
    if (count !== keep && count !== partner) {
      lowered = adjust(lowered, count, { min: options[count].min, max: options[count].min });
    }
  }
  return lowered;
}

function adjust(options: Options, count: Count, range: Range): Options {
  return { ...options, [count]: { ...options[count], ...range } };
}

/**
 * Draws one username's parts. The number of words comes first, since a draw with no words has
 * nowhere inside to put characters.
 */
function compose(
  options: Options,
  words: string[],
  random: Random,
  prior?: { draft: Draft; changed: Part[] },
): Draft {
  const keepsWords = prior !== undefined && !prior.changed.includes("words");
  const n = keepsWords ? prior.draft.words.length : count(options.words, random);
  const keepsPlaces =
    prior !== undefined &&
    !prior.changed.includes("places") &&
    (n > 0 || !prior.draft.inside.length);
  const placed = keepsPlaces ? prior.draft : place(options, n > 0, random);
  let kept: Pick<Draft, "words" | "between"> | undefined;
  if (keepsWords) {
    const between = prior.changed.includes("between")
      ? prior.draft.words.slice(1).map(() => fill(options.between, random))
      : prior.draft.between;
    kept = { words: prior.draft.words, between };
  }
  const fits =
    kept &&
    need(
      options,
      measure(words),
      kept.words.map((word) => word.lower),
    ) <= limits.characters;
  const chosen = kept && fits ? kept : choose(options, words, n, random);
  return {
    ...chosen,
    start: placed.start,
    end: placed.end,
    inside: placed.inside,
    spots:
      keepsPlaces && chosen === kept
        ? prior.draft.spots
        : position(chosen.words, placed.inside.length, random),
  };
}

/** Draws the characters at the start, end and inside, for one of the outcomes. */
function place(
  options: Options,
  hasWords: boolean,
  random: Random,
): Pick<Draft, "start" | "end" | "inside"> {
  const set = pick(outcomes(options, hasWords), random);
  return {
    start: set.includes("start") ? fill(options.start, random) : "",
    end: set.includes("end") ? fill(options.end, random) : "",
    inside: set.includes("inside")
      ? Array.from({ length: count(options.spots, random) }, () => fill(options.inside, random))
      : [],
  };
}

/**
 * Draws the words and separators in the room every count at its most leaves, so the words fit
 * whatever the counts draw, now or later. Each word is drawn from those short enough to leave the
 * rest room, and long enough to leave every spot a gap.
 */
function choose(
  options: Options,
  words: string[],
  n: number,
  random: Random,
): Pick<Draft, "words" | "between"> {
  const { shortest, longest } = measure(words);
  const between = Array.from({ length: Math.max(0, n - 1) }, () => fill(options.between, random));
  const sets = outcomes(options, n > 0);
  let left =
    limits.characters -
    Math.max(0, n - 1) * options.between.max -
    Math.max(...sets.map((set) => size(options, set, "max")));
  let wanted = sets.some((set) => set.includes("inside")) ? options.spots.max : 0;
  const picked: Draft["words"] = [];
  for (let i = 0; i < n; i++) {
    const rest = n - i - 1;
    const fit = words.filter((word) => {
      const after = Math.max(0, wanted - (word.length - 1));
      return (
        word.length + Math.max(rest * shortest, rest + after) <= left &&
        after <= rest * (longest - 1)
      );
    });
    // need() keeps the options within the limit, so some word always fits.
    if (!fit.length) throw new Error("No word fits the room left");
    const lower = pick(fit, random);
    picked.push({
      lower,
      mixed: Array.from(lower, (c) => (random(2) ? c.toUpperCase() : c)).join(""),
    });
    left -= lower.length;
    wanted = Math.max(0, wanted - (lower.length - 1));
  }
  return { words: picked, between };
}

/**
 * Picks a free gap between two letters for each block: first a word, every word as likely whatever
 * its length, then a gap in it.
 */
function position(words: Draft["words"], blocks: number, random: Random): Draft["spots"] {
  const taken = words.map(() => new Set<number>());
  return Array.from({ length: blocks }, () => {
    const open = words.flatMap((word, i) => (taken[i].size < word.lower.length - 1 ? [i] : []));
    const word = pick(open, random);
    const free = Array.from({ length: words[word].lower.length - 1 }, (_, i) => i + 1).filter(
      (at) => !taken[word].has(at),
    );
    const at = pick(free, random);
    taken[word].add(at);
    return { word, at };
  });
}

function shape({ lower, mixed }: Draft["words"][number], options: Options): string {
  const cased =
    options.case === "upper"
      ? lower.toUpperCase()
      : options.case === "capitalized"
        ? lower[0].toUpperCase() + lower.slice(1)
        : options.case === "random"
          ? mixed
          : lower;
  return options.leetspeak ? cased.replace(/[abegiostz]/gi, (c) => leet[c.toLowerCase()]) : cased;
}

function pick<T>(from: ArrayLike<T>, random: Random): T {
  return from[random(from.length)];
}

function count({ min, max }: Range, random: Random): number {
  return min + random(max - min + 1);
}

function fill(slot: Slot, random: Random): string {
  return Array.from({ length: count(slot, random) }, () => pick(slot.characters, random)).join("");
}

const leet: Record<string, string> = {
  a: "4",
  b: "8",
  e: "3",
  g: "6",
  i: "1",
  o: "0",
  s: "5",
  t: "7",
  z: "2",
};
