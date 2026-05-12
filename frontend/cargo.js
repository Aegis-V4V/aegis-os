const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite;

const container = document.getElementById('cargoContainer');
const bountyStatus = document.getElementById('bountyStatus');

// Initialize Engine with ZERO GRAVITY (we will slowly let them drift or bounce)
const engine = Engine.create();
// Actually, let's give it very slight gravity so they accumulate at the bottom eventually to fill the volume!
// Or zero-gravity and we just calculate total area? The user said "Zero gravity where we let the blobs float around... accumulate them until full volume".
// If they float freely, they just bounce. Let's make gravity 0, but add very slight damping so they don't spin forever.
engine.world.gravity.y = 0;
engine.world.gravity.x = 0;

const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: container.clientWidth || 800,
        height: container.clientHeight || 500,
        wireframes: false,
        background: 'transparent'
    }
});

// Walls to keep blobs inside
const wallOptions = { isStatic: true, render: { fillStyle: '#1e293b' } };
const ground = Bodies.rectangle(400, 510, 810, 20, wallOptions);
const leftWall = Bodies.rectangle(-10, 250, 20, 520, wallOptions);
const rightWall = Bodies.rectangle(810, 250, 20, 520, wallOptions);
const topWall = Bodies.rectangle(400, -10, 810, 20, wallOptions);
Composite.add(engine.world, [ground, leftWall, rightWall, topWall]);

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Handle window resize
window.addEventListener('resize', () => {
    if(container.clientWidth) {
        render.canvas.width = container.clientWidth;
        render.options.width = container.clientWidth;
    }
});

// Phase 8: Dynamic Performance Visual Capping
let VISUAL_CAP = 100;
if (navigator.connection && navigator.connection.downlink) {
    const speed = navigator.connection.downlink;
    if (speed < 2) VISUAL_CAP = 50;
    else if (speed > 10) VISUAL_CAP = 200;
    else VISUAL_CAP = 100;
}
console.log(`[CARGO BAY] Performance Visual Cap set to: ${VISUAL_CAP} Bags`);

let activeBags = [];
let truePopulation = 0;

// Server-Authoritative Bounty Logic
function updateBounty(population, sats) {
    truePopulation = population;
    bountyStatus.textContent = `TRUE POPULATION: ${population} SHOWS | REWARD POOL: ${sats} SATS`;
}

// Spawn a new Canvas Bag (Blob)
function spawnCanvasBag(drop) {
    if (activeBags.length >= VISUAL_CAP) {
        // Despawn oldest visual bag to save Canvas memory
        const oldBag = activeBags.shift();
        Composite.remove(engine.world, oldBag);
    }

    const startX = Math.random() * (render.canvas.width - 100) + 50;
    const startY = -50; // Drop from ceiling
    
    const size = 30 + Math.random() * 20; 
    
    // Setup Cover Art Sprite if it exists
    const renderConfig = {
        fillStyle: drop.isCompliant ? '#4ade80' : '#8b5a2b', 
        strokeStyle: drop.isCompliant ? '#22c55e' : '#5c4033',
        lineWidth: drop.isCompliant ? 3 : 1
    };

    if (drop.image) {
        renderConfig.sprite = {
            texture: drop.image,
            xScale: (size * 2) / 300, // Roughly scale down an average 300px image
            yScale: (size * 2) / 300
        };
    }

    let body;
    if (drop.isCompliant) {
        body = Bodies.polygon(startX, startY, 6, size, {
            frictionAir: 0.01,
            restitution: 0.8,
            render: renderConfig
        });
    } else {
        body = Bodies.rectangle(startX, startY, size, size * 1.2, {
            chamfer: { radius: [20, 0, 20, 0] },
            frictionAir: 0.05,
            restitution: 0.2, 
            render: renderConfig
        });
    }
    
    // Store metadata for Mini-Dashboard click listener
    body.podcastMeta = drop;

    const forceX = (Math.random() - 0.5) * 0.05;
    const forceY = Math.random() * 0.05; 
    Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
    
    Composite.add(engine.world, body);
    activeBags.push(body);
}

// Phase 8: Mini-Dashboard Click Listener
const mouse = Matter.Mouse.create(render.canvas);
const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
Composite.add(engine.world, mouseConstraint);

Matter.Events.on(mouseConstraint, 'mousedown', function(event) {
    const clickedBody = mouseConstraint.body;
    if (clickedBody && clickedBody.podcastMeta) {
        const meta = clickedBody.podcastMeta;
        alert(`MINI DASHBOARD\n\nTitle: ${meta.title}\nDescription: ${meta.description ? meta.description.substring(0, 100) + '...' : 'No description.'}\n\n[BOOST THIS SHOW ⚡] (Coming Soon)`);
    }
});

// WebSocket Connection to Backend for Live Podping Drops
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('Cargo Bay connected to Live Podping Firehose.');

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'INITIAL_CARGO') {
            console.log(`[CARGO BAY] Initializing with ${data.cargo.length} daily accumulated bags.`);
            // Spawn up to VISUAL_CAP immediately
            const toSpawn = data.cargo.slice(-VISUAL_CAP);
            toSpawn.forEach(drop => spawnCanvasBag(drop));
            updateBounty(data.cargo.length, data.jackpot);
        }
        else if (data.type === 'DROP_BLOB') {
            data.drops.forEach(drop => {
                spawnCanvasBag(drop);
                truePopulation++;
            });
            updateBounty(truePopulation, data.jackpot);
        } 
        else if (data.type === 'RESET_CARGO') {
            bountyStatus.textContent = `DAILY RESET! NEW JACKPOT: ${data.jackpot} SATS`;
            bountyStatus.style.color = '#ef4444';
            setTimeout(() => {
                Composite.clear(engine.world);
                Composite.add(engine.world, [ground, leftWall, rightWall, topWall, mouseConstraint]);
                activeBags = [];
                updateBounty(0, data.jackpot);
                bountyStatus.style.color = '';
            }, 4000);
        }
    } catch (e) {
        console.error(e);
    }
};

// Manual drop for testing UI
window.manualDrop = () => spawnCanvasBag({ title: 'Test Drop', isCompliant: Math.random() > 0.5 });
