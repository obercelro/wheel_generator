// main.js
import { supabase, initSupabase, saveWheelToSupabase, loadWheelsFromSupabase } from './storage.js';
import {
  wheelState,
  initWheel,
  initPalettes,
  drawWheel,
  spin,
  assignPaletteColorsToSectors,
  resizeSectorsKeepColors,
  shuffleArray,
  shuffleSectorColors,
  getSpinStats
} from './wheel.js';

// DOM Elements
const canvas = document.getElementById('wheel');
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
const saveControls = document.getElementById('saveControls');

const MAX_SLICES = 12;
let editorInputs = [];
let currentSlice = 0;
let sliceButtons = [];
let pickr = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  initWheel(canvas, spinButton);
  initPalettes(paletteSelect);
  
  wheelState.shuffledPalette = shuffleArray(wheelState.palettes[wheelState.currentPalette]);
  wheelState.sectors = assignPaletteColorsToSectors(7, wheelState.shuffledPalette);
  
  createEditorInputs();
  drawWheel();
  initPickr(wheelState.sectors[0]?.color || '#ffffff');
  updateLoadDropdown();

  // Event Listeners
  editToggle.addEventListener('click', handleEditToggle);
  sliceSlider.addEventListener('input', handleSliceSlider);
  paletteSelect.addEventListener('change', handlePaletteShuffle);
  spinButton.addEventListener('click', spin);
  saveButton.addEventListener('click', handleSave);
  loadDropdown.addEventListener('change', handleLoadDropdown);
  storageTypeSelect.addEventListener('change', updateLoadDropdown);
  
  shuffleColorsButton.addEventListener('click', () => {
    shuffleSectorColors();
    drawWheel();
    updateEditor();
    histogramContainer.style.display = 'none';
  });
  
  showHistogramButton.addEventListener('click', showSpinHistogram);
  
  specificColorsButton.addEventListener('click', () => {
    chooseSpecificColors();
    drawWheel();
    updateEditor();
  });
});

// Pickr & UI Functions
function initPickr(defaultColor) {
  if (pickr && typeof pickr.destroy === 'function') pickr.destroy();
  pickr = Pickr.create({
    el: '#pickrContainer',
    container: '#pickrHolder',
    inline: true,
    theme: 'classic',
    default: defaultColor || '#ffffff',
    components: {
      preview: false, opacity: true, hue: true,
      interaction: { hex: true, rgba: true, input: true, clear: false, save: false },
    },
  });

  pickr.on('change', (color) => {
    if (!wheelState.sectors.length) return;
    const newColor = color.toHEXA().toString();
    wheelState.sectors[currentSlice].color = newColor;
    drawWheel();
    if (sliceButtons[currentSlice]) sliceButtons[currentSlice].style.backgroundColor = newColor;
    if (editorInputs[currentSlice]) editorInputs[currentSlice].style.background = newColor;
  });
}

function openColorModal(index) {
  currentSlice = index;
  document.getElementById('colorPickerModal').classList.add('active');
  const currentColor = wheelState.sectors[currentSlice]?.color || '#ffffff';
  if (!pickr) initPickr(currentColor);
  else pickr.setColor(currentColor, true);
  try { pickr.show(); } catch (e) {}
  
  sliceButtons.forEach((btn, i) => {
    if (!btn) return;
    btn.classList.toggle('selected', i === index);
  });
}

document.getElementById('closePickrButton').onclick = () => {
  try { pickr.hide(); } catch (e) {}
  document.getElementById('colorPickerModal').classList.remove('active');
};

document.getElementById('colorPickerModal').addEventListener('click', (e) => {
  if (e.target.id === 'colorPickerModal') {
    try { pickr.hide(); } catch (e) {}
    e.currentTarget.classList.remove('active');
  }
});

// Editor Logic
function createEditorInputs() {
  editorDiv.innerHTML = '';
  editorInputs = [];
  
  for (let i = 0; i < MAX_SLICES; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add('editor-input', 'hidden'); // Much cleaner!
    input.value = wheelState.customLabels[i] || `Slice ${i + 1}`;
    
    input.addEventListener('input', (e) => {
      const newLabel = e.target.value;
      if (i < wheelState.sectors.length) wheelState.sectors[i].label = newLabel;
      
      if (newLabel !== `Slice ${i + 1}`) wheelState.customLabels[i] = newLabel;
      else delete wheelState.customLabels[i];
      drawWheel();
    });
    
    editorInputs.push(input);
    editorDiv.appendChild(input);
  }
  
  editorDiv.classList.add('hidden');
}

function updateEditor() {
  for (let i = 0; i < MAX_SLICES; i++) {
    if (i < wheelState.sectors.length) {
      editorInputs[i].classList.remove('hidden');
      editorInputs[i].value = wheelState.sectors[i].label;
      editorInputs[i].style.background = wheelState.sectors[i].color;
      editorInputs[i].style.color = wheelState.currentPalette === 'Pastel Goth' ? '#333' : '#fff';
    } else {
      editorInputs[i].classList.add('hidden');
    }
  }
}

// Handlers
function handleEditToggle() {
editControls.classList.toggle('hidden');
  editorDiv.classList.toggle('hidden');
  editorDiv.classList.toggle('editor-grid');
  editorButtons.classList.toggle('hidden');
  saveControls.classList.toggle('hidden');
  histogramContainer.classList.add('hidden');
  
  if (!editorDiv.classList.contains('hidden')) {
    updateEditor();
  }
}

