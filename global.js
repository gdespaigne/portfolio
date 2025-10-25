document.addEventListener("DOMContentLoaded", () => {
    const isPages = location.hostname.endsWith("github.io");
    const repo = isPages ? (location.pathname.split("/")[1] || "") : "";
    const BASE = isPages ? `/${repo}/` : "/";
  
    const pages = [
      { href: "",          title: "Home" },
      { href: "projects/", title: "Projects" },
      { href: "resume/",   title: "Resume" },
      { href: "contact/",  title: "Contact" },
      { href: "https://github.com/gdespaigne", title: "GitHub" }
    ];
  
    let header = document.querySelector("#site-header");
    if (!header) {
      header = document.createElement("header");
      header.id = "site-header";
      document.body.prepend(header);
    }
  
    let existingNav = header.querySelector("nav");
    if (existingNav) existingNav.remove();
  
    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Primary");
    header.append(nav);
  
    for (const p of pages) {
      const a = document.createElement("a");
      a.href = p.href.startsWith("http") ? p.href : BASE + p.href;
      a.textContent = p.title;
      if (new URL(a.href, location.href).host !== location.host) a.target = "_blank";
      nav.append(a);
    }
  
    function normalize(pathname) {
      const stripped = isPages ? pathname.replace(new RegExp(`^/${repo}/`), "/") : pathname;
      return stripped.replace(/index\.html?$/i, "").replace(/\/+$/, "/");
    }
  
    const here = normalize(location.pathname);
    nav.querySelectorAll("a").forEach(a => {
      const apath = normalize(new URL(a.href, location.href).pathname);
      if (apath === here) a.classList.add("current");
    });
  
    if (!header.querySelector(".color-scheme")) {
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
  
    const select = header.querySelector(".color-scheme select");
  
    function setColorScheme(val) {
      document.documentElement.style.setProperty("color-scheme", val);
      localStorage.colorScheme = val;
    }
  
    if (localStorage.colorScheme) {
      setColorScheme(localStorage.colorScheme);
      select.value = localStorage.colorScheme;
    }
  
    select.addEventListener("input", e => setColorScheme(e.target.value));
  });
  
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(lib/projects.json);
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }

  const data = await response.json();
  return data;

  export function renderProjects(project, containerElement, headingLevel = 'h2') {
    if (!containerElement) return;

    containerElement.innerHTML = '';

    projects.forEach(project => {
      const article = document.createElement('article');
      article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  });
}

