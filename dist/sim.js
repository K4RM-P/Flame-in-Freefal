'use strict';
{
  const view = byId('cabin-view');
  let ctx = view.getContext('2d');
  const flow = byId('sim-flow');
  const gravity = byId('sim-gravity');
  const particleSize = byId('sim-size');
  let settlingSpeed = 0;
  const sourceControl = byId('sim-source');
  const sensorControl = byId('sim-sensor');
  const angle = byId('sim-view');
  const preset = byId('sim-preset');
  const runButton = byId('sim-run');
  const sourcePoint = () => [-2.35, 0, sourceControl.value === '0' ? 0 : -0.87];
  const sensorPoint = () => [2.05, 0, sensorControl.value === '0' ? 0 : 0.87];
  const rings = [-3, -2, 0, 2, 3];
  const wallRadius = 1.25;
  const circle = (at, radius = wallRadius) => Array.from({length: 17}, (_, i) => {
    const phase = i * Math.PI / 8;
    return [at, radius * Math.cos(phase), radius * Math.sin(phase)];
  });
  let particles = [];
  let elapsed = 0;
  let arrival = null;
  let hits = 0;
  let running = false;
  let lastFrame = 0;
  let frame = 0;
  let accumulator = 0;
  let seed = 1;
  const step = 0.05;
  const duration = 60;
  const displayScale = 2;
  const mixing = 0.012;
  function uniform() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  }
  function normal() {
    return Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  }
  function project([x,y,z]) {
    const yaw = Number(angle.value) * Math.PI / 180;
    const side = x * Math.cos(yaw) + z * Math.sin(yaw);
    const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const screenedY = y * 0.93 + depth * 0.37;
    const scale = 110 * 8 / (8 + depth * 0.85 - y * 0.3);
    return [450 + side * scale, 247 - screenedY * scale, scale, depth];
  }
  function line(points, color, width = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach((point,index) => {
      const [x,y] = project(point);
      if (index === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }
  function dot(point, radius, color) {
    const [x,y,scale] = project(point);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x,y,radius * scale / 110,0,Math.PI * 2);
    ctx.fill();
  }
  function shadeFace(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, i) => {
      const [x,y] = project(point);
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fill();
  }
  function targetHalo(point, color) {
    const [x,y] = project(point);
    const halo = ctx.createRadialGradient(x,y,1,x,y,35);
    halo.addColorStop(0,color);
    halo.addColorStop(1,'transparent');
    ctx.fillStyle = halo;
    ctx.fillRect(x-35,y-35,70,70);
  }
  function drawCabin(target = view, cloud = particles, source = sourcePoint(), sensor = sensorPoint(), first = arrival, speed = Number(flow.value), sample = 0, rack = null) {
    ctx = target.getContext('2d');
    const bg = ctx.createLinearGradient(0, 0, 0, target.height);
    bg.addColorStop(0, '#121f2a');
    bg.addColorStop(1, '#06090f');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,target.width,target.height);
    ctx.lineJoin = 'round';
    const ribs = rings.map(at => circle(at));
    const panels = ribs[0].slice(0,16).map((point,i) => [
      point,ribs[0][i+1],ribs[4][i+1],ribs[4][i]
    ]).filter(face => face[0][1] <= 0 && face[1][1] <= 0);
    panels.sort((a,b) => project(b[0])[3]-project(a[0])[3]);
    panels.forEach((face,i) => shadeFace(face,i%2 ? '#121d2a' : '#192939'));
    for (const z of [-0.62,0.62]) {
      line([[-2.85,-0.94,z],[2.85,-0.94,z]], '#265472', 3);
    }
    for (const radius of [0.26, 0.48, 0.92]) {
      line(circle(-3, radius), '#344054');
      line(circle(3, radius), '#344054');
    }
    const [sensorX,sensorY,sensorZ] = sensor;
    const samplingRing = circle(sensorX, 0.25).map(([x,y,z]) => [x,y+sensorY,z+sensorZ]);
    ctx.setLineDash([4,5]);
    line(samplingRing, '#75cce2', 1.5);
    ctx.setLineDash([]);
    ribs.forEach((rib,i) => line(rib, i === 0 || i === 4 ? '#8191a8' : '#414c5f', 1.5));
    for (let i = 0; i < 16; i += 2) line(ribs.map(rib => rib[i]), '#3b4554');
    line(circle(-3,0.67), '#748291');
    line(circle(3,0.68), '#748291');
    for (const y of [-0.7, 0.7]) {
      ctx.setLineDash([6,8]);
      line([[-2.85,y,0],[2.85,y,0]], '#415267');
      ctx.setLineDash([]);
    }
    if (speed > 0) {
      for (const x of [-1.35,0,1.35]) {
        line([[x-0.24,-0.93,0],[x+0.24,-0.93,0]], '#7199b4', 2);
        line([[x+0.1,-0.81,0],[x+0.24,-0.93,0],[x+0.1,-1.05,0]], '#7199b4', 2);
      }
    }
    if (rack !== null) {
      const edges = [-1,1].flatMap(x => [-1,1].flatMap(y => [-1,1].map(z => [x*0.25, y*0.55, rack + z*0.28])));
      const faces = [[0,1,3,2],[4,5,7,6],[0,1,5,4],[2,3,7,6],[0,2,6,4],[1,3,7,5]];
      faces.sort((a,b) => b.reduce((sum,i)=>sum+project(edges[i])[3],0) -
        a.reduce((sum,i)=>sum+project(edges[i])[3],0));
      faces.forEach((face,i) => shadeFace(face.map(index=>edges[index]), i%2 ? '#634031' : '#463128'));
      for (const [a,b] of [[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]]) {
        line([edges[a],edges[b]], '#f8a76e', 2);
      }
    }
    targetHalo(source,'#ff7a3655');
    targetHalo(sensor, first === null ? '#45baff44' : '#38dfff80');
    cloud.map(p => [p,project(p.position)[3]]).sort((a,b)=>b[1]-a[1]).forEach(([p]) => {
      dot(p.position, p.sampled[sample] ? 3 : 2.6, p.sampled[sample] ? '#83dfff' : '#ff9d5cbb');
    });
    dot(source,12,'#a24020');
    dot(source,6,'#ffd3a4');
    dot(sensor,first === null ? 10 : 14,first === null ? '#397b9f' : '#3bbed7');
    dot(sensor,4,'#daf9ff');
    if (target !== view) {
      ctx.font = '700 19px system-ui';
      ctx.fillStyle = '#dcecf8';
      ctx.fillText(sample === 0 ? 'DETECTOR A' : 'DETECTOR B',28,42);
      ctx.font = '600 15px system-ui';
      ctx.fillStyle = '#9db0c0';
      ctx.fillText(first === null ? 'AWAITING SAMPLE' : 'FIRST SAMPLE  ' + first.toFixed(1) + ' s',28,68);
    }
  }
  function updateReadouts() {
    byId('sim-time').textContent = elapsed.toFixed(1) + ' s';
    byId('sim-arrival').textContent = arrival === null ? '—' : arrival.toFixed(1) + ' s';
    byId('sim-count').textContent = String(hits);
  }
  function advance(cloud, time, source, sensors, speed, settling, onHit, rack = null) {
    if (time <= 8) {
      for (let i = 0; i < 3; i++) {
        cloud.push({position:source.map(v => v + 0.035 * normal()), sampled:[]});
      }
    }
    const sigma = Math.sqrt(2 * mixing * step);
    for (const p of cloud) {
      const position = p.position;
      const [x,y,z] = position;
      const [axial,lateral] = rack === null ? [speed/100,0] : rackFlow(x,z,rack);
      position[0] += axial * step + sigma * normal();
      position[1] += sigma * normal() - settling * step;
      position[2] += lateral * step + sigma * normal();
      if (rack !== null && Math.abs(position[0]) < 0.25 && Math.abs(position[1]) < 0.55 &&
          Math.abs(position[2] - rack) < 0.28) {
        position[0] = x;
        position[1] = y;
        position[2] = z;
      }
      const radial = Math.hypot(position[1],position[2]);
      if (radial > wallRadius) {
        const scale = Math.max(0, 2 * wallRadius - radial) / radial;
        position[1] *= scale;
        position[2] *= scale;
      }
      if (position[0] < -3) position[0] = -6 - position[0];
      for (const [i, sensor] of sensors.entries()) {
        if (p.sampled[i]) continue;
        const dx = position[0] - sensor[0];
        const dy = position[1] - sensor[1];
        const dz = position[2] - sensor[2];
        if (dx*dx + dy*dy + dz*dz <= 0.25**2) {
          p.sampled[i] = true;
          onHit(i);
        }
      }
    }
    return cloud.filter(p => p.position[0] <= 3);
  }
  function integrate() {
    elapsed += step;
    particles = advance(particles, elapsed, sourcePoint(), [sensorPoint()], Number(flow.value), settlingSpeed, () => {
      hits++;
      if (arrival === null) {
        arrival = elapsed;
        byId('sim-status').textContent = 'First particle entered the simulated sampling zone.';
      }
    });
  }
  function tick(now) {
    if (lastFrame) accumulator += Math.min(0.10,(now-lastFrame)/1000)*displayScale;
    lastFrame = now;
    while (accumulator >= step && elapsed < duration - step / 2) {
      integrate();
      accumulator -= step;
    }
    drawCabin();
    updateReadouts();
    if (elapsed >= duration - step / 2) {
      running = false;
      runButton.textContent = 'Run again';
      byId('sim-status').textContent = hits
        ? 'Run complete. Change ventilation or detector placement and compare first arrival.'
        : 'Run complete. The detector sampled zero particles in this interval.';
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function settlingVelocity(g, diameter) {
    const meanFreePath = 66e-9;
    const slip = 1 + 2 * meanFreePath / diameter *
      (1.257 + 0.4 * Math.exp(-1.1 * diameter / (2 * meanFreePath)));
    return (1000 - 1.2) * g * diameter ** 2 * slip / (18 * 1.81e-5);
  }
  function updateGravityModel() {
    const g = Number(gravity.value);
    const diameterMicrometers = Number(particleSize.value);
    const diameter = diameterMicrometers * 1e-6;
    const speed = Number(flow.value) / 100;
    settlingSpeed = settlingVelocity(g, diameter);
    const richardson = g * (30 / 293) * 0.1 / speed ** 2;
    byId('sim-size-out').textContent = diameterMicrometers.toFixed(1) + ' µm';
    byId('sim-ri').textContent = speed === 0 ? 'Undefined · fan off' : richardson.toPrecision(3);
    const mmPerSecond = settlingSpeed * 1000;
    byId('sim-settling').textContent = (mmPerSecond > 0 && mmPerSecond < 0.001
      ? mmPerSecond.toExponential(2) : mmPerSecond.toFixed(3)) + ' mm/s';
  }
  function updateTransportModel() {
    const speed = Number(flow.value) / 100;
    const distance = sensorPoint()[0] - sourcePoint()[0];
    const peclet = speed * distance / mixing;
    const mode = distance ** 2 / (Math.hypot(3 * mixing, speed * distance) + 3 * mixing);
    byId('transport-pe').textContent = peclet.toFixed(1);
    byId('transport-mode').textContent = mode.toFixed(1) + ' s';
    byId('transport-mean').textContent = speed > 0 ? (distance / speed).toFixed(1) + ' s' : 'No finite mean';
    byId('transport-note').textContent = speed === 0
      ? 'At zero directed flow, the ideal model has a finite peak crossing time and a long tail with no finite mean.'
      : 'L = ' + distance.toFixed(2) + ' m. The mean and peak refer to a single particle crossing a plane.';
  }
  function reset() {
    cancelAnimationFrame(frame);
    running = false;
    elapsed = lastFrame = accumulator = hits = 0;
    seed = 1;
    arrival = null;
    particles = [];
    byId('sim-flow-label').textContent = flow.value + ' cm/s';
    byId('sim-status').textContent = 'Ready to run. Playback advances at 2× model time.';
    runButton.textContent = 'Start smoke release';
    updateReadouts();
    updateTransportModel();
    updateGravityModel();
    drawCabin();
  }
  runButton.addEventListener('click',() => {
    if (running) {
      cancelAnimationFrame(frame);
      running = false;
      runButton.textContent = 'Resume';
      byId('sim-status').textContent = 'Paused.';
      return;
    }
    if (elapsed >= duration - step / 2) reset();
    running = true;
    lastFrame = 0;
    runButton.textContent = 'Pause';
    byId('sim-status').textContent = 'Smoke transport running.';
    frame = requestAnimationFrame(tick);
  });
  byId('sim-reset').addEventListener('click', reset);
  const setups = {
    guided: ['20','0','0'],
    still: ['0','0','0'],
    offset: ['20','0','1']
  };
  preset.addEventListener('change', () => {
    const setup = setups[preset.value];
    if (!setup) return;
    [flow.value, sourceControl.value, sensorControl.value] = setup;
    gravity.value = '0';
    particleSize.value = '0.3';
    reset();
  });
  [flow,sourceControl,sensorControl,gravity,particleSize].forEach(control=>control.addEventListener('input', () => {
    preset.value = 'custom';
    reset();
  }));
  byId('sim-home').addEventListener('click', () => {
    angle.value = '-22';
    drawCabin();
  });
  angle.addEventListener('input', () => drawCabin());
  let dragX = null;
  view.addEventListener('pointerdown',event=>{
    dragX = event.clientX;
    view.setPointerCapture(event.pointerId);
  });
  view.addEventListener('pointermove',event=>{
    if (dragX === null) return;
    angle.value = String((Number(angle.value) + (event.clientX-dragX)*0.6 + 540)%360-180);
    dragX = event.clientX;
    drawCabin();
  });
  view.addEventListener('lostpointercapture',()=>{dragX = null;});
  const lunarSource = [-2.35, 0, 0];
  const lunarSensors = [[2.05, 0, 0], [2.05, 0, 0.87]];
  const lunarSettling = settlingVelocity(1.62, 0.3e-6);
  const comparisonViews = [byId('detector-a'), byId('detector-b')];
  const comparisonReadouts = [byId('compare-a'), byId('compare-b')];
  const comparisonStatus = byId('compare-progress');
  const comparePlay = byId('compare-play');
  const compareTrials = byId('compare-trials');

  const rackEnabled = byId('rack-enabled');
  const rackPosition = byId('rack-position');
  const map = byId('rack-map');
  const rackSetting = () => rackEnabled.checked ? Number(rackPosition.value) : null;
  function rackFlow(x, z, rack) {
    const offset = z - rack;
    const shadow = Math.exp(-((offset / 0.39)**2) - ((x / (x < 0 ? 0.48 : 1.35))**2));
    const around = Math.exp(-((x / 0.73)**2) - ((offset / 0.66)**2));
    const wake = 0.2 * (1 - 0.82 * shadow);
    const diverted = 0.14 * around * Math.tanh(offset / 0.11);
    return [wake, diverted];
  }
  function drawRackMap(rack, sensors = lunarSensors) {
    const paint = map.getContext('2d');
    const left = 48, top = 24, width = 625, height = 225;
    const px = x => left + (x+3)/6 * width;
    const py = z => top + (1.25-z)/2.5 * height;
    paint.fillStyle = '#101116';
    paint.fillRect(0,0,map.width,map.height);
    for (let i = 0; i < 75; i++) {
      for (let j = 0; j < 30; j++) {
        const x = -3 + (i+0.5)*6/75;
        const z = 1.25 - (j+0.5)*2.5/30;
        const velocity = rack === null ? 0.2 : Math.hypot(...rackFlow(x,z,rack));
        paint.fillStyle = 'hsl(' + (225-200*Math.min(1,velocity/0.25)) + ' 72% ' + (25+26*velocity/0.25) + '%)';
        paint.fillRect(left+i*width/75,top+j*height/30,width/75+1,height/30+1);
      }
    }
    paint.strokeStyle = '#ffffffa0';
    paint.lineWidth = 1.6;
    for (let x = -2.7; x < 2.8; x += 0.6) {
      for (const z of [-0.94,-0.47,0,0.47,0.94]) {
        if (rack !== null && Math.abs(x) < 0.25 && Math.abs(z-rack) < 0.28) continue;
        const [u,v] = rack === null ? [0.2,0] : rackFlow(x,z,rack);
        const a = px(x), b = py(z);
        const c = a + u*115, d = b - v*115;
        const theta = Math.atan2(d-b,c-a);
        paint.beginPath();
        paint.moveTo(a,b);
        paint.lineTo(c,d);
        paint.lineTo(c-5*Math.cos(theta-0.5),d-5*Math.sin(theta-0.5));
        paint.moveTo(c,d);
        paint.lineTo(c-5*Math.cos(theta+0.5),d-5*Math.sin(theta+0.5));
        paint.stroke();
      }
    }
    if (rack !== null) {
      paint.fillStyle = '#17191e';
      paint.fillRect(px(-0.25),py(rack+0.28),px(0.25)-px(-0.25),py(rack-0.28)-py(rack+0.28));
    }
    paint.fillStyle = '#ffe1c7';
    paint.font = 'bold 16px system-ui';
    paint.fillText('● Source',px(-2.85),py(0.16));
    paint.fillStyle = '#e4f8ff';
    sensors.forEach(([x,,z], i) => paint.fillText(i === 0 ? '● A' : '● B', px(x), py(z)));
    paint.fillText('Along the cabin →',left,283);
    byId('rack-max').textContent = '25 cm/s scale';
  }

  function comparisonTrial(initialSeed, rack = rackSetting(), sensors = lunarSensors) {
    let rng = initialSeed;
    let cloud = [];
    let index = 0;
    const times = sensors.map(() => null);
    const counts = sensors.map(() => 0);
    return {
      times, counts, rack, sensors,
      get time() { return index * step; },
      get cloud() { return cloud; },
      next() {
        const previousSeed = seed;
        seed = rng;
        index++;
        cloud = advance(cloud, index * step, lunarSource, sensors, 20, lunarSettling, detector => {
          counts[detector]++;
          times[detector] ??= index * step;
        }, rack);
        rng = seed;
        seed = previousSeed;
      }
    };
  }

  function showComparison(trial) {
    byId('compare-clock').textContent = trial.time.toFixed(1) + ' / 60.0 s';
    byId('compare-timeline').value = trial.time;
    comparisonViews.forEach((canvas, i) => {
      drawCabin(canvas, trial.cloud, lunarSource, trial.sensors[i], trial.times[i], 20, i, trial.rack);
      comparisonReadouts[i].textContent = trial.times[i] === null
        ? 'No particles sampled yet'
        : trial.times[i].toFixed(1) + ' s first arrival · ' + trial.counts[i] + ' sampled';
    });
  }

  function replayComparison(trial, labels, deadline = null) {
    drawRackMap(trial.rack, trial.sensors);
    comparePlay.disabled = compareTrials.disabled = rackEnabled.disabled = rackPosition.disabled = true;
    byId('opt-replay').disabled = byId('opt-miss').disabled = true;
    byId('detector-a').setAttribute('aria-label', 'Cabin view A: ' + labels[0]);
    byId('detector-b').setAttribute('aria-label', 'Cabin view B: ' + labels[1]);
    byId('compare-name-a').textContent = labels[0];
    byId('compare-name-b').textContent = labels[1];
    byId('compare-results').hidden = true;
    let start;
    function playback(now) {
      start ??= now;
      const target = Math.min(duration, (now - start) / 1000 * 4);
      while (trial.time + step <= target + 1e-8) trial.next();
      showComparison(trial);
      comparisonStatus.textContent = trial.time >= duration
        ? 'Replay complete · 60 s model window'
        : 'Replay running at 4× model time.';
      if (deadline !== null) comparisonStatus.textContent += ' · Candidate deadline: ' + deadline + ' s.';
      if (target < duration) requestAnimationFrame(playback);
      else {
        comparisonReadouts.forEach((label, i) => {
          if (trial.times[i] === null) label.textContent = 'No particles sampled by 60 s';
        });
        comparePlay.disabled = compareTrials.disabled = rackEnabled.disabled = false;
        rackPosition.disabled = !rackEnabled.checked;
        showCandidate();
      }
    }
    requestAnimationFrame(playback);
  }
  comparePlay.addEventListener('click', () => replayComparison(comparisonTrial(1), ['Centerline detector','Near-wall detector']));

  compareTrials.addEventListener('click', async () => {
    comparePlay.disabled = compareTrials.disabled = rackEnabled.disabled = rackPosition.disabled = true;
    showCandidate();
    const totals = [[], []];
    const earlier = [0, 0];
    let ties = 0;
    try {
      for (let run = 1; run <= 30; run++) {
        comparisonStatus.textContent = 'Running paired trial ' + run + ' of 30…';
        await new Promise(requestAnimationFrame);
        const trial = comparisonTrial(run);
        while (trial.time < duration) trial.next();
        trial.times.forEach((time, i) => { if (time !== null) totals[i].push(time); });
        const [center, wall] = trial.times.map(time => time ?? Infinity);
        if (center === wall) ties++;
        else earlier[center < wall ? 0 : 1]++;

      }
      totals.forEach(times => times.sort((a,b) => a-b));
      const labels = ['Centerline', 'Near wall'];
      byId('compare-summary').innerHTML = totals.map((times, i) => {
        const count = times.length;
        const median = (times[Math.floor((count-1)/2)] + times[Math.floor(count/2)]) / 2;
        const range = count ? times[0].toFixed(1) + '–' + times[count-1].toFixed(1) + ' s' : '—';
        return '<tr><th scope="row">' + labels[i] + '</th><td>' + (30-count) + '/30</td><td>' +
          (count ? median.toFixed(1) + ' s' : '—') + '</td><td>' + range + '</td></tr>';
      }).join('');
      byId('compare-results').hidden = false;
      comparisonStatus.textContent = '30 paired trials · Centerline earlier: ' + earlier[0] +
        ' · Near wall earlier: ' + earlier[1] + ' · Tie or neither sampled: ' + ties;
    } finally {
      comparePlay.disabled = compareTrials.disabled = rackEnabled.disabled = false;
        rackPosition.disabled = !rackEnabled.checked;
      showCandidate();
    }
  });
  const candidates = [0.9,0.45,0,-0.45,-0.9].flatMap(z =>
    [0.75,1.35,1.95,2.55].map(x => [x,0,z]));
  const optimizerRun = byId('opt-run');
  const deadlineControl = byId('opt-deadline');
  const optimizerStatus = byId('opt-status');
  const optGrid = byId('opt-grid');
  let scan = [];
  let selected = 0;
  const location = point => point[0].toFixed(2) + ' m axial, ' + point[2].toFixed(2) + ' m lateral';
  function showCandidate() {
    const item = scan[selected];
    const busy = comparePlay.disabled;
    byId('opt-replay').disabled = !item || busy;
    byId('opt-miss').disabled = !item?.miss || busy;
    if (!item) return;
    for (const [index, tile] of Array.from(optGrid.children).entries()) {
      tile.setAttribute('aria-pressed', String(index === selected));
    }
    byId('opt-detail').textContent = location(candidates[selected]) + ' · ' + item.hits + '/24 by ' +
      deadlineControl.value + ' s · Median: ' + (item.median === Infinity ? '—' : item.median.toFixed(1) + ' s') +
      ' · Worst rack layout: ' + item.worst + '/6 sampled.';
  }
  optimizerRun.addEventListener('click', async () => {
    optimizerRun.disabled = deadlineControl.disabled = true;
    byId('opt-results').hidden = true;
    const deadline = Number(deadlineControl.value);
    const layouts = [null,-0.65,0,0.65];
    scan = candidates.map(() => ({times:[], counts:[0,0,0,0], miss:null}));
    try {
      for (const [layout, rack] of layouts.entries()) {
        for (let trialSeed = 1; trialSeed <= 6; trialSeed++) {
          optimizerStatus.textContent = 'Scanning release ' + (layout*6 + trialSeed) + ' of 24…';
          await new Promise(requestAnimationFrame);
          const trial = comparisonTrial(trialSeed, rack, candidates);
          while (trial.time < deadline) trial.next();
          trial.times.forEach((time, index) => {
            const item = scan[index];
            if (time !== null && time <= deadline) {
              item.times.push(time);
              item.counts[layout]++;
            } else {
              item.miss ??= {rack, seed:trialSeed};
            }
          });
        }
      }
      scan.forEach(item => {
        item.times.sort((a,b)=>a-b);
        item.hits = item.times.length;
        item.worst = Math.min(...item.counts);
        item.median = item.hits ?
          (item.times[Math.floor((item.hits-1)/2)] + item.times[Math.floor(item.hits/2)])/2 : Infinity;
      });
      selected = scan.map((_,i)=>i).sort((a,b)=>scan[b].hits-scan[a].hits ||
        scan[a].median-scan[b].median)[0];
      optGrid.replaceChildren(...scan.map((item,index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.style.setProperty('--coverage', String(item.hits/24));
        button.textContent = Math.round(100*item.hits/24) + '%';
        button.setAttribute('aria-label', location(candidates[index]) + ', ' + button.textContent + ' sampled' +
          (index === selected ? ', ranked first' : ''));
        button.addEventListener('click', () => { selected = index; showCandidate(); });
        return button;
      }));
      const best = scan[selected];
      optimizerStatus.textContent = 'Best tested location: ' + location(candidates[selected]) +
        ' · ' + best.hits + '/24 runs sampled by ' + deadline + ' s.';
      byId('opt-results').hidden = false;
      showCandidate();
    } finally {
      optimizerRun.disabled = deadlineControl.disabled = false;
    }
  });
  deadlineControl.addEventListener('change', () => {
    scan = [];
    byId('opt-results').hidden = true;
    optimizerStatus.textContent = 'Deadline changed. Scan again to compare locations.';
  });
  function replayCandidate(miss) {
    const scenario = miss ? scan[selected].miss : {rack:rackSetting(), seed:1};
    if (!scenario) return;
    rackEnabled.checked = scenario.rack !== null;
    if (scenario.rack !== null) rackPosition.value = String(scenario.rack);
    changeRack();
    replayComparison(comparisonTrial(scenario.seed, scenario.rack, [candidates[selected], lunarSensors[0]]),
      ['Selected candidate','Centerline reference'], Number(deadlineControl.value));
    byId('detector-a').scrollIntoView({block:'center'});
  }
  byId('opt-replay').addEventListener('click', () => replayCandidate(false));
  byId('opt-miss').addEventListener('click', () => replayCandidate(true));

  function changeRack() {
    const rack = rackSetting();
    rackPosition.disabled = rack === null;
    byId('rack-position-out').textContent = rack === null ? 'Rack removed' : rack.toFixed(2) + ' m from center';
    byId('compare-results').hidden = true;
    comparisonStatus.textContent = 'Lunar gravity · 20 cm/s inlet reference · 0.3 µm particles · 60 s model window';
    byId('detector-a').setAttribute('aria-label', 'Cabin with detector on the centerline');
    byId('detector-b').setAttribute('aria-label', 'Cabin with detector near the wall');
    byId('compare-name-a').textContent = 'Centerline detector';
    byId('compare-name-b').textContent = 'Near-wall detector';
    drawRackMap(rack);
    showComparison(comparisonTrial(1));
  }
  rackEnabled.addEventListener('change', changeRack);
  rackPosition.addEventListener('input', changeRack);
  const guideButtons = document.querySelectorAll('[data-guide-step]');
  const guideNext = byId('guide-next');
  const guideContinue = document.querySelectorAll('[data-guide-continue]');
  const guideStory = byId('guide-story');
  const guideStatus = byId('guide-status');
  const guideSteps = [
    { target:'guide-airflow', story:'The rack slows the modeled flow behind it. Follow the arrows around the rack to see where smoke can be redirected.', next:'Play the 3D replay' },
    { target:'guide-replay', story:'Both detectors see the same particle trajectories. Compare first arrival and particle counts as the replay advances.', next:'Scan detector placements' },
    { target:'optimizer', story:'The scan tests each detector across four rack layouts. Select a tile to see its sampling rate or replay a missed deadline.', next:'Restart guided demo' }
  ];
  let guideIndex = -1;

  function runGuideStep(index) {
    if (comparePlay.disabled || optimizerRun.disabled) {
      guideStatus.textContent = 'Wait for the current run to finish, then continue.';
      if (comparePlay.disabled) comparisonStatus.textContent = 'Wait for the current run to finish, then continue.';
      return;
    }
    guideIndex = index;
    guideStatus.textContent = '';
    const current = guideSteps[index];
    guideStory.textContent = current.story;
    guideNext.textContent = current.next;
    for (const button of guideButtons) {
      if (Number(button.dataset.guideStep) === index) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
    guideContinue.forEach(button => { button.hidden = Number(button.dataset.guideContinue) !== index + 1; });
    if (index < 2) {
      rackEnabled.checked = true;
      rackPosition.value = '0';
      changeRack();
    }
    if (index === 1) comparePlay.click();
    if (index === 2) {
      deadlineControl.value = '20';
      optimizerRun.click();
    }
    const target = byId(current.target);
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'start'});
  }
  guideButtons.forEach(button => button.addEventListener('click', () => runGuideStep(Number(button.dataset.guideStep))));
  guideContinue.forEach(button => button.addEventListener('click', () => runGuideStep(Number(button.dataset.guideContinue))));
  guideNext.addEventListener('click', () => runGuideStep((guideIndex + 1) % guideSteps.length));
  changeRack();
  reset();
}
