import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const container = document.getElementById('projects-list');
  if (!container) return;

  const projects = await fetchJSON('../lib/projects.json');
  renderProjects(projects, container, 'h2');
})();

const titleEl = document.querySelector('main h1') || document.querySelector('h1');
if (titleEl) {
  titleEl.textContent = `(${projects.length}) Projects`;
}