import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { fetchJSON, renderProjects } from "/portfolio/global.js";

let HIDDEN = new Set();

let computeData = list => {
  let byYear = new Map();
  for (let p of list) {
    let y = p?.year ?? "Unknown";
    byYear.set(y, (byYear.get(y) || 0) + 1);
  }
  let entries = Array.from(byYear.entries()).sort((a, b) => {
    let ax = isNaN(+a[0]) ? Infinity : +a[0];
    let bx = isNaN(+b[0]) ? Infinity : +b[0];
    return d3.ascending(ax, bx);
  });
  return entries.map(([label, value]) => ({ label, value }));
};

let drawPie = (selector, data) => {
  let svg = d3.select(selector);
  if (svg.empty()) return;

  let visible = data.filter(d => !HIDDEN.has(d.label));

  let W = 320, H = 320;
  svg.attr("width", W).attr("height", H);
  svg.selectAll("*").remove();

  let pie = d3.pie().value(d => d.value).sort(null);
  let arc = d3.arc().innerRadius(10).outerRadius(50);
  let arcs = pie(visible);

  let colors = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(d => d.label));

  let slices = svg.selectAll("path.slice")
    .data(arcs, d => d.data.label)
    .join("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => colors(d.data.label))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("transition", "opacity 150ms ease, transform 150ms ease");

  slices
    .on("mouseenter", function (e, d) {
      slices.style("opacity", s => (s.data.label === d.data.label ? 1 : 0.35));
      d3.select(this).attr("stroke-width", 2);
    })
    .on("mouseleave", function () {
      slices.style("opacity", 1).attr("stroke-width", 1);
    });

  let legendRoot = d3.select(".legend");
  if (!legendRoot.empty()) {
    let li = legendRoot.selectAll("li")
      .data(data, d => d.label)
      .join("li")
        .attr("style", (d, i) => `--color:${d3.schemeTableau10[i % 10]}`)
        .classed("is-hidden", d => HIDDEN.has(d.label))
        .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);

    li.on("mouseenter", (e, d) => {
        slices.style("opacity", s => (s.data.label === d.label ? 1 : 0.35));
      })
      .on("mouseleave", () => {
        slices.style("opacity", 1);
      })
      .on("click", (e, d) => {
        if (HIDDEN.has(d.label)) HIDDEN.delete(d.label);
        else HIDDEN.add(d.label);
        drawPie(selector, data);
      });
  }
};

(async () => {
  let container = document.getElementById("projects-list");
  if (!container) return;

  let projects = [];
  try {
    projects = await fetchJSON("../lib/projects.json");
  } catch (_) {
    projects = [];
  }

  renderProjects(projects, container, "h2");

  let titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${projects.length}) Projects`;

  let data = computeData(projects);
  drawPie("#projects-pie-plot", data);

  let searchInput = document.getElementById("project-search");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      let term = e.target.value.toLowerCase();
      let filtered = projects.filter(p =>
        (p.title && p.title.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.year && String(p.year).includes(term))
      );

      renderProjects(filtered, container, "h2");

      if (titleEl) titleEl.textContent = `(${filtered.length}) Projects`;

      HIDDEN = new Set();
      let filteredData = computeData(filtered);
      drawPie("#projects-pie-plot", filteredData);
    });
  }
})();
