export const wheelState = {
  sectors: [],
  customLabels: {},
  currentPalette: 'Pastel Goth',
  shuffledPalette: [],
  palettes: {},
  paletteNames: ['Default', 'Pastel Goth', 'Woodsy'],
  ang: 0,
  isSpinning: false
};

let canvas, ctx, rad, spinButton, arc;
const TAU = 2 * Math.PI;

// Physics Config
const FRICTION = 0.982;
const MIN_SPIN_SPEED = 0.003;
let angVel = 0;
let angVelMax = 0;
let isAccelerating = false;
let animFrame = null;

export function initWheel(canvasEl, spinBtnEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  rad = canvas.width / 2;
  spinButton = spinBtnEl;
}

export function generatePalette(name) {
  switch (name) {
    case 'Default': return ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
                            '#BB8FCE','#85C1E9','#F8C471','#82E0AA','#F1948A','#85C1E9','#D7BDE2','#FAD7A0'];
    case 'Pastel Goth': return ['#F8BBD9','#E1BEE7','#C5CAE9','#BBDEFB','#C8E6C9','#DCEDC8','#E8E8E8','#D3D3D3',
                                '#C0C0C0','#A9A9A9','#FFCCBC','#E8B4B8','#D4A5A5','#B8A9C9','#A5B4FC','#9CAF88'];
    case 'Woodsy': return ['#8B4513','#654321','#A0522D','#CD853F','#DEB887','#8B7355','#A0522D','#D2691E',
        '#B8860B','#8B6914','#556B2F','#6B8E23','#228B22','#32CD32','#90EE90','#98FB98'];
    default: return ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F',
        '#BB8FCE','#85C1E9','#F8C471','#82E0AA','#F1948A','#85C1E9','#D7BDE2','#FAD7A0'];
  }
}

export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initPalettes(paletteSelect) {
  wheelState.paletteNames.forEach((name) => {
    wheelState.palettes[name] = generatePalette(name);
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    paletteSelect.appendChild(opt);
  });
}

export function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  arc = TAU / wheelState.sectors.length;
  wheelState.sectors.forEach(drawSector);
  rotate();
}

function drawSector(sector, i) {
  const startAngle = arc * i - Math.PI / 2;
  const endAngle = arc * (i + 1) - Math.PI / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rad, rad);
  ctx.arc(rad, rad, rad - 2, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = sector.color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();

  const textStartAngle = arc * i;
  let fontSize = sector.label.length <= 10 ? 20 : 18;
  while (!drawArcText(ctx, sector.label, textStartAngle, arc, rad, fontSize, wheelState.currentPalette === 'Pastel Goth') && fontSize > 10) {
    fontSize--;
  }
  ctx.restore();
}

function drawArcText(ctx, text, startAngle, arc, radius, fontSize, isPastelGoth) {
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = isPastelGoth ? '#333' : '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = [];
  const chars = Array.from(text);
  let charIndex = 0,
    baseRadius = rad * 0.85;
  const maxLines = Math.floor(baseRadius / fontSize);
  for (let l = 0; l < maxLines - 2 && charIndex < chars.length; l++) {
    const r = baseRadius - l * fontSize;
    const effectiveArcLength = arc * r * 0.9;
    const lineChars = [];
    let lineWidth = 0;
    let wasInWord = false;

    while (charIndex < chars.length) {
      const char = chars[charIndex];
      const charWidth = ctx.measureText(char).width;

      if (lineWidth + charWidth > effectiveArcLength) {
        if (wasInWord && char !== ' ') {
          lineChars.push('-');
        }
        break;
      }

      lineChars.push(char);
      lineWidth += charWidth;
      wasInWord = char !== ' ';
      charIndex++;
    }

    lines.push({ text: lineChars.join(''), r });
  }
  if (charIndex < chars.length) {
    ctx.restore();
    return false;
  }

  for (let l = 0; l < lines.length; l++) {
    const { text, r } = lines[l];
    const charWidths = Array.from(text).map((char) => ctx.measureText(char).width);
    const totalWidth = charWidths.reduce((a, b) => a + b, 0);
    const angularWidth = totalWidth / r;
    let angle = startAngle + (arc - angularWidth) / 2;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];
      const charAngle = charWidth / r;
      ctx.save();
      ctx.translate(rad, rad);
      ctx.rotate(angle + charAngle / 2);
      ctx.translate(0, -r);
      ctx.fillText(char, 0, 0);
      ctx.restore();
      angle += charAngle;
    }
  }
  ctx.restore();
  return true;
}

function rotate() {
  const index = getSectorIndex();
  const sector = wheelState.sectors[index];
  canvas.style.transform = `rotate(${wheelState.ang - Math.PI / 2}rad)`;
  spinButton.textContent = angVel ? '' : 'SPIN';
  spinButton.style.background = sector.color;
}

export function getSectorIndex() {
  const adjusted = (wheelState.ang - Math.PI / 2 + TAU) % TAU;
  return Math.floor(wheelState.sectors.length - (adjusted / TAU) * wheelState.sectors.length) % wheelState.sectors.length;
}

export function spin() {
  if (wheelState.isSpinning) return;
  wheelState.isSpinning = true;
  isAccelerating = true;
  angVelMax = Math.random() * (0.25 - 0.18) + 0.18;
  frame();
}

function frame() {
  if (!wheelState.isSpinning) return;
  if (isAccelerating) {
    angVel += 0.01;
    if (angVel >= angVelMax) {
      isAccelerating = false;
      angVel = angVelMax;
    }
  } else {
    angVel *= FRICTION;
    if (angVel < MIN_SPIN_SPEED) {
      wheelState.isSpinning = false;
      angVel = 0;
      cancelAnimationFrame(animFrame);
    }
  }
  wheelState.ang += angVel;
  wheelState.ang %= TAU;
  rotate();
  animFrame = requestAnimationFrame(frame);
}

export function assignPaletteColorsToSectors(count, palette) {
  return Array.from({ length: count }, (_, i) => ({
    color: palette[i % palette.length],
    label: wheelState.customLabels[i] || `Slice ${i + 1}`,
  }));
}

export function resizeSectorsKeepColors(newCount) {
  const oldSectors = wheelState.sectors || [];
  wheelState.sectors = Array.from({ length: newCount }, (_, i) => {
    if (i < oldSectors.length && oldSectors[i]) {
      return {
        color: oldSectors[i].color,
        label: wheelState.customLabels[i] || oldSectors[i].label || `Slice ${i + 1}`,
      };
    }
    return {
      color: wheelState.shuffledPalette[i % wheelState.shuffledPalette.length],
      label: wheelState.customLabels[i] || `Slice ${i + 1}`,
    };
  });
}

export function shuffleSectorColors() {
  const shuffled = shuffleArray(wheelState.shuffledPalette);
  let colorPool = [...shuffled];
  for (let i = 0; i < wheelState.sectors.length; i++) {
    if (colorPool.length === 0) colorPool = shuffleArray(wheelState.shuffledPalette);
    wheelState.sectors[i].color = colorPool.pop();
  }
}

// encapsulate the histogram logic so main.js doesn't need to know about angles
export function getSpinStats(spins) {
  const counts = Array(wheelState.sectors.length).fill(0);
  const originalAng = wheelState.ang;
  for (let i = 0; i < spins; i++) {
    wheelState.ang = Math.random() * TAU;
    counts[getSectorIndex()]++;
  }
  wheelState.ang = originalAng;
  return counts;
}
