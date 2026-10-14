import startIcon from "lucide-static/icons/arrow-left-to-line.svg?raw";
import endIcon from "lucide-static/icons/arrow-right-to-line.svg?raw";
import listsIcon from "lucide-static/icons/book-open-text.svg?raw";
import checkIcon from "lucide-static/icons/check.svg?raw";
import copyIcon from "lucide-static/icons/copy.svg?raw";
import dicesIcon from "lucide-static/icons/dices.svg?raw";
import moonIcon from "lucide-static/icons/moon.svg?raw";
import anywhereIcon from "lucide-static/icons/move-horizontal.svg?raw";
import resetIcon from "lucide-static/icons/rotate-ccw.svg?raw";
import separatorIcon from "lucide-static/icons/separator-vertical.svg?raw";
import sunIcon from "lucide-static/icons/sun.svg?raw";
import wordsIcon from "lucide-static/icons/whole-word.svg?raw";
import failedIcon from "lucide-static/icons/x.svg?raw";
import "./style.css";
import { sprite } from "./ufo";
import { draw, format, limits, randomInt, separate, type Draft, type Options } from "./generate";
import { excluded, lists, load } from "./lists";

const form = document.querySelector<HTMLFormElement>("#options")!;
const username = document.querySelector<HTMLOutputElement>("#username")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;
const length = document.querySelector<HTMLSpanElement>("#length")!;
const copy = document.querySelector<HTMLButtonElement>("#copy")!;
const generator = document.querySelector<HTMLButtonElement>("button.primary")!;
const ufo = document.querySelector<HTMLSpanElement>("#ufo")!;
const theme = document.querySelector<HTMLButtonElement>("#theme")!;
const dark = matchMedia("(prefers-color-scheme: dark)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const loaded = new Map<string, Promise<string[]>>();
// The last draw and the options it came from, so a change that only rewrites the username keeps it.
let drawn: { draft: Draft; key: string; between: string } | undefined;
const sets: Record<string, string> = {
  "0-9": "0123456789",
  "a-z": "abcdefghijklmnopqrstuvwxyz",
  "A-Z": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

// Lucide's icons are inlined at build time, so only these ship and nothing loads at runtime.
const icons: Record<string, string> = {
  "arrow-left-to-line": startIcon,
  "arrow-right-to-line": endIcon,
  "book-open-text": listsIcon,
  check: checkIcon,
  copy: copyIcon,
  dices: dicesIcon,
  moon: moonIcon,
  "move-horizontal": anywhereIcon,
  "rotate-ccw": resetIcon,
  "separator-vertical": separatorIcon,
  sun: sunIcon,
  "whole-word": wordsIcon,
  x: failedIcon,
};
for (const slot of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  slot.replaceWith(icon(slot.dataset.icon!));
}
const settle = getComputedStyle(document.documentElement).getPropertyValue("--settle");

// A range is two native sliders on one track, so each handle works with the mouse and the keyboard,
// with buttons beside the track that step the low and high handles.
for (const range of form.querySelectorAll<HTMLElement>(".range")) {
  // The HTML holds each range's defaults; a range with only a minimum is that one value.
  const { name, min = "0", max = min } = range.dataset;
  const limit = name === "words" ? limits.words : limits.characters;
  const slider = (end: string, label: string, value: string) =>
    `<input type="range" name="${name}-${end}" min="0" max="${limit}" value="${value}" aria-label="${label}" />`;
  const steppers = (end: string, label: string) =>
    `<span class="steppers">` +
    `<button type="button" data-end="${end}" data-step="-1" aria-label="${label}, lower">−</button>` +
    `<button type="button" data-end="${end}" data-step="1" aria-label="${label}, higher">+</button>` +
    `</span>`;
  range.innerHTML =
    steppers("min", "Fewest") +
    `<span class="track">${slider("min", "Fewest", min)}${slider("max", "Most", max)}</span>` +
    steppers("max", "Most") +
    `<output></output>`;
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
  if (input.type === "range") {
    // The handle being dragged pushes the other one along.
    const [min, max] = input.closest(".range")!.querySelectorAll<HTMLInputElement>(".track input");
    if (Number(min.value) > Number(max.value)) (input === min ? max : min).value = input.value;
  }
  render();
});
form.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("[data-step]");
  if (!button) return;
  const range = button.closest(".range")!;
  const input = range.querySelector<HTMLInputElement>(`[name$="-${button.dataset.end}"]`)!;
  if (button.dataset.step === "1") input.stepUp();
  else input.stepDown();
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
// The browser restores every control to its value in the HTML, which holds the defaults; the
// reset event fires before it does, so the render waits a task.
form.addEventListener("reset", () => {
  setTimeout(render);
  play(
    form.querySelector(".reset svg")!,
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
  for (const range of form.querySelectorAll<HTMLElement>(".range")) {
    const [min, max] = range.querySelectorAll<HTMLInputElement>(".track input");
    range.style.setProperty("--from", String(Number(min.value) / Number(min.max)));
    range.style.setProperty("--to", String(Number(max.value) / Number(max.max)));
    // Past the middle the low handle goes on top, or it couldn't be dragged off the high one.
    min.style.zIndex = Number(min.value) > Number(min.max) / 2 ? "1" : "";
    range.querySelector("output")!.value =
      min.value === max.value ? min.value : `${min.value}–${max.value}`;
  }

  const data = new FormData(form);
  const range = (name: string) => ({
    min: Number(data.get(`${name}-min`)),
    max: Number(data.get(`${name}-max`)),
  });
  const slot = (name: string) => ({
    ...range(name),
    characters: data
      .getAll(name)
      .map((set) => sets[set as string])
      .join(""),
  });
  const separator = data.get("separator") as string;
  const fixed = separator ? 1 : 0;
  const start = slot("start");
  const end = slot("end");
  // "Or" means something only when both ends can have characters. Disabled inputs drop out of
  // FormData, so the choice is read from the checked input itself.
  const linked = start.max > 0 && end.max > 0;
  const ends = form.querySelectorAll<HTMLInputElement>("[name=ends]");
  for (const input of ends) input.disabled = !linked;
  const options: Options = {
    words: range("words"),
    case: data.get("case") as Options["case"],
    leetspeak: data.has("leetspeak"),
    start,
    between:
      separator === "random" ? slot("between") : { min: fixed, max: fixed, characters: separator },
    end,
    anywhere: slot("anywhere"),
    ends: linked && ends[1].checked ? "either" : "both",
  };
  document.querySelector<HTMLElement>("#between")!.hidden = separator !== "random";

  try {
    const chosen = lists.filter((list) => data.getAll("list").includes(list.file));
    for (const list of chosen) if (!loaded.has(list.file)) loaded.set(list.file, load(list));
    const words = [
      ...new Set((await Promise.all(chosen.map((list) => loaded.get(list.file)!))).flat()),
    ];
    // Case and leetspeak only rewrite the words, and a new separator keeps the words and characters.
    const key = JSON.stringify([
      options.words,
      options.start,
      options.end,
      options.anywhere,
      options.ends,
      data.getAll("list"),
    ]);
    const between = JSON.stringify(options.between);
    if (drawn?.key !== key) drawn = { key, between, draft: draw(options, words, randomInt) };
    else if (drawn.between !== between) {
      drawn = { key, between, draft: separate(drawn.draft, options, words, randomInt) };
    }
    username.value = format(drawn.draft, options);
    username.style.setProperty("--length", String(username.value.length));
    length.textContent = `${username.value.length} characters`;
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
