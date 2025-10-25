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
  const profileStats = document.querySelector('#profile-stats');
  if (profileStats) {
    try {
      const githubData = await fetchGitHubData('gdespaigne'); // fetch and parse JSON
      console.log(githubData); // for the lab's "test your knowledge" check

      if (githubData && !githubData.message) {
        profileStats.innerHTML = `
          <dl>
            <dt>public repos</dt><dd>${githubData.public_repos}</dd>
            <dt>public gists</dt><dd>${githubData.public_gists}</dd>
            <dt>followers</dt><dd>${githubData.followers}</dd>
            <dt>following</dt><dd>${githubData.following}</dd>
          </dl>
        `;
      } else {
        profileStats.textContent = 'unable to load github stats right now.';
      }
    } catch (err) {
      console.error(err);
      profileStats.textContent = 'unable to load github stats right now.';
    }
  }
})();
