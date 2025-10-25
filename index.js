import { fetchJSON, renderProjects } from './global.js';

(async () => {
  const projects = await fetchJSON('/portfolio/lib/projects.json');
  const latestProjects = projects.slice(0, 3);

  const container = document.querySelector('.projects');
  if (!container) return;

  renderProjects(latestProjects, container, 'h3');
})();

const statsEl = document.getElementById('github-stats');
if (!statsEl) return;

const data = await fetchGitHubData('gdespaigne');

// simple definition list
if (data && !data.message) {
  statsEl.innerHTML = `
    <dl>
      <dt>public repos</dt><dd>${data.public_repos}</dd>
      <dt>public gists</dt><dd>${data.public_gists}</dd>
      <dt>followers</dt><dd>${data.followers}</dd>
      <dt>following</dt><dd>${data.following}</dd>
    </dl>
  `;
} else {
  // fallback if rate-limited or username typo
  statsEl.textContent = 'unable to load github stats right now.';
};