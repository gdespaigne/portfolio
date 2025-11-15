import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { fetchJSON, renderProjects } from "/portfolio/global.js";

let BASE = [];
let TERM = "";
let SELECTED_YEARS = new Set();

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

let allYears = list => computeData(list).map(d => d.label);

let applyFilters = () => {
  let container = document.getElementById("projects-list");
  if (!container) return;

  let term = TERM.toLowerCase().trim();
  let filtered = BASE.filter(p => {
    let y = p?.year ?? "Unknown";
    if (SELECTED_YEARS.size > 0 && !SELECTED_YEARS.has(y)) return false;
    if (!term) return true;
    let title = (p.title || "").toLowerCase();
    let desc  = (p.description || "").toLowerCase();
    let yr    = p.year ? String(p.year) : "";
    return title.includes(term) || desc.includes(term) || yr.includes(term);
  });

  renderProjects(filtered, container, "h2");

  let titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${filtered.length}) Projects`;

  let dataNow = computeData(filtered);
  drawPie("#projects-pie-plot", dataNow, allYears(BASE));
  
};

let drawPie = (selector, dataNow, yearsDomain) => {
  let svg = d3.select(selector);
  if (svg.empty()) return;

  let W = 320, H = 320;
  svg.attr("width", W).attr("height", H);
  svg.selectAll("*").remove();

  let pie = d3.pie().value(d => d.value).sort(null);
  let arc = d3.arc().innerRadius(10).outerRadius(50);
  let arcs = pie(dataNow);

  let colors = d3.scaleOrdinal(d3.schemeTableau10).domain(yearsDomain);

  let slices = svg.selectAll("path.slice")
    .data(arcs, d => d.data.label)
    .join("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => colors(d.data.label))
      .attr("stroke", "white")
      .attr("stroke-width", 1)
      .style("transition", "opacity 150ms ease, transform 150ms ease")
      .style("opacity", d => (SELECTED_YEARS.size === 0 || SELECTED_YEARS.has(d.data.label)) ? 1 : 0.35)
      .on("mouseenter", function (e, d) {
        slices.style("opacity", s => (s.data.label === d.data.label ? 1 : 0.35));
        d3.select(this).attr("stroke-width", 2)
          .transition().duration(150).attr("transform", "scale(0.9)");
      })
      .on("mouseleave", function () {
        slices.transition().duration(150).attr("transform", "scale(1)");
        slices.style("opacity", s => (SELECTED_YEARS.size === 0 || SELECTED_YEARS.has(s.data.label)) ? 1 : 0.35)
              .attr("stroke-width", 1);
      })
      .on("click", (e, d) => {
        let y = d.data.label;
        if (SELECTED_YEARS.has(y)) {
          SELECTED_YEARS.delete(y);
        } else {
          SELECTED_YEARS.add(y);
        }
        applyFilters();
      });

  let legendRoot = d3.select(".legend");
  if (!legendRoot.empty()) {
    let currentMap = new Map(dataNow.map(d => [d.label, d.value]));
    let li = legendRoot.selectAll("li")
      .data(yearsDomain, d => d)
      .join("li")
        .attr("style", (d, i) => `--color:${d3.schemeTableau10[i % 10]}`)
        .classed("is-hidden", d => SELECTED_YEARS.size > 0 && !SELECTED_YEARS.has(d))
        .html(d => `<span class="swatch"></span> ${d} <em>(${currentMap.get(d) ?? 0})</em>`)
        .on("mouseenter", (e, d) => {
          slices.style("opacity", s => (s.data.label === d ? 1 : 0.35));
        })
        .on("mouseleave", () => {
          slices.style("opacity", s => (SELECTED_YEARS.size === 0 || SELECTED_YEARS.has(s.data.label)) ? 1 : 0.35);
        })
        .on("click", (e, d) => {
          if (SELECTED_YEARS.has(d)) SELECTED_YEARS.delete(d);
          else SELECTED_YEARS.add(d);
          applyFilters();
        });
  }
};

(async () => {
  let container = document.getElementById("projects-list");
  if (!container) return;

  try {
    BASE = await fetchJSON("../lib/projects.json");
  } catch (_) {
    BASE = [];
  }

  renderProjects(BASE, container, "h2");

  let titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${BASE.length}) Projects`;

  applyFilters();

  let searchInput = document.querySelector('input[type="search"]') || document.getElementById("project-search");
  if (searchInput) {
    searchInput.addEventListener("input", e => {
      TERM = e.target.value || "";
      applyFilters();
    });
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        TERM = "";
        searchInput.value = "";
        applyFilters();
      }
    });
  }
})();
