import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { fetchJSON, renderProjects } from "../global.js";

(async () => {
  const container = document.getElementById("projects-list");
  if (!container) return;

  const projects = await fetchJSON("../lib/projects.json");
  renderProjects(projects, container, "h2");

  const titleEl = document.querySelector("main h1") || document.querySelector("h1");
  if (titleEl) titleEl.textContent = `(${projects.length}) Projects`;

  // arc section 
  const byYear = new Map();
  for (const p of projects) {
    const y = p.year ?? "Unknown";
    byYear.set(y, (byYear.get(y) || 0) + 1);
  }

  const entries = Array.from(byYear.entries()).sort((a, b) => d3.ascending(a[0], b[0]));

  const pie = d3.pie()
    .value(d => d[1])
    .sort(null);

  // arc creation
  const arc = d3.arc()
    .innerRadius(10)
    .outerRadius(50);

  const svg = d3.select("#projects-pie-plot");
  svg.selectAll("*").remove(); 

  const color = d3.scaleOrdinal()
    .domain(entries.map(d => d[0]))
    .range(d3.schemeTableau10);

  // slices and optional labels
  const slices = svg.selectAll("path.slice")
    .data(pie(entries))
    .join("path")
      .attr("class", "slice")
      .attr("d", arc)
      .attr("fill", d => color(d.data[0]))
      .attr("stroke", "white")
      .attr("stroke-width", 1);

  svg.selectAll("text.label")
    .data(pie(entries))
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
      .text(d => d.data[0]);
})();
