import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

(async () => {
  // latest projects
  const projects = await fetchJSON('/portfolio/lib/projects.json');
  const latestProjects = projects.slice(0, 3);
  const projContainer = document.querySelector('.projects');
  if (projContainer) {
    renderProjects(latestProjects, projContainer, 'h3');
  }

  // github stats
  const statsEl = document.getElementById('github-stats');
  if (statsEl) {
    try {
      const data = await fetchGitHubData('gdespaigne');
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
        statsEl.textContent = 'unable to load github stats right now.';
      }
    } catch (err) {
      console.error(err);
      statsEl.textContent = 'unable to load github stats right now.';
    }
  }
})();

const githubData = await fetchGitHubData('gdespaigne');
console.log(githubData);
