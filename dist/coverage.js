'use strict';
{
  const canvas = byId('coverage-chart');
  const ctx = canvas.getContext('2d');
  const oxygen = byId('map-oxygen');
  const flow = byId('map-flow');
  const pressure = byId('map-pressure');
  const x = value => 65 + (value - 10) / 30 * 535;
  const y = value => 315 - value / 40 * 288;
  const observations = samples.map(([id, material, speed, fraction, totalPressure, duct, width, length, steady, peak]) =>
    ({id, speed, fraction, totalPressure, peak}));

  byId('coverage-tests').innerHTML = observations.map(test =>
    '<tr><th scope="row">' + test.id + '</th><td>' + test.fraction + '</td><td>' + test.speed +
    '</td><td>' + test.totalPressure + '</td><td>' + test.peak + '</td></tr>').join('');

  function updateCoverage() {
    const fraction = Number(oxygen.value);
    const speed = Number(flow.value);
    const totalPressure = Number(pressure.value);
    byId('map-oxygen-out').textContent = fraction.toFixed(1) + '%';
    byId('map-flow-out').textContent = speed + ' cm/s';
    byId('map-pressure-out').textContent = totalPressure.toFixed(1) + ' kPa';
    byId('map-partial').textContent = 'O₂ partial pressure = ' + (fraction / 100 * totalPressure).toFixed(2) + ' kPa (xO₂ × P)';
    const matching = observations.filter(test =>
      test.fraction === fraction && test.speed === speed && test.totalPressure === totalPressure);
    byId('map-gap').textContent = matching.length
      ? 'Exact matches on these three variables: ' + matching.map(test => test.id).join(', ') +
        '. Check fuel, geometry and gravity before applying the results.'
      : 'None of these six samples matches all three settings. Compare the nearby points as references for planning a test.';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '15px system-ui';
    ctx.fillStyle = '#ddd7d4';
    ctx.strokeStyle = '#3b3842';
    ctx.textAlign = 'center';
    for (let tick = 10; tick <= 40; tick += 5) {
      ctx.beginPath();
      ctx.moveTo(x(tick), y(0));
      ctx.lineTo(x(tick), y(40));
      ctx.stroke();
      ctx.fillText(tick, x(tick), 338);
    }
    ctx.textAlign = 'right';
    for (let tick = 0; tick <= 40; tick += 10) {
      ctx.beginPath();
      ctx.moveTo(x(10), y(tick));
      ctx.lineTo(x(40), y(tick));
      ctx.stroke();
      ctx.fillText(tick, 54, y(tick) + 5);
    }
    ctx.textAlign = 'center';
    ctx.fillText('Oxygen mole fraction (%)', 332, 361);
    ctx.save();
    ctx.translate(17, 171);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Airflow (cm/s)', 0, 0);
    ctx.restore();
    for (const test of observations) {
      ctx.beginPath();
      ctx.fillStyle = '#ff945a';
      ctx.arc(x(test.fraction), y(test.speed), 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x(fraction), y(speed));
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#7ecbff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
  for (const input of [oxygen, flow, pressure]) input.addEventListener('input', updateCoverage);
  updateCoverage();
}
