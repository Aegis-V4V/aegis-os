import tokenAsset from './token.png';

const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite;

const container = document.getElementById('cargoContainer');

// 🛰️ TRUE ZERO-GRAVITY ENGINE CALIBRATION
const engine = Engine.create();
engine.world.gravity.y = 0; // Complete weightlessness!
engine.world.gravity.x = 0;

const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: container.clientWidth || 800,
        height: container.clientHeight || 400,
        wireframes: false,
        background: 'transparent'
    }
});

// 🛸 Atmospheric Force-Field Walls
const wallOptions = { isStatic: true, render: { visible: false } };
let ground = Bodies.rectangle(400, 410, 1200, 20, wallOptions);
let leftWall = Bodies.rectangle(-10, 200, 20, 600, wallOptions);
let rightWall = Bodies.rectangle(810, 200, 20, 600, wallOptions);
let topWall = Bodies.rectangle(400, -10, 1200, 20, wallOptions);

Composite.add(engine.world, [ground, leftWall, rightWall, topWall]);

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Dynamically adjust containment field on cockpit resize
function rebuildWalls() {
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 400;

    render.canvas.width = width;
    render.canvas.height = height;
    render.options.width = width;
    render.options.height = height;

    Composite.remove(engine.world, [ground, leftWall, rightWall, topWall]);

    ground = Bodies.rectangle(width / 2, height + 15, width * 2, 30, wallOptions);
    leftWall = Bodies.rectangle(-15, height / 2, 30, height * 2, wallOptions);
    rightWall = Bodies.rectangle(width + 15, height / 2, 30, height * 2, wallOptions);
    topWall = Bodies.rectangle(width / 2, -15, width * 2, 30, wallOptions);

    Composite.add(engine.world, [ground, leftWall, rightWall, topWall]);
}

window.addEventListener('resize', rebuildWalls);
setTimeout(rebuildWalls, 500);

// Caps active blobs for performance
let VISUAL_CAP = 80;
let activeBags = [];
let truePopulation = 0;

// List of 5 Airlock Gates
const AIRLOCKS = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'REAR'];

function spawnCanvasBag(drop) {
    if (activeBags.length >= VISUAL_CAP) {
        const oldBag = activeBags.shift();
        Composite.remove(engine.world, oldBag);
    }

    const canvasW = render.canvas.width || 800;
    const canvasH = render.canvas.height || 400;

    // 1. Randomly select an Entrance Airlock
    const gate = AIRLOCKS[Math.floor(Math.random() * AIRLOCKS.length)];
    let startX, startY;
    let forceX = 0, forceY = 0;
    let scaleOnSpawn = 1.0;
    let isRearEntry = false;

    const baseSize = 35 + Math.random() * 15; // Large robust crates

    // 2. Calculate Gate Position & Kickoff Vector
    switch (gate) {
        case 'TOP':
            startX = Math.random() * (canvasW - 100) + 50;
            startY = -40;
            forceX = (Math.random() - 0.5) * 0.01;
            forceY = 0.02 + Math.random() * 0.03;
            break;
        case 'BOTTOM':
            startX = Math.random() * (canvasW - 100) + 50;
            startY = canvasH + 40;
            forceX = (Math.random() - 0.5) * 0.01;
            forceY = -0.02 - Math.random() * 0.03;
            break;
        case 'LEFT':
            startX = -40;
            startY = Math.random() * (canvasH - 100) + 50;
            forceX = 0.02 + Math.random() * 0.03;
            forceY = (Math.random() - 0.5) * 0.01;
            break;
        case 'RIGHT':
            startX = canvasW + 40;
            startY = Math.random() * (canvasH - 100) + 50;
            forceX = -0.02 - Math.random() * 0.03;
            forceY = (Math.random() - 0.5) * 0.01;
            break;
        case 'REAR':
            // Enters from central deep station depth, inflates scale!
            startX = canvasW / 2 + (Math.random() - 0.5) * 100;
            startY = canvasH / 2 + (Math.random() - 0.5) * 60;
            forceX = (Math.random() - 0.5) * 0.015;
            forceY = (Math.random() - 0.5) * 0.015;
            scaleOnSpawn = 0.15; // Start tiny
            isRearEntry = true;
            break;
    }

    // 3. Cinematic Orb/Token physics
    const isCompliant = drop.isCompliant;
    const renderConfig = {
        fillStyle: isCompliant ? '#fbbf24' : '#334155', // Amber vs Slate
        strokeStyle: isCompliant ? '#f59e0b' : '#1e293b',
        lineWidth: 2
    };

    let activeDivisor = 300;

    // Use the beautiful Podcasting 2.0 token sprite for compliant orbs
    if (isCompliant) {
        activeDivisor = 1024; // Higher resolution source
        renderConfig.sprite = {
            texture: tokenAsset,
            xScale: (baseSize * 2) / activeDivisor * scaleOnSpawn,
            yScale: (baseSize * 2) / activeDivisor * scaleOnSpawn
        };
    }

    // Override with explicit podcast art if available
    if (drop.image) {
        activeDivisor = 300;
        renderConfig.sprite = {
            texture: drop.image,
            xScale: (baseSize * 2) / activeDivisor * scaleOnSpawn,
            yScale: (baseSize * 2) / activeDivisor * scaleOnSpawn
        };
    }

    // 4. Construct Circular Space Orbs (Blobs)
    // Lower friction for effortless space floating
    const body = Bodies.circle(startX, startY, baseSize * scaleOnSpawn, {
        frictionAir: 0.002, // Incredibly low zero-g damping!
        friction: 0.05,
        restitution: 0.85, // High spring/bounce
        render: renderConfig
    });

    body.podcastMeta = drop;
    body.targetScale = 1.0;
    body.currentScale = scaleOnSpawn;
    body.baseSize = baseSize;
    body.originalDivisor = activeDivisor;
    body.isRearEntry = isRearEntry;

    // Apply Initial Kickoff Thrust vector from airlock!
    Matter.Body.applyForce(body, body.position, { x: forceX * 0.2, y: forceY * 0.2 });
    
    // Add slight spin momentum
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);

    Composite.add(engine.world, body);
    activeBags.push(body);
}

