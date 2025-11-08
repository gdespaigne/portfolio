import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Global scales so brushing helpers can use them
let xScale;
let yScale;

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
  const container = d3.select('#stats');
  container.html('');

  const dl = container.append('dl').attr('class', 'stats');

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

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;

  if (commit.datetime instanceof Date && !Number.isNaN(commit.datetime)) {
    date.textContent = commit.datetime.toLocaleString('en', {
      dateStyle: 'full',
    });
    time.textContent = commit.datetime.toLocaleTimeString('en', {
      timeStyle: 'short',
    });
  } else {
    date.textContent = '';
    time.textContent = '';
  }

  author.textContent = commit.author ?? '';
  lines.textContent = commit.totalLines ?? '';
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  if (!tooltip) return;
  const offset = 12;
  tooltip.style.left = `${event.clientX + offset}px`;
  tooltip.style.top = `${event.clientY + offset}px`;
}

// --- Brushing helpers (Step 5) ---

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const countElement = document.querySelector('#selection-count');
  if (!countElement) return [];

  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const container = document.getElementById('language-breakdown');
  if (!container) return;

  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

// --- Scatterplot, tooltips, brushing ---

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // set global scales so brushing helpers can use them
  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 20]);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  // brush setup (add brush group BEFORE dots so dots stay on top)
  const brush = d3
    .brush()
    .extent([
      [usableArea.left, usableArea.top],
      [usableArea.right, usableArea.bottom],
    ])
    .on('brush end', brushed);

  const brushG = svg.append('g').attr('class', 'brush').call(brush);

  const dots = svg.append('g').attr('class', 'dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    });

  function brushed(event) {
    const selection = event.selection;

    // highlight selected dots
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );

    const selectedCommits = renderSelectionCount(selection);
    renderLanguageBreakdown(selection);

    if (!selection || !selectedCommits || selectedCommits.length === 0) {
      renderCommitInfo(data, commits);
      return;
    }

    const idSet = new Set(selectedCommits.map((d) => d.id));
    const filteredData = data.filter((row) => idSet.has(row.commit));

    renderCommitInfo(filteredData, selectedCommits);
  }

  // double click to clear brush and reset stats
  svg.on('dblclick', () => {
    brushG.call(brush.move, null);
    renderCommitInfo(data, commits);

    // clear selection count and language breakdown too
    renderSelectionCount(null);
    renderLanguageBreakdown(null);
  });
}


let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
