import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const container = document.getElementById('projects-list');
  if (!container) return;

  const projects = await fetchJSON('../lib/projects.json');
  renderProjects(projects, container, 'h2');
})();