import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// Global scales so brushing helpers can use them
let xScale;
let yScale;
let colors = d3.scaleOrdinal(d3.schemePastel1);

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
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
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
    .style('--r', (d) => rScale(d.totalLines)) 
    .attr('fill', 'crimson')
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
let commits = processCommits(data).sort((a, b) => a.datetime - b.datetime);

let filteredCommits = commits;

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

let commitProgress = 100;

let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0,100]);
let commitMaxTime = timeScale.invert(commitProgress);

function onTimeSliderChange() {
  commitProgress = Number(document.getElementById('commit-progress').value);
  
  commitMaxTime = timeScale.invert(commitProgress);
  
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits)
  updateFileDisplay(filteredCommits);
}

document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);

onTimeSliderChange();

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id) 
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('--r', (d) => rScale(d.totalLines)) 
    .attr('fill', 'crimson')
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
}

let filteredLines = filteredCommits.flatMap((d) => d.lines);

let files = d3
  .groups(filteredLines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  });

  function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    
    let files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
        return { name, lines };
      })
      .sort((a, b) => b.lines.length - a.lines.length); 
  
    let filesContainer = d3
      .select('#files')
      .selectAll('div')
      .data(files, (d) => d.name)
      .join(
        (enter) =>
          enter.append('div').call((div) => {
            div.append('dt').append('code');
            div.append('dd');
          }),
      );
  
      filesContainer.select('dt > code').html((d) => `${d.name} <small>(${d.lines.length} lines)</small>`);

      filesContainer
      .select('dd')
      .selectAll('div')
      .data((d) => d.lines)
      .join('div')
      .attr('class', 'loc')
      .style('--color', (d) => colors(d.type));
    }

updateFileDisplay(filteredCommits);

function renderScrollySteps() {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made <a href="${d.url}" target="_blank">${
          i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
        }</a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(
            d.lines,
            (D) => D.length,
            (d) => d.file,
          ).length
        } files.
        Then I looked over all I had made, and I saw that it was very good.
      `,
    );
}

renderScrollySteps();

function onStepEnter(response) {
  const commit = response.element.__data__;
  
  commitMaxTime = commit.datetime;
  
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

const scroller = scrollama();

scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

  function renderFilesScrollySteps() {
    d3.select('#files-story')
      .selectAll('.step')
      .data(commits)
      .join('div')
      .attr('class', 'step')
      .html(
        (d, i) => `
          On ${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short',
          })},
          I made <a href="${d.url}" target="_blank" class="step-url">${
            i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
          }</a>.
          I edited ${d.totalLines} lines across ${
            d3.rollups(
              d.lines,
              (D) => D.length,
              (d) => d.file,
            ).length
          } files.
          Then I looked over all I had made, and I saw that it was very good.
        `,
      );
  }
  
  renderFilesScrollySteps();

  function onFilesStepEnter(response) {
    const commit = response.element.__data__;
    
    const filteredForFiles = commits.filter((d) => d.datetime <= commit.datetime);
    
    updateFileDisplay(filteredForFiles);
  }
  
  const scroller2 = scrollama();
  
  scroller2
    .setup({
      container: '#scrolly-2',
      step: '#scrolly-2 .step',
    })
    .onStepEnter(onFilesStepEnter);