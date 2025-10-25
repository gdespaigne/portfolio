import { fetchJSON, renderProjects } from './global.js';

(async () => {
  const projects = await fetchJSON('/portfolio/lib/projects.json');
  const latestProjects = projects.slice(0, 3);

  const container = document.querySelector('.projects');
  if (!container) return;

  renderProjects(latestProjects, container, 'h3');
})();
