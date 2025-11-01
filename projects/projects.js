import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { fetchJSON, renderProjects } from "/portfolio/global.js";

(async () => {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const projects = await fetchJSON("../lib/projects.json");
  renderProjects(projects, container, "h2");

  const titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${projects.length}) Projects`;

  const svg = d3.select("#projects-pie-plot");
  if (svg.empty()) return;

  const byYear = new Map();
  for (const p of projects) {
    const y = p?.year ?? "Unknown";
    byYear.set(y, (byYear.get(y) || 0) + 1);
  }

  const entries = Array.from(byYear.entries()).sort((a, b) => {
    const ax = isNaN(+a[0]) ? Infinity : +a[0];
    const bx = isNaN(+b[0]) ? Infinity : +b[0];
    return d3.ascending(ax, bx);
  });

  const data = entries.map(([label, value]) => ({ label, value }));

  svg.selectAll("*").remove();

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(10).outerRadius(50);
  const arcs = pie(data);

  const colors = d3.scaleOrdinal(d3.schemeTableau10).domain(data.map(d => d.label));

  svg.selectAll("path.slice")
    .data(arcs)
    .join("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => colors(d.data.label))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

  const legendRoot = d3.select(".legend");
  if (!legendRoot.empty()) {
    legendRoot.selectAll("*").remove();
    legendRoot.selectAll("li")
      .data(data, d => d.label)
      .join("li")
        .attr("style", (d, i) => `--color:${d3.schemeTableau10[i % 10]}`)
        .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  }
})();
