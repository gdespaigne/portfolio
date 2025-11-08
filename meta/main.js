import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        // change this URL to your repo if needed
        url: 'https://github.com/gdespaigne/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        // hide this property from JSON.stringify and for...in loops
        enumerable: false,
        // don’t allow reassignment of ret.lines
        writable: false,
        // don’t allow reconfiguring / deleting the property
        configurable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files in the codebase
    const fileSet = new Set(data.map((d) => d.file));
    const numFiles = fileSet.size;
  
    dl.append('dt').text('Files in codebase');
    dl.append('dd').text(numFiles);
  
    // Average file length (LOC per file)
    const avgFileLength = numFiles ? data.length / numFiles : 0;
  
    dl.append('dt').text('Average file length (LOC)');
    dl.append('dd').text(avgFileLength.toFixed(1));
  
    // Helper to format hourFrac as “h:mm am/pm”
    function formatHourFrac(hourFrac) {
      if (hourFrac == null || Number.isNaN(hourFrac)) return 'N/A';
  
      let h = Math.floor(hourFrac);
      let m = Math.round((hourFrac - h) * 60);
  
      // Handle rounding up to next hour
      if (m === 60) {
        h += 1;
        m = 0;
      }
  
      const ampm = h >= 12 ? 'pm' : 'am';
      let displayH = h % 12;
      if (displayH === 0) displayH = 12;
  
      const pad = (x) => String(x).padStart(2, '0');
      return `${displayH}:${pad(m)} ${ampm}`;
    }
  
    // Average time of day worked (using commits.hourFrac)
    const avgHourFrac = d3.mean(commits, (c) => c.hourFrac);
  
    dl.append('dt').text('Average time of day worked');
    dl.append('dd').text(formatHourFrac(avgHourFrac));
  
    // Day of week most worked on (from commits.datetime)
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
  
    commits.forEach((c) => {
      const d = c.datetime;
      if (d instanceof Date && !Number.isNaN(d)) {
        dayCounts[d.getDay()] += 1;
      }
    });
  
    let maxDayIndex = 0;
    for (let i = 1; i < 7; i += 1) {
      if (dayCounts[i] > dayCounts[maxDayIndex]) {
        maxDayIndex = i;
      }
    }
  
    const mostActiveDay =
      dayCounts.every((count) => count === 0) ? 'N/A' : weekdayNames[maxDayIndex];
  
    dl.append('dt').text('Most active day of week');
    dl.append('dd').text(mostActiveDay);
  }
  
// load and process the data
let data = await loadData();
let commits = processCommits(data);

console.log(commits);

