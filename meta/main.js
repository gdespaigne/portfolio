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
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
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
        configurable: false,
        writable: false,
        enumerable: false,
      });

      return ret;
    });
}

function formatHourFrac(hourFrac) {
  if (hourFrac == null || Number.isNaN(hourFrac)) return 'N/A';

  let h = Math.floor(hourFrac);
  let m = Math.round((hourFrac - h) * 60);

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

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total LOC');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total Commits');
  dl.append('dd').text(commits.length);

  const fileSet = new Set(data.map((d) => d.file));
  const numFiles = fileSet.size;

  dl.append('dt').text('Files in Codebase');
  dl.append('dd').text(numFiles);

  const avgFileLength = numFiles ? data.length / numFiles : 0;
  dl.append('dt').text('Avg. Line of Code Length');
  dl.append('dd').text(avgFileLength.toFixed(1));

  const avgHourFrac = d3.mean(commits, (c) => c.hourFrac);
  dl.append('dt').text('Avg. TOD Worked');
  dl.append('dd').text(formatHourFrac(avgHourFrac));

  const weekdayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];
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

  dl.append('dt').text('Most Active Day of Week Worked');
  dl.append('dd').text(mostActiveDay);
}

let data = await loadData();
let commits = processCommits(data);
renderCommitInfo(data, commits);
