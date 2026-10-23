import joinIcon from "lucide-static/icons/arrow-left-right.svg?raw";
import startIcon from "lucide-static/icons/arrow-left-to-line.svg?raw";
import endIcon from "lucide-static/icons/arrow-right-to-line.svg?raw";
import listsIcon from "lucide-static/icons/book-open-text.svg?raw";
import checkIcon from "lucide-static/icons/check.svg?raw";
import copyIcon from "lucide-static/icons/copy.svg?raw";
import dicesIcon from "lucide-static/icons/dices.svg?raw";
import moonIcon from "lucide-static/icons/moon.svg?raw";
import resetIcon from "lucide-static/icons/rotate-ccw.svg?raw";
import separatorIcon from "lucide-static/icons/separator-vertical.svg?raw";
import sunIcon from "lucide-static/icons/sun.svg?raw";
import insideIcon from "lucide-static/icons/text-cursor.svg?raw";
import wordsIcon from "lucide-static/icons/whole-word.svg?raw";
import failedIcon from "lucide-static/icons/x.svg?raw";
import "./style.css";
import { sprite } from "./ufo";
import {
  draw,
  fit,
  format,
  least,
  limits,
  measure,
  need,
  randomInt,
  reach,
  span,
  type Count,
  type Draft,
  type Lengths,
  type Options,
  type Part,
} from "./generate";
import { excluded, lists, load } from "./lists";