function handleSliceSlider(e) {
  const count = parseInt(e.target.value);
  sliceLabel.textContent = count;
  resizeSectorsKeepColors(count);
  
  // Ensure pickr cursor stays within bounds
  if (currentSlice >= wheelState.sectors.length) {
    currentSlice = Math.max(0, wheelState.sectors.length - 1);
  }
  drawWheel();
  updateEditor();
}

function handlePaletteShuffle(e) {
  wheelState.currentPalette = e.target.value;
  wheelState.shuffledPalette = [...wheelState.palettes[wheelState.currentPalette]];

  wheelState.sectors.forEach((sector, i) => {
    sector.color = wheelState.shuffledPalette[i % wheelState.shuffledPalette.length];
  });
  
  drawWheel();
  updateEditor();
}

function chooseSpecificColors() {
  if (!specificColorsContainer) return;
  specificColorsContainer.style.display = 'block';
  histogramContainer.style.display = 'none';

  sliceButtonsContainer.innerHTML = '';
  sliceButtons = wheelState.sectors.map((sector, i) => {
    const btn = document.createElement('button');
    btn.textContent = sector.label;
    btn.style.backgroundColor = sector.color;
    btn.style.color = wheelState.currentPalette === 'Pastel Goth' ? '#333' : '#fff';
    btn.addEventListener('click', () => openColorModal(i));
    sliceButtonsContainer.appendChild(btn);
    return btn;
  });
  openColorModal(0);
}

function showSpinHistogram() {
  const counts = getSpinStats(100);
  const maxCount = Math.max(...counts);
  const barMaxWidth = 220;
  
  let html = `<div style='display:flex; flex-direction:column; align-items:center; gap:6px;'>`;
  for (let i = 0; i < wheelState.sectors.length; i++) {
    const barWidth = Math.round((counts[i] / maxCount) * barMaxWidth);
    html += `<div style='display:flex; align-items:center; gap:8px; font-size:15px;'>`;
    html += `<span style='width:90px; text-align:right;'>${wheelState.sectors[i].label}</span>`;
    html += `<div style='height:22px; width:${barWidth}px; background:${wheelState.sectors[i].color}; border-radius:6px; display:inline-block; position:relative; box-shadow:0 1px 3px #0002;'></div>`;
    html += `<span style='margin-left:8px; color:${wheelState.currentPalette === 'Pastel Goth' ? '#333' : '#fff'}; font-weight:bold;'>${counts[i]}</span>`;
    html += `</div>`;
  }
  html += `</div>`;
  histogramContainer.innerHTML = html;
  histogramContainer.classList.remove('hidden');
}

// Save/Load Logic
async function updateLoadDropdown() {
  loadDropdown.innerHTML = '<option value="new">New Wheel</option>';
  if (storageTypeSelect.value === 'local') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('wheel_')) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key.replace('wheel_', '');
        loadDropdown.appendChild(option);
      }
    }
  } else {
    if (!supabase) return;
    try {
      const wheels = await loadWheelsFromSupabase();
      wheels.forEach((wheel) => {
        const option = document.createElement('option');
        option.value = wheel.id;
        option.textContent = wheel.name;
        loadDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load wheels:', error);
    }
  }
}

async function handleSave() {
  const wheelData = {
    sectors: wheelState.sectors.map((s) => ({ color: s.color, label: s.label })),
    palette: wheelState.currentPalette,
    sliceCount: wheelState.sectors.length,
    customLabels: wheelState.customLabels,
  };
  const name = prompt('Enter a name for this wheel:');
  if (!name) return;

  try {
    if (storageTypeSelect.value === 'local') {
      localStorage.setItem(`wheel_${name}`, JSON.stringify(wheelData));
    } else {
      if (!supabase) return alert('Supabase not available.');
      await saveWheelToSupabase(wheelData, name);
    }
    await updateLoadDropdown();
  } catch (error) {
    alert(`Failed to save wheel: ${error.message}`);
  }
}

async function handleLoadDropdown(e) {
  if (e.target.value === 'new') return resetToDefaultWheel();
  if (!e.target.value) return;

  try {
    let wheelData;
    if (storageTypeSelect.value === 'local') {
      wheelData = JSON.parse(localStorage.getItem(e.target.value));
    } else {
      if (!supabase) return alert('Supabase not available.');
      const wheels = await loadWheelsFromSupabase();
      const wheel = wheels.find((w) => w.id.toString() === e.target.value);
      if (!wheel) return alert('Wheel not found');
      wheelData = wheel.data;
    }

    wheelState.sectors = wheelData.sectors.map((s, i) => ({
      color: s.color,
      label: s.label || wheelState.customLabels[i] || `Slice ${i + 1}`,
    }));
    wheelState.currentPalette = wheelData.palette;
    wheelState.customLabels = wheelData.customLabels || {};
    paletteSelect.value = wheelState.currentPalette;
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
  wheelState.customLabels = {};
  wheelState.currentPalette = 'Default';
  paletteSelect.value = wheelState.currentPalette;
  wheelState.shuffledPalette = [...wheelState.palettes[wheelState.currentPalette]];
  wheelState.sectors = assignPaletteColorsToSectors(defaultCount, wheelState.shuffledPalette);
  sliceSlider.value = defaultCount;
  sliceLabel.textContent = defaultCount;

  drawWheel();
  updateEditor();
  if (pickr) pickr.setColor(wheelState.sectors[0]?.color || '#ffffff', true);
  histogramContainer.style.display = 'none';
}
