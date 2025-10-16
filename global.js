console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const REPO = "portfolio";
const isPages = location.hostname.endsWith("github.io");
const BASE_PATH = isPages ? `/${REPO}/` : "/";

const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" }
];

let header = document.querySelector("#site-header");
if (!header) {
  header = document.createElement("header");
  header.id = "site-header";
  document.body.prepend(header);
}

let nav = document.querySelector("header nav");
if (!nav) {
  nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Primary");
  header.append(nav);
}

for (const p of pages) {
  let url = p.url;
  if (!url.startsWith("http")) url = BASE_PATH + url;
  const a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;
  const host = new URL(a.href, location.href).host;
  if (host !== location.host) a.target = "_blank";
  nav.append(a);
}

function normalize(pathname) {
  return pathname.replace(new RegExp(`^/${REPO}/`), "/").replace(/index\.html?$/i, "").replace(/\/+$/, "/");
}

const here = normalize(location.pathname);
for (const a of $$("nav a", header)) {
  const aPath = normalize(new URL(a.href, location.href).pathname);
  if (aPath === here) a.classList.add("current");
}

if (!document.querySelector(".color-scheme")) {
  header.insertAdjacentHTML(
    "beforeend",
    `
      <label class="color-scheme">
        Theme:
        <select>
          <option value="light dark">Automatic</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    `
  );
}

const select = document.querySelector(".color-scheme select");

function setColorScheme(val) {
  document.documentElement.style.setProperty("color-scheme", val);
  localStorage.colorScheme = val;
}

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

select.addEventListener("input", (e) => setColorScheme(e.target.value));
