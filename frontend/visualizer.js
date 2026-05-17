// AEGIS VISUALIZATION ENGINE | The Neural & Pulse HUD
// Renders the tangled web reaped by Sparky.

export function initVisualizers() {
  initPulseGrid();
  initNeuralMap();
}

/**
 * THE PULSE MATRIX
 * Renders a 400-cell grid that reacts to reaped intelligence.
 */
function initPulseGrid() {
  const grid = document.getElementById('pulseGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  for (let i = 0; i < 400; i++) {
    const cell = document.createElement('div');
    cell.className = 'pulse-cell';
    cell.id = `cell-${i}`;
    grid.appendChild(cell);
  }
}

export function triggerPulse(isV4V = false) {
  const randomId = Math.floor(Math.random() * 400);
  const cell = document.getElementById(`cell-${randomId}`);
  if (cell) {
    cell.classList.add(isV4V ? 'v4v' : 'active');
    setTimeout(() => {
      cell.classList.remove('active', 'v4v');
    }, 1000);
  }
}

/**
 * THE NEURAL MAP
 * A physics-based constellation of shows and connections.
 */
let nodes = [];
let links = [];

function initNeuralMap() {
  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw links
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.1)';
    links.forEach(l => {
      ctx.beginPath();
      ctx.moveTo(l.source.x, l.source.y);
      ctx.lineTo(l.target.x, l.target.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      if (n.isV4V) {
        // The "Golden Sun" effect
        const pulse = Math.sin(Date.now() / 200) * 5;
        ctx.shadowBlur = 15 + pulse;
        ctx.shadowColor = '#ffaa00';
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for others
      } else {
        ctx.fillStyle = n.isPerson ? '#9d50bb' : '#444'; // Dim legacy shows
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.isPerson ? 3 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Physics (gentle drift)
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    requestAnimationFrame(animate);
  }
  animate();
}

export function addNodeToMap(title, isPerson = false, isV4V = false) {
  const canvas = document.getElementById('neuralCanvas');
  const newNode = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    title,
    isPerson,
    isV4V
  };
  nodes.push(newNode);
  if (nodes.length > 100) nodes.shift(); // Keep it performant
}
