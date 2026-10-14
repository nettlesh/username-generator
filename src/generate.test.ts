import { describe, expect, test } from "vitest";
import { draw, format, limits, randomInt, separate, type Options, type Random } from "./generate";

const generate = (options: Options, from: string[], random: Random) =>
  format(draw(options, from, random), options);
const first: Random = () => 0;
const last: Random = (n) => n - 1;
const words = ["apple", "tiger"];
const none = { min: 0, max: 0, characters: "" };
const plain: Options = {
  words: { min: 1, max: 1 },
  case: "lower",
  leetspeak: false,
  start: none,
  between: none,
  end: none,
  anywhere: none,
  ends: "both",
};

describe("words", () => {
  test("draws a count from the range and puts the separator between words", () => {
    const options: Options = {
      ...plain,
      words: { min: 1, max: 3 },
      between: { min: 1, max: 1, characters: "-" },
    };
    expect(generate(options, words, first)).toBe("apple");
    expect(generate(options, words, last)).toBe("tiger-tiger-tiger");
  });

  test("applies the case, then leetspeak", () => {
    expect(generate({ ...plain, case: "capitalized" }, words, last)).toBe("Tiger");
    expect(generate({ ...plain, case: "upper" }, words, last)).toBe("TIGER");
    expect(generate({ ...plain, case: "random" }, words, last)).toBe("TIGER");
    expect(generate({ ...plain, case: "random" }, words, first)).toBe("apple");
    expect(generate({ ...plain, case: "capitalized", leetspeak: true }, words, last)).toBe("7163r");
  });

  test("draws characters between words for each gap", () => {
    const between = { min: 0, max: 2, characters: "0123456789" };
    const options: Options = { ...plain, words: { min: 2, max: 2 }, between };
    expect(generate(options, words, first)).toBe("appleapple");
    expect(generate(options, words, last)).toBe("tiger99tiger");
  });
});

describe("positions", () => {
  const digits = { min: 0, max: 2, characters: "0123456789" };

  test("adds characters at the start and end", () => {
    const options: Options = { ...plain, start: digits, end: { ...digits, characters: "xyz" } };
    expect(generate(options, words, first)).toBe("apple");
    expect(generate(options, words, last)).toBe("99tigerzz");
  });

  test("uses only one end when asked", () => {
    const options: Options = { ...plain, start: digits, end: digits, ends: "either" };
    expect(generate(options, words, first)).toBe("apple");
    expect(generate(options, words, last)).toBe("tiger99");
  });

  test("inserts characters anywhere", () => {
    const options: Options = { ...plain, anywhere: { min: 1, max: 1, characters: "7" } };
    expect(generate(options, words, first)).toBe("7apple");
    expect(generate(options, words, last)).toBe("tiger7");
  });

  test("makes usernames from characters alone", () => {
    const options: Options = {
      ...plain,
      words: { min: 0, max: 0 },
      start: { min: 4, max: 4, characters: "ab" },
    };
    expect(generate(options, [], last)).toBe("bbbb");
  });

  test("draws again when a username comes out empty", () => {
    let calls = 0;
    const emptyFirst: Random = (n) => (calls++ === 0 ? 0 : n - 1);
    expect(generate({ ...plain, words: { min: 0, max: 1 } }, words, emptyFirst)).toBe("tiger");
  });
});

describe("drafts", () => {
  test("keep their words when the case or leetspeak changes", () => {
    const options: Options = { ...plain, words: { min: 2, max: 2 } };
    // Each word, then a random case for each of its letters: tiger as TiGeR, then apple as aPpLe.
    const draws = [1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
    const draft = draw(options, words, (n) => (n === 2 ? draws.shift()! : 0));
    expect(format(draft, options)).toBe("tigerapple");
    expect(format(draft, { ...options, case: "capitalized" })).toBe("TigerApple");
    expect(format(draft, { ...options, case: "random" })).toBe("TiGeRaPpLe");
    expect(format(draft, { ...options, case: "random", leetspeak: true })).toBe("7163R4PpL3");
  });

  test("keep their words and characters when the separator changes", () => {
    const options: Options = {
      ...plain,
      words: { min: 2, max: 2 },
      between: { min: 1, max: 1, characters: "-" },
      anywhere: { min: 1, max: 1, characters: "7" },
    };
    // "apple-apple" has 12 places for a character; the 7th is just after the separator.
    const random: Random = (n) => (n === 12 ? 6 : 0);
    const draft = draw(options, words, random);
    expect(format(draft, options)).toBe("apple-7apple");
    const none = separate(
      draft,
      { ...options, between: { min: 0, max: 0, characters: "" } },
      words,
      random,
    );
    expect(format(none, options)).toBe("apple7apple");
    const dot = separate(
      none,
      { ...options, between: { min: 1, max: 1, characters: "." } },
      words,
      random,
    );
    expect(format(dot, options)).toBe("apple.7apple");
  });
});

test("rejects options that can't produce a username", () => {
  const throws = (options: Options, from = words) =>
    expect(() => generate(options, from, first)).toThrow(RangeError);
  throws({ ...plain, words: { min: 2, max: 1 } });
  throws({ ...plain, words: { min: 0, max: limits.words + 1 } });
  throws({ ...plain, start: { min: 0, max: limits.characters + 1, characters: "a" } });
  throws({ ...plain, start: { min: 0, max: 1, characters: "" } });
  throws(plain, []);
  throws({ ...plain, words: { min: 0, max: 0 } });
});

test("randomInt returns every value below n, and no others", () => {
  const values = new Set(Array.from({ length: 1000 }, () => randomInt(3)));
  expect([...values].sort()).toEqual([0, 1, 2]);
});
