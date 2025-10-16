console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const navLinks = $$("nav a");
const currentLink = navLinks.find(a =>
  a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add("current");

const pages = [
    { url: "", title: "Home" },
    { url: "/projects/", title: "Projects" },
    { url: "/contact/", title: "Contact" },
    { url: "/resume/", title: "Resume" },
    { url: "https://github.com/gdespaigne", title: "Github" },
  ];

const BASE_PATH =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio";

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
    let url = p.url;
    if (!url.startsWith("http")) url = BASE_PATH + url;

    const a = document.createElement("a");
    a.href = url;
    a.textContent = p.title;

    if (new URL(a.href, location.href).host !== location.host) a.target = "_blank";

    nav.append(a);
}

function normalize(pathname) {
    return pathname.replace(/^\/portfolio\//, "/").replace(/index\.html?$/i, "").replace(/\/+$/, "/");
}

const here = normalize(location.pathname);
for (const a of nav.querySelectorAll("a")) {
    const aPath = normalize(new URL(a.href, location.href).pathname);
    if (aPath === here) a.classList.add("current");
}

document.body.insertAdjacentHTML("afterbegin",
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
);

const select = document.querySelector(".color-scheme select");

function setColorScheme(value) {
    document.documentElement.style.setProperty("color-scheme", value);
    localStorage.colorScheme = value;
}

if ("colorScheme" in LocalStorage) {
    setColorScheme(localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

select.addEventListener("input", e => setColorScheme(e.target.value));

const form = document.querySelector("form");
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const params = new URLSearchParams();
  for (const [name, value] of data) params.append(name, value);
  location.href = form.action + "?" + params.toString(); // opens mail client
});