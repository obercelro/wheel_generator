// ----------
// supabase setup
const supabaseUrl = 'https://epxtpexfozbwdfmokdrp.supabase.co';
// public 'anon' key - database protected by RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVweHRwZXhmb3pid2RmbW9rZHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMTUzNDIsImV4cCI6MjA2OTU5MTM0Mn0.Hv-RmjrWhO1a8lE_AkVzYnPZ6IXYBrJSOGoFjQg7HJQ';
let supabase = null;

function initSupabase() {
  try {
    if (window.supabase) {
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      console.log('Supabase initialized successfully');
    } else {
      console.error('Supabase library not loaded');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
}

initSupabase();
window.onload(initSupabase);
window.onload = function() {
  initSupabase();
};

// ----------
// canvas & wheel setup
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const rad = canvas.width / 2;
const TAU = 2 * Math.PI;

// ----------
// DOM elements
const spinButton = document.getElementById('spin');
const sliceSlider = document.getElementById('sliceCount');
const sliceLabel = document.getElementById('sliceCountLabel');
const editToggle = document.getElementById('editToggle');
const editControls = document.getElementById('editControls');
const editorDiv = document.getElementById('editor');
const saveButton = document.getElementById('saveWheel');
const loadDropdown = document.getElementById('loadWheelDropdown');
const paletteSelect = document.getElementById('paletteSelect');
const shuffleColorsButton = document.getElementById('shuffleColors');
const showHistogramButton = document.getElementById('showHistogram');
const editorButtons = document.getElementById('editorButtons');
const histogramContainer = document.getElementById('histogramContainer');
const storageTypeSelect = document.getElementById('storageType');
const specificColorsButton = document.getElementById('specificColors');
const specificColorsContainer = document.getElementById('specificColorsContainer');
const sliceButtonsContainer = document.getElementById('sliceButtonsContainer');

// ----------
// palette & sector data
let arc;
const paletteNames = ['Default', 'Pastel Goth', 'Woodsy'];
let currentPalette = 'Pastel Goth';
const palettes = {};
let shuffledPalette = [];
let customLabels = {};
let sectors = [];

// ----------
// pickr color picker
let currentSlice = 0;
let sliceButtons = [];
let pickr = null;

function initPickr(defaultColor) {
  // destroy previous instance if any
  if (pickr && typeof pickr.destroy === 'function') {
    pickr.destroy();
  }
  pickr = Pickr.create({
    el: '#pickrContainer',
    container: '#pickrHolder',
    inline: true,
    theme: 'classic',
    default: defaultColor || '#ffffff',
    components: {
      preview: false,
      opacity: true,
      hue: true,
      interaction: { hex: true, rgba: true, input: true, clear: false, save: false },
    },
  });

  pickr.on('change', (color) => {
    if (!sectors.length) return;
    const newColor = color.toHEXA().toString();
    sectors[currentSlice].color = newColor;
    drawWheel();
    if (sliceButtons[currentSlice]) sliceButtons[currentSlice].style.backgroundColor = newColor;
    if (editorInputs[currentSlice]) editorInputs[currentSlice].style.background = newColor;
  });
}

function highlightSelectedSliceButton(index) {
  sliceButtons.forEach((btn, i) => {
    if (!btn) return;
    if (i === index) btn.classList.add('selected');
    else btn.classList.remove('selected');
  });
}

function openColorModal(index) {
  currentSlice = index;
  document.getElementById('colorPickerModal').classList.add('active');

  const currentColor = sectors[currentSlice]?.color || '#ffffff';
  if (!pickr) initPickr(currentColor);
  else pickr.setColor(currentColor, true);

  try { pickr.show(); } catch (e) {}
  highlightSelectedSliceButton(currentSlice);
}

document.getElementById('closePickrButton').onclick = () => {
  try {
    pickr.hide();
  } catch (e) {}
  document.getElementById('colorPickerModal').classList.remove('active');
};

document.getElementById('colorPickerModal').addEventListener('click', (e) => {
  if (e.target.id === 'colorPickerModal') {
    try {
      pickr.hide();
    } catch (e) {}
    e.currentTarget.classList.remove('active');
  }
});

// ----------
// spin physics
let ang = 0;
let angVel = 0;
let angVelMax = 0;
const friction = 0.982;
const angVelMin = 0.003;
let isSpinning = false;
let isAccelerating = false;
let animFrame = null;

// ----------
// palette initialization
function generatePalette(name) {
  const count = 16;
  switch (name) {
    case 'Default':
      return [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E9',
        '#F8C471',
        '#82E0AA',
        '#F1948A',
        '#85C1E9',
        '#D7BDE2',
        '#FAD7A0',
      ];
    case 'Pastel Goth':
      return [
        '#F8BBD9',
        '#E1BEE7',
        '#C5CAE9',
        '#BBDEFB',
        '#C8E6C9',
        '#DCEDC8',
        '#E8E8E8',
        '#D3D3D3',
        '#C0C0C0',
        '#A9A9A9',
        '#FFCCBC',
        '#E8B4B8',
        '#D4A5A5',
        '#B8A9C9',
        '#A5B4FC',
        '#9CAF88',
      ];
    case 'Woodsy':
      return [
        '#8B4513',
        '#654321',
        '#A0522D',
        '#CD853F',
        '#DEB887',
        '#8B7355',
        '#A0522D',
        '#D2691E',
        '#B8860B',
        '#8B6914',
        '#556B2F',
        '#6B8E23',
        '#228B22',
        '#32CD32',
        '#90EE90',
        '#98FB98',
      ];
    default:
      return [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFEAA7',
        '#DDA0DD',
        '#98D8C8',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E9',
        '#F8C471',
        '#82E0AA',
        '#F1948A',
        '#85C1E9',
        '#D7BDE2',
        '#FAD7A0',
      ];
  }
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initPalettes() {
  paletteNames.forEach((name) => {
    palettes[name] = generatePalette(name);
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    paletteSelect.appendChild(opt);
  });
}

// ----------
// drawing functions
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
  const labelLength = sector.label.length;
  let fontSize = labelLength <= 10 ? 20 : 18;
  while (
    !drawArcText(
      ctx,
      sector.label,
      textStartAngle,
      arc,
      rad,
      fontSize,
      currentPalette === 'Pastel Goth',
    ) && fontSize > 10
  ) {
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

function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  arc = TAU / sectors.length;
  sectors.forEach(drawSector);
  rotate();
}

function rotate() {
  const index = getSectorIndex();
  const sector = sectors[index];
  canvas.style.transform = `rotate(${ang - Math.PI / 2}rad)`;
  spinButton.textContent = angVel ? '' : 'SPIN';
  spinButton.style.background = sector.color;
}

// ----------
// spin logic
function getSectorIndex() {
  const adjusted = (ang - Math.PI / 2 + TAU) % TAU;
  return Math.floor(sectors.length - (adjusted / TAU) * sectors.length) % sectors.length;
}

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  isAccelerating = true;
  angVelMax = Math.random() * (0.25 - 0.18) + 0.18;
  frame();
}

function frame() {
  if (!isSpinning) return;
  if (isAccelerating) {
    angVel += 0.01;
    if (angVel >= angVelMax) {
      isAccelerating = false;
      angVel = angVelMax;
    }
  } else {
    angVel *= friction;
    if (angVel < angVelMin) {
      isSpinning = false;
      angVel = 0;
      cancelAnimationFrame(animFrame);
    }
  }
  ang += angVel;
  ang %= TAU;
  rotate();
  animFrame = requestAnimationFrame(frame);
}

// ----------
// editor & UI logic
const MAX_SLICES = 12;
let editorInputs = [];

function createEditorInputs() {
  editorDiv.innerHTML = '';
  editorInputs = [];
  for (let i = 0; i < MAX_SLICES; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.minWidth = '0';
    input.value = customLabels[i] || `Slice ${i + 1}`;
    input.style.display = 'none';
    input.addEventListener('input', (e) => {
      const newLabel = e.target.value;
      if (i < sectors.length) {
        sectors[i].label = newLabel;
      }
      if (newLabel !== `Slice ${i + 1}`) {
        customLabels[i] = newLabel;
      } else {
        delete customLabels[i];
      }
      drawWheel();
    });
    editorInputs.push(input);
    editorDiv.appendChild(input);
  }
  editorDiv.style.display = 'none';
  editorDiv.style.gridTemplateColumns = 'repeat(4, 1fr)';
  editorDiv.style.gap = '8px';
  editorDiv.style.width = '100%';
  editorDiv.style.maxWidth = '520px';
  editorDiv.style.boxSizing = 'border-box';
  editorDiv.style.marginTop = '10px';
  editorDiv.style.justifyItems = 'stretch';
}

function updateEditorInputsVisibility() {
  for (let i = 0; i < MAX_SLICES; i++) {
    if (i < sectors.length) {
      editorInputs[i].style.display = 'block';
      editorInputs[i].value = sectors[i].label;
      editorInputs[i].style.background = sectors[i].color;
      const isPastelGoth = currentPalette === 'Pastel Goth';
      editorInputs[i].style.color = isPastelGoth ? '#333' : '#fff';
    } else {
      editorInputs[i].style.display = 'none';
    }
  }
}

function updateEditor() {
  updateEditorInputsVisibility();
}

async function updateLoadDropdown() {
  loadDropdown.innerHTML = '<option value="new">New Wheel</option>';

  if (storageTypeSelect.value === 'local') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('wheel_')) {
        const name = key.replace('wheel_', '');
        const option = document.createElement('option');
        option.value = key;
        option.textContent = name;
        loadDropdown.appendChild(option);
      }
    }
  } else {
    if (!supabase) {
      console.error('Supabase not available for loading wheels');
      return;
    }
    try {
      const wheels = await loadWheelsFromSupabase();
      wheels.forEach((wheel) => {
        const option = document.createElement('option');
        option.value = wheel.id;
        option.textContent = wheel.name;
        loadDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load wheels from Supabase:', error);
    }
  }
}

function assignPaletteColorsToSectors(count, palette) {
  return Array.from({ length: count }, (_, i) => ({
    color: palette[i % palette.length],
    label: customLabels[i] || `Slice ${i + 1}`,
  }));
}

function resizeSectorsKeepColors(newCount) {
  const oldSectors = sectors || [];
  const preserved = Array.from({ length: newCount }, (_, i) => {
    if (i < oldSectors.length && oldSectors[i]) {
      return {
        color: oldSectors[i].color,
        label: customLabels[i] || oldSectors[i].label || `Slice ${i + 1}`,
      };
    }
    return {
      color: shuffledPalette[i % shuffledPalette.length],
      label: customLabels[i] || `Slice ${i + 1}`,
    };
  });
  sectors = preserved;
  if (currentSlice >= sectors.length) {
    currentSlice = Math.max(0, sectors.length - 1);
  }
}

async function saveWheelToSupabase(wheelData, name) {
  if (!supabase) {
    throw new Error('Supabase not initialized. Please refresh the page.');
  }

  try {
    const { data, error } = await supabase.from('wheels').insert([
      {
        name,
        wheel_data: wheelData,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Failed to save wheel: ${error.message}`);
  }
}

async function loadWheelsFromSupabase() {
  if (!supabase) {
    throw new Error('Supabase not initialized. Please refresh the page.');
  }

  try {
    const { data, error } = await supabase
      .from('wheels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((wheel) => ({ id: wheel.id, name: wheel.name, data: wheel.wheel_data }));
  } catch (error) {
    throw new Error(`Failed to load wheels: ${error.message}`);
  }
}

function shuffleSectorColors() {
  const palette = shuffledPalette;
  const shuffled = shuffleArray(palette);
  let colorPool = [...shuffled];
  for (let i = 0; i < sectors.length; i++) {
    if (colorPool.length === 0) colorPool = shuffleArray(palette);
    sectors[i].color = colorPool.pop();
  }
  drawWheel();
  updateEditor();
  histogramContainer.style.display = 'none';
}

function chooseSpecificColors() {
  if (!specificColorsContainer) return;
  specificColorsContainer.style.display = 'block';
  histogramContainer.style.display = 'none';

  sliceButtonsContainer.innerHTML = '';
  sliceButtons = sectors.map((sector, i) => {
    const btn = document.createElement('button');
    btn.textContent = sector.label;
    btn.style.backgroundColor = sector.color;
    btn.style.color = currentPalette === 'Pastel Goth' ? '#333' : '#fff';
    btn.addEventListener('click', () => openColorModal(i));
    sliceButtonsContainer.appendChild(btn);
    return btn;
  });

  openColorModal(0);
}

function showSpinHistogram() {
  const counts = Array(sectors.length).fill(0);
  const originalAng = ang;
  const originalAngVel = angVel;
  const originalIsSpinning = isSpinning;
  for (let i = 0; i < 100; i++) {
    const testAng = Math.random() * TAU;
    ang = testAng;
    const idx = getSectorIndex();
    counts[idx]++;
  }
  ang = originalAng;
  angVel = originalAngVel;
  isSpinning = originalIsSpinning;
  const maxCount = Math.max(...counts);
  const barMaxWidth = 220;
  let html = `<div style='display:flex; flex-direction:column; align-items:center; gap:6px;'>`;
  for (let i = 0; i < sectors.length; i++) {
    const barWidth = Math.round((counts[i] / maxCount) * barMaxWidth);
    html += `<div style='display:flex; align-items:center; gap:8px; font-size:15px;'>`;
    html += `<span style='width:90px; text-align:right;'>${sectors[i].label}</span>`;
    html += `<div style='height:22px; width:${barWidth}px; background:${sectors[i].color}; border-radius:6px; display:inline-block; position:relative; box-shadow:0 1px 3px #0002;'></div>`;
    html += `<span style='margin-left:8px; color:${currentPalette === 'Pastel Goth' ? '#333' : '#fff'}; font-weight:bold;'>${counts[i]}</span>`;
    html += `</div>`;
  }
  html += `</div>`;
  histogramContainer.innerHTML = html;
  histogramContainer.style.display = 'block';
}

// ----------
// event listeners
function handleEditToggle() {
  const isVisible = getComputedStyle(editControls).display !== 'none';
  editControls.style.display = isVisible ? 'none' : 'block';
  editorDiv.style.display = isVisible ? 'none' : 'grid';
  editorButtons.style.display = isVisible ? 'none' : 'flex';
  saveControls.style.display = isVisible ? 'none' : 'block';
  histogramContainer.style.display = 'none';
  if (!isVisible) {
    updateEditor();
  }
}

function handleSliceSlider(e) {
  const count = parseInt(e.target.value);
  sliceLabel.textContent = count;
  resizeSectorsKeepColors(count);
  drawWheel();
  updateEditor();
}

function handlePaletteShuffle(e) {
  currentPalette = e.target.value;
  shuffledPalette = shuffleArray(palettes[currentPalette]);
  // keep existing sector colors; only affect new slots if the count increases later
  drawWheel();
  updateEditor();
}

function handleSpecificColors() {
  chooseSpecificColors();
  drawWheel();
  updateEditor();
}

async function handleSave() {
  const wheelData = {
    sectors: sectors.map((s) => ({ color: s.color, label: s.label })),
    palette: currentPalette,
    sliceCount: sectors.length,
    customLabels: customLabels,
  };
  const name = prompt('Enter a name for this wheel:');
  if (!name) return;

  try {
    if (storageTypeSelect.value === 'local') {
      localStorage.setItem(`wheel_${name}`, JSON.stringify(wheelData));
    } else {
      if (!supabase) {
        alert('Supabase not available. Please refresh the page or use "Me Wheels" for now.');
        return;
      }
      await saveWheelToSupabase(wheelData, name);
    }
    await updateLoadDropdown();
  } catch (error) {
    alert(`Failed to save wheel: ${error.message}`);
  }
}

async function handleLoadDropdown(e) {
  if (e.target.value === 'new') {
    resetToDefaultWheel();
    return;
  }
  if (!e.target.value) return;

  try {
    let wheelData;
    if (storageTypeSelect.value === 'local') {
      wheelData = JSON.parse(localStorage.getItem(e.target.value));
    } else {
      if (!supabase) {
        alert('Supabase not available. Please refresh the page or use "Me Wheels" for now.');
        return;
      }
      const wheels = await loadWheelsFromSupabase();
      const wheel = wheels.find((w) => w.id.toString() === e.target.value);
      if (!wheel) {
        alert('Wheel not found');
        return;
      }
      wheelData = wheel.data;
    }

    sectors = wheelData.sectors.map((s, i) => ({
      color: s.color,
      label: s.label || customLabels[i] || `Slice ${i + 1}`,
    }));
    currentPalette = wheelData.palette;
    customLabels = wheelData.customLabels || {};
    paletteSelect.value = currentPalette;
    sliceSlider.value = wheelData.sliceCount;
    sliceLabel.textContent = wheelData.sliceCount;
    drawWheel();
    updateEditor();
  } catch (error) {
    alert(`Failed to load wheel: ${error.message}`);
  }
}

function resetToDefaultWheel() {
  const defaultCount = 7;
  customLabels = {};
  currentPalette = 'Default';
  paletteSelect.value = currentPalette;
  shuffledPalette = shuffleArray(palettes[currentPalette]);

  sectors = assignPaletteColorsToSectors(defaultCount, shuffledPalette);
  sliceSlider.value = defaultCount;
  sliceLabel.textContent = defaultCount;

  drawWheel();
  updateEditor();
  if (pickr) pickr.setColor(sectors[0]?.color || '#ffffff', true);
  histogramContainer.style.display = 'none';
}

// ----------
// initialization
function initialize() {
  initPalettes();
  shuffledPalette = shuffleArray(palettes[currentPalette]);
  sectors = assignPaletteColorsToSectors(7, shuffledPalette);
  createEditorInputs();
  drawWheel();
  // init pickr with first sector color
  initPickr(sectors[0]?.color || '#ffffff');

  updateLoadDropdown();
  editToggle.addEventListener('click', handleEditToggle);
  sliceSlider.addEventListener('input', handleSliceSlider);
  paletteSelect.addEventListener('change', handlePaletteShuffle);
  spinButton.addEventListener('click', spin);
  saveButton.addEventListener('click', handleSave);
  loadDropdown.addEventListener('change', handleLoadDropdown);
  storageTypeSelect.addEventListener('change', updateLoadDropdown);
  shuffleColorsButton.addEventListener('click', shuffleSectorColors);
  showHistogramButton.addEventListener('click', showSpinHistogram);
  specificColorsButton.addEventListener('click', handleSpecificColors);
}


initialize();
