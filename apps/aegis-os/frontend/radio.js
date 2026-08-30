// Aegis OS | Radio Frequency Core
// Handles analog-style tuning, white-noise synthesis, and channel selection

const dial = document.getElementById('frequencyDial');
const dialMarks = document.getElementById('dialMarks');
const freqText = document.getElementById('currentFrequency');

let audioCtx = null;
let staticNode = null;
let filterNode = null;
let gainNode = null;

let isTuning = false;
let currentPos = 0;
let targetFreq = 98.5;

// --- 1. AUDIO SYNTHESIS (White Noise Static) ---
function initStaticSynth() {
  if (audioCtx) return;
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create white noise buffer
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  staticNode = audioCtx.createBufferSource();
  staticNode.buffer = noiseBuffer;
  staticNode.loop = true;

  filterNode = audioCtx.createBiquadFilter();
  filterNode.type = 'highpass';
  filterNode.frequency.value = 1000;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0; // Start silent

  staticNode.connect(filterNode);
  filterNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  staticNode.start();
}

// --- 2. DIAL UI GENERATION ---
function generateDial() {
  dialMarks.innerHTML = '';
  for (let i = 880; i <= 1080; i += 2) {
    const freq = (i / 10).toFixed(1);
    const mark = document.createElement('div');
    mark.className = `dial-mark ${i % 10 === 0 ? 'major' : ''}`;
    if (i % 10 === 0) mark.setAttribute('data-freq', freq);
    dialMarks.appendChild(mark);
  }
}

// --- 3. TUNING LOGIC ---
let startX = 0;
let scrollLeft = 0;

dial.addEventListener('mousedown', (e) => {
  isTuning = true;
  startX = e.pageX - dial.offsetLeft;
  scrollLeft = currentPos;
  
  if (!audioCtx) initStaticSynth();
  if (audioCtx.state === 'suspended') audioCtx.resume();
});

window.addEventListener('mouseup', () => {
  isTuning = false;
  if (gainNode) {
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isTuning) return;
  
  const x = e.pageX - dial.offsetLeft;
  const walk = (x - startX) * 2;
  currentPos = scrollLeft + walk;
  
  // Constrain
  const maxScroll = -(dialMarks.scrollWidth - dial.clientWidth);
  if (currentPos > 0) currentPos = 0;
  if (currentPos < maxScroll) currentPos = maxScroll;

  dialMarks.style.transform = `translateX(${currentPos}px)`;
  
  // Calculate Frequency
  const progress = Math.abs(currentPos) / Math.abs(maxScroll);
  const freq = (88 + (progress * 20)).toFixed(1);
  updateFrequency(freq);
  
  // Play Static
  if (gainNode) {
    gainNode.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.05);
  }
});

function updateFrequency(freq) {
  const channels = {
    "88.1": "V4V PULSE",
    "92.3": "TECH DEEP-DIVE",
    "98.5": "AEGIS PRIME",
    "102.1": "SILENT VIDEO",
    "107.9": "NOSTR INTELLIGENCE"
  };

  const channelName = channels[freq] || "SCANNING...";
  freqText.innerHTML = `${freq} MHz // ${channelName}`;
  
  // If we hit a "sweet spot", reduce static
  if (channels[freq] && gainNode) {
    gainNode.gain.setTargetAtTime(0.01, audioCtx.currentTime, 0.1);
    // Trigger channel change event
    window.dispatchEvent(new CustomEvent('channelChange', { detail: { freq, name: channelName } }));
  }
}

// Initialize
generateDial();
updateFrequency("98.5");
