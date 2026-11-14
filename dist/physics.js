'use strict';

function plotLab(canvas, { xMax, yMax, xLabel, yLabel, lines, marker }) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const left = 75;
  const top = 15;
  const right = width - 18;
  const bottom = height - 55;
  const x = value => left + value / xMax * (right - left);
  const y = value => bottom - value / yMax * (bottom - top);

  ctx.clearRect(0, 0, width, height);
  ctx.font = '17px system-ui';
  ctx.fillStyle = '#d0cbd0';
  ctx.strokeStyle = '#393640';
  ctx.lineWidth = 1;
  for (let tick = 0; tick <= 5; tick++) {
    const fraction = tick / 5;
    ctx.beginPath();
    ctx.moveTo(left, y(fraction * yMax));
    ctx.lineTo(right, y(fraction * yMax));
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(Number((fraction * yMax).toFixed(2)), left - 8, y(fraction * yMax) + 5);
    ctx.textAlign = 'center';
    ctx.fillText(Number((fraction * xMax).toFixed(2)), x(fraction * xMax), bottom + 23);
  }
  ctx.fillText(xLabel, (left + right) / 2, height - 7);
  ctx.save();
  ctx.translate(17, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  if (marker !== undefined) {
    ctx.strokeStyle = '#e9e4de';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x(marker), top);
    ctx.lineTo(x(marker), bottom);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const { color, points } of lines) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach(([a, b], index) => {
      if (index === 0) ctx.moveTo(x(a), y(b));
      else ctx.lineTo(x(a), y(b));
    });
    ctx.stroke();
  }
}

const orange = '#ff945a';
const cyan = '#7ecbff';
const oxygenInput = byId('oxygen');
function updateFlameSheet() {
  const percent = Number(oxygenInput.value);
  const moleFraction = percent / 100;
  const oxygenMolarMass = 31.998;
  const nitrogenMolarMass = 28.014;
  const heptaneMolarMass = 100.205;
  const oxygenMass = moleFraction * oxygenMolarMass;
  const oxidizerOxygen = oxygenMass / (oxygenMass + (1 - moleFraction) * nitrogenMolarMass);
  const oxygenFuelRatio = 11 * oxygenMolarMass / heptaneMolarMass;
  const flameSheet = oxidizerOxygen / (oxygenFuelRatio + oxidizerOxygen);
  byId('oxygen-value').textContent = percent + '%';
  byId('sheet-values').textContent = 'Yₒ₂,ₒₓ = ' + oxidizerOxygen.toFixed(4)
    + '  ·  s = ' + oxygenFuelRatio.toFixed(3) + ' kg O₂/kg fuel  ·  Zₛₜ = ' + flameSheet.toFixed(4);
  plotLab(byId('sheet-chart'), {
    xMax: 1, yMax: 1, xLabel: 'Mixture fraction Z', yLabel: 'Mass fraction', marker: flameSheet,
    lines: [
      { color: orange, points: [[0, 0], [flameSheet, 0], [1, 1]] },
      { color: cyan, points: [[0, oxidizerOxygen], [flameSheet, 0], [1, 0]] }
    ]
  });
}
oxygenInput.addEventListener('input', updateFlameSheet);
updateFlameSheet();

const flex = [
  { label: 'Hot', start: 3.610, end: 2.838, rate: 0.485, color: orange },
  { label: 'Cool', start: 2.838, end: 1.146, rate: 0.366, color: cyan }
];
let elapsed = 0;
const flexLines = flex.map(stage => {
  const start = elapsed;
  stage.duration = (stage.start ** 2 - stage.end ** 2) / stage.rate;
  elapsed += stage.duration;
  return { color: stage.color, points: [[start, stage.start ** 2], [elapsed, stage.end ** 2]] };
});
byId('flex-stages').innerHTML = flex.map(stage => '<tr><th scope="row">' + stage.label +
  '</th><td>' + stage.start.toFixed(3) + ' → ' + stage.end.toFixed(3) + '</td><td>' +
  stage.rate.toFixed(3) + '</td><td>' + stage.duration.toFixed(2) + '</td></tr>').join('');
plotLab(byId('flex-chart'), {
  xMax: 30, yMax: 15, xLabel: 'Reconstructed elapsed time (s)', yLabel: 'Diameter² (mm²)',
  lines: flexLines, marker: flex[0].duration
});
byId('flex-insight').textContent = 'The reported cool-stage rate was '
  + (100 * (1 - flex[1].rate / flex[0].rate)).toFixed(1)
  + '% lower than the hot-stage rate. The idealized flame sheet cannot reproduce this transition.';

const baselineInput = byId('physics-base');
const comparisonInput = byId('physics-target');
const options = samples.map((sample, index) => '<option value="' + index + '">' + sample[0] + '</option>').join('');
baselineInput.innerHTML = comparisonInput.innerHTML = options;
baselineInput.value = '1';
comparisonInput.value = '2';
function compareFlightSamples() {
  const baseline = samples[Number(baselineInput.value)];
  const comparison = samples[Number(comparisonInput.value)];
  const percent = 100 * (comparison[9] - baseline[9]) / baseline[9];
  const direction = percent > 0 ? '+' : '';
  byId('saffire-result').textContent = baseline[0] + ' → ' + comparison[0] + '  ·  '
    + baseline[9] + ' → ' + comparison[9] + ' cm  ·  ' + direction + percent.toFixed(1) + '%';
  const changes = headings.slice(1, 8).flatMap((label, index) => {
    const a = baseline[index + 1];
    const b = comparison[index + 1];
    return a === b ? [] : [label + ' ' + a + ' → ' + b];
  });
  byId('saffire-conditions').textContent = changes.length
    ? 'Changed in Table 2 — ' + changes.join(' · ')
    : 'The selected samples share all listed test conditions.';
}
baselineInput.addEventListener('change', compareFlightSamples);
comparisonInput.addEventListener('change', compareFlightSamples);
compareFlightSamples();

const scalarWidth = byId('scalar-width');
const chemicalTime = byId('chem-time');
function updateScalarDissipation() {
  const widthMm = Number(scalarWidth.value);
  const widthM = widthMm / 1000;
  const diffusivity = 2e-5;
  const gradient = 1 / widthM;
  const dissipation = 2 * diffusivity * gradient ** 2;
  byId('scalar-width-out').textContent = widthMm.toFixed(1) + ' mm';
  byId('scalar-result').textContent = '|∇Z| = ' + gradient.toFixed(0) + ' m⁻¹ · χ = ' +
    dissipation.toFixed(2) + ' s⁻¹';
  const reactionMs = Number(chemicalTime.value);
  const mixingTime = widthM ** 2 / diffusivity;
  byId('chem-time-out').textContent = reactionMs + ' ms';
  byId('chem-result').textContent = 'τmix = ' + (1000 * mixingTime).toFixed(1) +
    ' ms · Da = ' + (mixingTime / (reactionMs / 1000)).toFixed(2);
}
scalarWidth.addEventListener('input', updateScalarDissipation);
chemicalTime.addEventListener('input', updateScalarDissipation);
updateScalarDissipation();
