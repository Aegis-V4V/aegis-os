const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite;

const container = document.getElementById('cargoContainer');

// Initialize Engine with lazy Low Gravity for zero-g drift feel
const engine = Engine.create();
engine.world.gravity.y = 0.05; // Slight sink
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

// High-visibility industrial containment barriers
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

    ground = Bodies.rectangle(width / 2, height + 10, width * 2, 20, wallOptions);
    leftWall = Bodies.rectangle(-10, height / 2, 20, height * 2, wallOptions);
    rightWall = Bodies.rectangle(width + 10, height / 2, 20, height * 2, wallOptions);
    topWall = Bodies.rectangle(width / 2, -10, width * 2, 20, wallOptions);

    Composite.add(engine.world, [ground, leftWall, rightWall, topWall]);
}

window.addEventListener('resize', rebuildWalls);
// Trigger initial containment build after layout renders
setTimeout(rebuildWalls, 500);

// Dynamic Visual Memory Capping
let VISUAL_CAP = 100;
if (navigator.connection && navigator.connection.downlink) {
    const speed = navigator.connection.downlink;
    if (speed < 2) VISUAL_CAP = 40;
    else if (speed > 10) VISUAL_CAP = 150;
}
console.log(`[CARGO BAY] Containment grid restricted to: ${VISUAL_CAP} Active Blobs.`);

let activeBags = [];
let truePopulation = 0;

function spawnCanvasBag(drop) {
    if (activeBags.length >= VISUAL_CAP) {
        const oldBag = activeBags.shift();
        Composite.remove(engine.world, oldBag);
    }

    const canvasWidth = render.canvas.width || 800;
    const startX = Math.random() * (canvasWidth - 100) + 50;
    const startY = -50; // Drop through atmospheric intake
    
    const size = 25 + Math.random() * 20; 
    
    // Phosphor Green tints for CCTV nightvision aesthetics
    const renderConfig = {
        fillStyle: drop.isCompliant ? '#4ade80' : '#27272a', 
        strokeStyle: drop.isCompliant ? '#22c55e' : '#52525b',
        lineWidth: 2
    };

    if (drop.image) {
        renderConfig.sprite = {
            texture: drop.image,
            xScale: (size * 2) / 300,
            yScale: (size * 2) / 300
        };
    }

    let body;
    if (drop.isCompliant) {
        // Hexagonal stable pod for compliant feeds
        body = Bodies.polygon(startX, startY, 6, size, {
            frictionAir: 0.02,
            restitution: 0.6,
            render: renderConfig
        });
    } else {
        // Crude crates for non-compliant/traditional feeds
        body = Bodies.rectangle(startX, startY, size, size, {
            chamfer: { radius: 4 },
            frictionAir: 0.03,
            restitution: 0.4, 
            render: renderConfig
        });
    }
    
    body.podcastMeta = drop;

    // Inject lazy drift vectors
    const forceX = (Math.random() - 0.5) * 0.03;
    const forceY = Math.random() * 0.03; 
    Matter.Body.applyForce(body, body.position, { x: forceX, y: forceY });
    
    Composite.add(engine.world, body);
    activeBags.push(body);
}

// Click interaction for CCTV inventory inspection
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
        alert(`INVENTORY MANIFEST:\n\nTitle: ${meta.title}\nURL: ${meta.url}\n\nStatus: ${meta.isCompliant ? 'COMPLIANT [V4V]' : 'TRADITIONAL'}`);
    }
});

// EXPOSED GLOBAL HOOK: Subscribed directly to Cockpit Master Stream
window.handleLiveDropPayload = (data) => {
    try {
        if (data.type === 'INITIAL_CARGO') {
            console.log(`[CARGO BAY] Unloading ${data.cargo.length} accumulated daily records...`);
            const toSpawn = data.cargo.slice(-VISUAL_CAP);
            toSpawn.forEach(drop => spawnCanvasBag(drop));
            truePopulation = data.cargo.length;
            if (window.updateHoldHUD) window.updateHoldHUD(truePopulation);
        }
        else if (data.type === 'DROP_BLOB') {
            data.drops.forEach(drop => {
                spawnCanvasBag(drop);
                truePopulation++;
            });
            if (window.updateHoldHUD) window.updateHoldHUD(truePopulation);
        } 
        else if (data.type === 'RESET_CARGO') {
            console.warn("[CARGO BAY] Activating daily containment flush!");
            Composite.clear(engine.world);
            Composite.add(engine.world, [ground, leftWall, rightWall, topWall, mouseConstraint]);
            activeBags = [];
            truePopulation = 0;
            if (window.updateHoldHUD) window.updateHoldHUD(0);
        }
    } catch (e) {
        console.error("[CARGO ERR]", e);
    }
};

// Bridge command manual payload test
window.manualDrop = () => spawnCanvasBag({ title: 'Bridge Simulation Pod', isCompliant: Math.random() > 0.5, url: 'Simulation' });