// 🧬 Inflation Ticking for REAR entry scaling
Matter.Events.on(engine, 'beforeUpdate', function() {
    activeBags.forEach(b => {
        if (b.isRearEntry && b.currentScale < b.targetScale) {
            // Gradually scale trunk upward to simulate 3D flight from deep room background!
            const growth = 0.04;
            const prevScale = b.currentScale;
            b.currentScale = Math.min(b.targetScale, b.currentScale + growth);
            
            const scaleFactor = b.currentScale / prevScale;
            Matter.Body.scale(b, scaleFactor, scaleFactor);

            // Scale dynamically aligned with original source resolution
            if (b.render.sprite) {
                b.render.sprite.xScale = (b.baseSize * 2 / b.originalDivisor) * b.currentScale;
                b.render.sprite.yScale = (b.baseSize * 2 / b.originalDivisor) * b.currentScale;
            }
            
            if (b.currentScale >= b.targetScale) {
                b.isRearEntry = false; // Scaling complete!
            }
        }
    });
});

// Click interaction for Manifest Inspection
const mouse = Matter.Mouse.create(render.canvas);
const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
Composite.add(engine.world, mouseConstraint);

Matter.Events.on(mouseConstraint, 'mousedown', function() {
    const clickedBody = mouseConstraint.body;
    if (clickedBody && clickedBody.podcastMeta) {
        const meta = clickedBody.podcastMeta;
        alert(`📦 SECURE CRATE INVENTORY\n\nTitle: ${meta.title}\nURL: ${meta.url}\n\nEngine Protocol: ${meta.isCompliant ? '✅ PODCASTING 2.0 ENABLED' : '❌ LEGACY PROTOCOL'}`);
    }
});

// CENTRAL WEBSOCKET HOOK: Ingest Live drops
window.handleLiveDropPayload = (data) => {
    try {
        if (data.type === 'INITIAL_CARGO') {
            console.log(`[CARGO HOLD] Syncing ${data.cargo.length} station packages...`);
            const toSpawn = data.cargo.slice(-VISUAL_CAP);
            toSpawn.forEach(drop => spawnCanvasBag(drop));
            truePopulation = data.cargo.length;
            if (window.updateHoldHUD) window.updateHoldHUD(truePopulation);
        }
        else if (data.type === 'DROP_BLOB') {
            data.drops.forEach(drop => {
                // Space-out drops slightly to prevent collisions
                setTimeout(() => {
                    spawnCanvasBag(drop);
                }, Math.random() * 1000);
                truePopulation++;
            });
            if (window.updateHoldHUD) window.updateHoldHUD(truePopulation);
        } 
        else if (data.type === 'RESET_CARGO') {
            console.warn("[CARGO HOLD] Flushing containment field!");
            Composite.clear(engine.world);
            Composite.add(engine.world, [ground, leftWall, rightWall, topWall, mouseConstraint]);
            activeBags = [];
            truePopulation = 0;
            if (window.updateHoldHUD) window.updateHoldHUD(0);
        }
    } catch (e) {
        console.error("[CARGO HOLD ERR]", e);
    }
};

// Manual Bridge Propulsion Test
window.manualDrop = () => spawnCanvasBag({ 
    title: 'Station Container #' + Math.floor(Math.random()*1000), 
    isCompliant: Math.random() > 0.4, 
    url: 'Cargo Simulation Mode' 
});
