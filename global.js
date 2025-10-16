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
    { url: "/portfolio/projects/", title: "Projects" },
    { url: "/portfolio/contact/", title: "Contact" },
    { url: "/portfolio/resume/", title: "Resume" },
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

