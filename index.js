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
      const githubData = await fetchGitHubData('gdespaigne'); 
      console.log(githubData);

      if (githubData && !githubData.message) {
        profileStats.innerHTML = `
          <div class="stat">
            <dt>Public Repos</dt><dd>${githubData.public_repos}</dd>
          </div>
          <div class="stat">
            <dt>Public Gists</dt><dd>${githubData.public_gists}</dd>
          </div>
          <div class="stat">
            <dt>Followers</dt><dd>${githubData.followers}</dd>
          </div>
          <div class="stat">
            <dt>Following</dt><dd>${githubData.following}</dd>
          </div>
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

