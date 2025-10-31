import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { fetchJSON, renderProjects } from "/portfolio/global.js";

(async () => {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const projects = await fetchJSON("../lib/projects.json");
  renderProjects(projects, container, "h2");

  const titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${projects.length}) Projects`;

  // count projects by year
  const byYear = new Map();
  for (const p of projects) {
    const y = p.year ?? "Unknown";
    byYear.set(y, (byYear.get(y) || 0) + 1);
  }
  const entries = Array.from(byYear.entries()).sort((a, b) => d3.ascending(a[0], b[0]));
  const data = entries.map(([label, value]) => ({ label, value }));

  const svg = d3.select("#projects-pie-plot");
  if (svg.empty()) {
    console.warn("No #projects-pie-plot SVG found");
    return;
  }
  svg.selectAll("*").remove();

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(10).outerRadius(50);
  const arcs = pie(data);

  const colors = d3.scaleOrdinal(d3.schemeTableau10)
    .domain(data.map(d => d.label));

  // draw slices
  svg.selectAll("path.slice")
    .data(arcs)
    .join("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => colors(d.data.label))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

  // optional labels
  svg.selectAll("text.label")
    .data(arcs)
    .join("text")
      .attr("class", "label")
      .attr("transform", d => {
        const [x, y] = arc.centroid(d);
        return `translate(${x},${y})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font", "10px Times, serif")
      .style("fill", "black")
      .text(d => d.data.label);

  // legend if present
  const legendRoot = d3.select(".legend");
  if (!legendRoot.empty()) {
    legendRoot.selectAll("*").remove();
    legendRoot.selectAll("li")
      .data(data, d => d.label)
      .join("li")
        .attr("style", (d, i) => `--color:${colors(i)}`)
        .html(d => `<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  }
})();
