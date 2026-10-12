/* Geomagnetic north = northern intersection of the centered dipole axis.
 * IGRF synthesis uses Schmidt semi-normalized P without Condon–Shortley phase.
 * Coordinates for local fields are WGS-84 geodetic; pole latitude is geocentric.
 */
'use strict';
window.MagneticPhysics = (() => {
  const R = Math.PI / 180, a = 6371200, mu0 = 4e-7 * Math.PI;
  const tasks = {1980: [-29992, -1956, 5604], 2010: [-29496, -1585, 4945]};
  function coefficients(year, scenario = 'sv') {
    if (!Number.isFinite(year) || year < 1900 || year > 2100) throw Error('模型年份范围为 1900–2100。');
    const {epochs, rows} = window.IGRF14_DATA;
    return rows.map(row => {
      const vals = row.slice(3), last = vals[25];
      let v;
      if (year <= 2025) {
        const k = Math.min(24, Math.floor((year - 1900) / 5)), t = (year - epochs[k]) / 5;
        v = vals[k] * (1 - t) + vals[k + 1] * t;
      } else {
        const sv = vals[26] || 0, end2030 = last + 5 * sv;
        const slope = scenario === 'trend' ? (last - vals[21]) / 20 : sv;
        v = year <= 2030 ? last + (year - 2025) * sv : end2030 + (year - 2030) * slope;
      }
      return {kind: row[0], n: row[1], m: row[2], v};
    });
  }
  function dipole(g0, g1, h1, radius = a) {
    if (![g0, g1, h1, radius].every(Number.isFinite) || radius <= 0) throw Error('请输入有限系数和正参考半径。');
    const strength = Math.hypot(g0, g1, h1);
    if (!strength) throw Error('零磁矩没有可定义的地磁北极。');
    const lat = Math.asin(-g0 / strength) / R;
    const lon = ((Math.atan2(-h1, -g1) / R + 540) % 360) - 180;
    return {g0, g1, h1, strength, moment: 4 * Math.PI / mu0 * radius ** 3 * strength * 1e-9,
      lat, lon, tilt: 90 - lat};
  }
  function pole(year, scenario) {
    const rows = coefficients(year, scenario);
    return {...dipole(rows[0].v, rows[1].v, rows[2].v), year};
  }
  function fieldFromRows(rows, lat, lon, height = 0, degree = 13) {
    if (![lat, lon, height].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || height < -1000 || height > 100000) throw Error('测点纬度 −90–90°，经度 −180–180°，椭球高 −1–100 km。');
    const p = lat * R, e2 = 0.0066943799901413165;
    const N = 6378137 / Math.sqrt(1 - e2 * Math.sin(p) ** 2);
    const rho = (N + height) * Math.cos(p), z = (N * (1 - e2) + height) * Math.sin(p);
    const r = Math.hypot(rho, z), geoc = Math.atan2(z, rho);
    // At the geographic poles use the limiting value in the chosen meridian.
    const theta = Math.max(1e-8, Math.min(Math.PI - 1e-8, Math.PI / 2 - geoc));
    const ct = Math.cos(theta), st = Math.sin(theta), lambda = lon * R;
    const P = Array.from({length: 14}, () => Array(14).fill(0));
    const dP = Array.from({length: 14}, () => Array(14).fill(0));
    P[0][0] = 1;
    for (let n = 1; n <= degree; n++) for (let m = 0; m <= n; m++) {
      if (m === n) {
        P[n][m] = (2 * n - 1) * st * P[n - 1][m - 1];
        dP[n][m] = (2 * n - 1) * (ct * P[n - 1][m - 1] + st * dP[n - 1][m - 1]);
      } else {
        P[n][m] = ((2 * n - 1) * ct * P[n - 1][m] - (n + m - 1) * (n > 1 ? P[n - 2][m] : 0)) / (n - m);
        dP[n][m] = ((2 * n - 1) * (-st * P[n - 1][m] + ct * dP[n - 1][m]) - (n + m - 1) * (n > 1 ? dP[n - 2][m] : 0)) / (n - m);
      }
    }
    let br = 0, bt = 0, bp = 0;
    for (const {kind, n, m, v} of rows) {
      if (n > degree) continue;
      let norm = m === 0 ? 1 : 2;
      for (let j = n - m + 1; j <= n + m; j++) norm /= j;
      norm = Math.sqrt(norm);
      const cs = Math.cos(m * lambda), sn = Math.sin(m * lambda);
      const trig = kind === 'g' ? cs : sn, trigD = kind === 'g' ? -m * sn : m * cs;
      const f = (a / r) ** (n + 2) * v * norm;
      br += (n + 1) * f * trig * P[n][m];
      bt -= f * trig * dP[n][m];
      bp -= f * trigD * P[n][m] / st;
    }
    const delta = p - geoc, X = -bt * Math.cos(delta) - br * Math.sin(delta);
    const Y = bp, Z = bt * Math.sin(delta) - br * Math.cos(delta), H = Math.hypot(X, Y);
    return {X, Y, Z, H, F: Math.hypot(H, Z), D: H < 1e-7 ? null : Math.atan2(Y, X) / R, I: Math.atan2(Z, H) / R};
  }
  function field(year, lat, lon, height, scenario) {return fieldFromRows(coefficients(year, scenario), lat, lon, height);}
  function provenance(year) {
    if (year <= 2025) return year % 5 === 0 ? 'IGRF 历元模型' : 'IGRF 历元间插值';
    if (year <= 2030) return 'IGRF 官方世变预测';
    return '趋势外推 · 非官方预测';
  }
  return {coefficients, dipole, pole, field, fieldFromRows, provenance, tasks, a, mu0};
})();