const form = document.querySelector<HTMLFormElement>("#options")!;
const username = document.querySelector<HTMLOutputElement>("#username")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;
const length = document.querySelector<HTMLSpanElement>("#length")!;
const copy = document.querySelector<HTMLButtonElement>("#copy")!;
const generator = document.querySelector<HTMLButtonElement>("button.primary")!;
const ufo = document.querySelector<HTMLSpanElement>("#ufo")!;
const theme = document.querySelector<HTMLButtonElement>("#theme")!;
const joins = [...form.querySelectorAll<HTMLInputElement>("[name=join]")];
const dark = matchMedia("(prefers-color-scheme: dark)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const loaded = new Map<string, Promise<string[]>>();
// The last draw and the options of each of its parts, so a change redraws only the parts it touches.
let drawn: { draft: Draft; keys: Record<Part, string> } | undefined;
// The shortest and longest of the chosen words, which limit the sliders between draws.
let lengths: Lengths | undefined;
const sets: Record<string, string> = {
  "0-9": "0123456789",
  "a-z": "abcdefghijklmnopqrstuvwxyz",
  "A-Z": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

// Lucide's icons are inlined at build time, so only these ship and nothing loads at runtime.
const icons: Record<string, string> = {
  "arrow-left-right": joinIcon,
  "arrow-left-to-line": startIcon,
  "arrow-right-to-line": endIcon,
  "book-open-text": listsIcon,
  check: checkIcon,
  copy: copyIcon,
  dices: dicesIcon,
  moon: moonIcon,
  "rotate-ccw": resetIcon,
  "separator-vertical": separatorIcon,
  sun: sunIcon,
  "text-cursor": insideIcon,
  "whole-word": wordsIcon,
  x: failedIcon,
};
for (const slot of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  slot.replaceWith(icon(slot.dataset.icon!));
}
const settle = getComputedStyle(document.documentElement).getPropertyValue("--settle");

// A range is two native sliders on one track, so each handle works with the mouse and the keyboard,
// with a field beside the track for typing each value.
for (const range of form.querySelectorAll<HTMLElement>(".range")) {
  // The HTML holds each range's defaults; a range with only a minimum is that one value.
  const { name, min = "0", max = min, floor = "0" } = range.dataset;
  const scale = range.dataset.scale === "words" ? limits.words : limits.characters;
  const slider = (end: string, label: string, value: string) =>
    `<input type="range" name="${name}-${end}" min="${floor}" max="${scale}" value="${value}" aria-label="${label}" />`;
  const field = (label: string) =>
    `<input type="number" inputmode="numeric" min="${floor}" max="${scale}" aria-label="${label}" />`;
  range.innerHTML =
    `<span class="track">${slider("min", "Fewest", min)}${slider("max", "Most", max)}</span>` +
    `<span class="values">${field("Fewest")}–${field("Most")}</span>`;
}
document.querySelector("#word-lists")!.append(
  ...lists.map((list, i) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="list" value="${list.file}" ${i ? "" : "checked"} />`;
    label.append(list.name);
    return label;
  }),
);
document.querySelector("#credit")!.innerHTML =
  `Words from the EFF's ${lists.map((list) => `<a href="${list.source}">${list.name}</a>`).join(", ")} ` +
  `lists (${lists[0].licence}), without ${excluded.size} excluded words. ` +
  `Usernames are made in your browser, and nothing is sent anywhere.`;

ufo.innerHTML = sprite;

// The switch follows the system until it's used; the choice is then saved for later visits.
const isDark = () =>
  (document.documentElement.dataset.theme ?? (dark.matches ? "dark" : "light")) === "dark";
const showTheme = () => theme.setAttribute("aria-checked", String(isDark()));
theme.addEventListener("click", () => {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Without storage the choice lasts until the page is closed.
  }
  showTheme();
  // The side turned on rocks gently, like a sign swinging to a stop.
  const [sun, moon] = theme.querySelectorAll("svg");
  play(
    isDark() ? moon : sun,
    [
      { transform: "none" },
      { transform: "rotate(-14deg)", offset: 0.25 },
      { transform: "rotate(9deg)", offset: 0.55 },
      { transform: "rotate(-4deg)", offset: 0.8 },
      { transform: "none" },
    ],
    { duration: 700, easing: "ease-in-out" },
  );
});
dark.addEventListener("change", showTheme);
showTheme();

form.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  // A typed value applies once it's entered, so it isn't clamped while half typed.
  if (input.type === "number") return;
  if (input.type === "range") limit(input);
  render();
});
form.addEventListener("change", (event) => {
  const field = event.target as HTMLInputElement;
  if (field.type !== "number") return;
  const range = field.closest(".range")!;
  const fields = [...range.querySelectorAll<HTMLInputElement>(".values input")];
  const slider = range.querySelectorAll<HTMLInputElement>(".track input")[fields.indexOf(field)];
  // The slider keeps the value within its scale, and limit() within what the rest leave it.
  slider.value = field.value;
  limit(slider);
  render();
});
// The browser restores every control to its value in the HTML, which holds the defaults; the
// reset event fires before it does, so the render waits a task.
form.addEventListener("reset", () => {
  setTimeout(render);
  play(
    document.querySelector(".reset svg")!,
    [{ transform: "none" }, { transform: "rotate(-360deg)" }],
    { duration: 600, easing: settle },
  );
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  drawn = undefined;
  render();
  // The dice tumble once, rising as they turn.
  play(
    generator.querySelector("svg")!,
    [
      { transform: "none" },
      { transform: "rotate(180deg) scale(1.25)", offset: 0.45 },
      { transform: "rotate(360deg)" },
    ],
    { duration: 550, easing: "ease-out" },
  );
});
// For a moment after a press, Copy says whether the copy worked, with a check or a red cross. Each
// press restarts the moment, so an earlier press can't end it early.
let copied: ReturnType<typeof setTimeout> | undefined;
copy.addEventListener("click", async () => {
  const show = (name: string, text: string) => {
    const glyph = icon(name);
    copy.querySelector("svg")!.replaceWith(glyph);
    copy.querySelector("span")!.textContent = text;
    copy.classList.toggle("failed", name === "x");
    play(glyph, [{ transform: "scale(0.4)", opacity: 0 }, { transform: "none" }], {
      duration: 300,
      easing: settle,
    });
  };
  try {
    await navigator.clipboard.writeText(username.value);
    show("check", "Copied");
  } catch (cause) {
    show("x", "Failed");
    // The reason still reaches the console.
    throw cause;
  } finally {
    clearTimeout(copied);
    copied = setTimeout(() => show("copy", "Copy"), 1500);
  }
});
render();

async function render() {
  const options = read();
  for (const range of form.querySelectorAll<HTMLElement>(".range")) {
    const sliders = [...range.querySelectorAll<HTMLInputElement>(".track input")];
    const fields = range.querySelectorAll<HTMLInputElement>(".values input");
    sliders.forEach((slider, i) => {
      fields[i].value = slider.value;
    });
    const [min, max = min] = sliders;
    range.style.setProperty("--from", String(fraction(min, min.value)));
    range.style.setProperty("--to", String(fraction(max, max.value)));
    // Past the middle the low handle goes on top, or it couldn't be dragged off the high one.
    if (sliders.length > 1) min.style.zIndex = fraction(min, min.value) > 0.5 ? "1" : "";
  }

  enable(options);
  for (const place of form.querySelectorAll<HTMLElement>("[data-place]")) {
    const count = place.dataset.place === "inside" ? "spots" : (place.dataset.place as Count);
    const off =
      options[count].max === 0 ||
      (count === "spots" && (options.words.max === 0 || options.inside.max === 0));
    place.classList.toggle("off", off);
  }
  document.querySelector<HTMLElement>("#comma")!.hidden = options.joins[0] === options.joins[1];
  joins.forEach((join, i) => {
    const pair = i ? "End and Inside" : "Start and End";
    join.setAttribute("aria-label", `${pair}: ${options.joins[i]}`);
  });

  try {
    const chosen = lists.filter((list) => checked("list").includes(list.file));
    for (const list of chosen) if (!loaded.has(list.file)) loaded.set(list.file, load(list));
    const words = [
      ...new Set((await Promise.all(chosen.map((list) => loaded.get(list.file)!))).flat()),
    ];
    lengths = measure(words);
    enable(options, lengths);
    const keys: Record<Part, string> = {
      words: JSON.stringify([options.words, checked("list")]),
      between: JSON.stringify(options.between),
      places: JSON.stringify([
        options.start,
        options.end,
        options.spots,
        options.inside,
        options.joins,
      ]),
    };
    const last = drawn;
    // A join or separator can leave the counts past the limit, so they're pushed down to fit. They
    // make room beside the words already drawn, unless those are about to change; only if the
    // counts can't go low enough do the words give way.
    const kept = last?.keys.words === keys.words ? current() : undefined;
    let fitted = fit(options, lengths, undefined, kept);
    if (need(fitted, lengths, kept) > limits.characters) fitted = fit(fitted, lengths);
    if (fitted !== options) {
      write(options, fitted);
      return render();
    }
    const parts = Object.keys(keys) as Part[];
    const changed = last ? parts.filter((part) => last.keys[part] !== keys[part]) : parts;
    const draft = draw(options, words, randomInt, last && { draft: last.draft, changed });
    drawn = { draft, keys };
    mark(options, lengths);
    username.value = format(draft, options);
    username.style.setProperty("--length", String(username.value.length));
    // The length follows from the counts, so it's shown beside the range they can make.
    const { min, max } = span(options, lengths);
    length.textContent =
      `${username.value.length} characters` +
      (min === max ? "" : ` · ${min}–${max} with these options`);
    error.hidden = true;
  } catch (cause) {
    drawn = undefined;
    username.value = "";
    error.textContent = cause instanceof Error ? cause.message : String(cause);
    error.hidden = false;
  }
  // With nothing to show, a flying saucer drifts back and forth where the username would be.
  const failed = !error.hidden;
  length.hidden = copy.disabled = generator.disabled = failed;
  ufo.hidden = !failed;
}

/**
 * Reads the options from the form. Controls that can't apply are disabled, which drops them from
 * FormData, so each is read from its input instead.
 */
function read(): Options {
  const slot = (name: string) => ({ ...range(name), characters: characters(name) });
  const separator = checked("separator")[0];
  return {
    words: range("words"),
    case: checked("case")[0] as Options["case"],
    leetspeak: checked("leetspeak").length > 0,
    // Every separator but none has a count; random draws from its sets, the rest repeat.
    between:
      separator === ""
        ? { min: 0, max: 0, characters: "" }
        : {
            ...range("between"),
            characters: separator === "random" ? characters("between") : separator,
          },
    start: slot("start"),
    end: slot("end"),
    spots: range("spots"),
    inside: slot("inside"),
    joins: [joins[0].checked ? "and" : "or", joins[1].checked ? "and" : "or"],
  };
}

/** The values of a group's checked inputs. */
function checked(name: string): string[] {
  return [...form.querySelectorAll<HTMLInputElement>(`[name="${name}"]:checked`)].map(
    (input) => input.value,
  );
}

/** A range's two handles. */
function range(name: string): { min: number; max: number } {
  const value = (end: string) =>
    Number(form.querySelector<HTMLInputElement>(`[name="${name}-${end}"]`)!.value);
  return { min: value("min"), max: value("max") };
}

/** The characters a group's chosen sets hold. */
function characters(name: string): string {
  return checked(name)
    .map((set) => sets[set])
    .join("");
}

/**
 * Keeps a moved slider within the characters limit, pushing its partner handle along. Where the
 * counts together would pass the limit, it pushes the other counts down to make room, as far as
 * their minimums; a count of characters never moves the current words.
 */
function limit(input: HTMLInputElement) {
  const range = input.closest<HTMLElement>(".range")!;
  const name = range.dataset.name as Count;
  const [min, max] = range.querySelectorAll<HTMLInputElement>(".track input");
  if (Number(min.value) > Number(max.value)) (input === min ? max : min).value = input.value;
  if (!lengths) return;
  // The number of words changes the words, so it counts the shortest words instead.
  const words = name === "words" ? undefined : current();
  const most = reach(read(), name, lengths, words);
  for (const slider of [min, max]) slider.value = String(Math.min(Number(slider.value), most));
  const options = read();
  write(options, fit(options, lengths, name, words));
}

/** The current username's words, which counts of characters leave room for. */
function current(): string[] | undefined {
  return drawn?.draft.words.map((word) => word.lower);
}

/** Writes the counts fit() lowered back to their sliders. */
function write(options: Options, fitted: Options) {
  for (const count of ["words", "between", "start", "end", "spots", "inside"] as const) {
    if (fitted[count] === options[count]) continue;
    for (const end of ["min", "max"] as const) {
      const slider = form.elements.namedItem(`${count}-${end}`) as HTMLInputElement;
      slider.value = String(fitted[count][end]);
    }
  }
}

/**
 * Greys out every control that can't change the username as the options stand, so nothing on the
 * page moves or hides: what acts on words when there are none, separators with fewer than two
 * words, a place's characters when it has none, and a join unless the places on both sides are
 * there. Given the words' lengths, it also greys out a join that couldn't fit the limit even with
 * every count at its least.
 */
function enable(options: Options, lengths?: Lengths) {
  const words = options.words.max > 0;
  const pair = options.words.max >= 2;
  const separator = checked("separator")[0];
  const start = options.start.max > 0;
  const end = options.end.max > 0;
  const spots = words && options.spots.max > 0;
  const inside = spots && options.inside.max > 0;
  const use = (selector: string, usable: boolean) => {
    for (const input of form.querySelectorAll<HTMLInputElement>(selector)) input.disabled = !usable;
  };
  use("[name=case], [name=leetspeak], [name=list], [data-name=spots] input", words);
  use("[name=separator]", pair);
  use("[data-name=between] input", pair && separator !== "");
  use("[name=between]", pair && separator === "random");
  use("[name=start]", start);
  use("[name=end]", end);
  use("[data-name=inside] input", spots);
  use("[name=inside]", inside);
  joins.forEach((join, i) => {
    const flipped: Options["joins"] = [...options.joins];
    flipped[i] = join.checked ? "or" : "and";
    const joined = i ? inside && (start || end) : start && end;
    const fits = !lengths || least({ ...options, joins: flipped }, lengths) <= limits.characters;
    join.disabled = !joined || !fits;
  });
}

/**
 * Dots each slider's track past the furthest its handles can go, which is where limit() stops them:
 * as far as the other counts can give way, beside the words on screen.
 */
function mark(options: Options, lengths: Lengths) {
  for (const range of form.querySelectorAll<HTMLElement>(".range")) {
    const name = range.dataset.name as Count;
    const slider = range.querySelector<HTMLInputElement>(".track input")!;
    // The number of words changes the words, so it counts the shortest words instead.
    const most = reach(options, name, lengths, name === "words" ? undefined : current());
    range.style.setProperty("--reach", String(fraction(slider, most)));
  }
}

/** Where a value sits on a slider's scale, from 0 to 1. */
function fraction(slider: HTMLInputElement, value: number | string): number {
  const min = Number(slider.min);
  return (Number(value) - min) / (Number(slider.max) - min);
}

/** A Lucide icon as an element, without the licence comment that leads its file. */
function icon(name: string): SVGSVGElement {
  const template = document.createElement("template");
  template.innerHTML = icons[name];
  return template.content.querySelector("svg")!;
}

/** Plays an icon's animation from the start on each press; with reduced motion, nothing moves. */
function play(target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  if (!still.matches) target.animate(keyframes, options);
}
