export const keys = new Set();
const pressed = new Set();
const block = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

addEventListener('keydown', e => {
  if (block.has(e.code)) e.preventDefault();
  if (!e.repeat) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

export const down = (...codes) => codes.some(c => keys.has(c));
export const consume = code => pressed.delete(code);
