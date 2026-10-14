import copyIcon from "lucide-static/icons/copy.svg?raw";
import dicesIcon from "lucide-static/icons/dices.svg?raw";
import moonIcon from "lucide-static/icons/moon.svg?raw";
import resetIcon from "lucide-static/icons/rotate-ccw.svg?raw";
import sunIcon from "lucide-static/icons/sun.svg?raw";
import "./style.css";
import { dino } from "./dino";
import { generate, limits, randomInt, type Options } from "./generate";
import { excluded, lists, load } from "./lists";

const form = document.querySelector<HTMLFormElement>("#options")!;
const username = document.querySelector<HTMLOutputElement>("#username")!;
const error = document.querySelector<HTMLParagraphElement>("#error")!;
const length = document.querySelector<HTMLSpanElement>("#length")!;
const copy = document.querySelector<HTMLButtonElement>("#copy")!;
const generator = document.querySelector<HTMLButtonElement>("button.primary")!;
const runner = document.querySelector<HTMLSpanElement>("#dino")!;
const theme = document.querySelector<HTMLButtonElement>("#theme")!;
const dark = matchMedia("(prefers-color-scheme: dark)");
const loaded = new Map<string, Promise<string[]>>();
const sets: Record<string, string> = {
  "0-9": "0123456789",
  "a-z": "abcdefghijklmnopqrstuvwxyz",
  "A-Z": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

// Lucide's icons are inlined at build time, so only these ship and nothing loads at runtime.
const icons: Record<string, string> = {
  copy: copyIcon,
  dices: dicesIcon,
  moon: moonIcon,
  "rotate-ccw": resetIcon,
  sun: sunIcon,
};
for (const slot of document.querySelectorAll<HTMLElement>("[data-icon]")) {
  slot.outerHTML = icons[slot.dataset.icon!];
}

// A range is two native sliders on one track, so each handle works with the mouse and the keyboard,
// with buttons beside the track that step the low and high handles.
for (const range of form.querySelectorAll<HTMLElement>(".range")) {
  const { name, value = "0" } = range.dataset;
  const max = name === "words" ? limits.words : limits.characters;
  const slider = (end: string, label: string) =>
    `<input type="range" name="${name}-${end}" min="0" max="${max}" value="${value}" aria-label="${label}" />`;
  const steppers = (end: string, label: string) =>
    `<span class="steppers">` +
    `<button type="button" data-end="${end}" data-step="-1" aria-label="${label}, lower">−</button>` +
    `<button type="button" data-end="${end}" data-step="1" aria-label="${label}, higher">+</button>` +
    `</span>`;
  range.innerHTML =
    steppers("min", "Fewest") +
    `<span class="track">${slider("min", "Fewest")}${slider("max", "Most")}</span>` +
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

runner.innerHTML = dino;

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
form.addEventListener("reset", () => setTimeout(render));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(username.value);
  const label = copy.querySelector("span")!;
  label.textContent = "Copied";
  setTimeout(() => (label.textContent = "Copy"), 1500);
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
    username.value = generate(options, words, randomInt);
    username.style.setProperty("--length", String(username.value.length));
    length.textContent = `${username.value.length} characters`;
    error.hidden = true;
  } catch (cause) {
    username.value = "";
    error.textContent = cause instanceof Error ? cause.message : String(cause);
    error.hidden = false;
  }
  // With nothing to show, a dinosaur runs back and forth where the username would be.
  const failed = !error.hidden;
  length.hidden = copy.disabled = generator.disabled = failed;
  runner.hidden = !failed;
}
