export const AREA = {
  name: 'Heiligenblut am Großglockner',
  valleyStation: 1301,
  midStation: 1740,
  schareck: 2604,
  highest: 2902,
  grossglockner: 3798,
  slopeKm: 55
};

export const TERRAIN_URL = 'public/terrain/heiligenblut';

export const START = { x: 1250, z: -2900 };

export const get = (url, type) => fetch(url).then(r => {
  if (!r.ok) throw new Error(url + ' (' + r.status + ')');
  return r[type]();
});
