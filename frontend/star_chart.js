// Pull global THREE instance established by index.html script load to ensure OrbitControls pairing
const THREE = window.THREE;

// Master Handoff Hooks for main.js
window.plotStarNeighborhood = null;

/* --- 1. ABSOLUTE MATHEMATICAL DETERMINISM --- */
function hashString(str) {
    let hash = 0;
    if (!str || str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Signed 32-bit int
    }
    return Math.abs(hash);
}

function getDeterministicPosition(seedString, scale = 1200) {
    const h1 = hashString(seedString + "-omega");
    const h2 = hashString(seedString + "-psi");
    const h3 = hashString(seedString + "-theta");

    // Normalizes bounds and maps stably into 3D Euclidean coordinates
    const x = ((h1 % scale) - (scale / 2));
    const y = ((h2 % scale) - (scale / 2));
    const z = ((h3 % scale) - (scale / 2));
    return new THREE.Vector3(x, y, z);
}

/* --- 2. STAR EVOLUTION SCHEMAS (Tiers 1-7) --- */
function getStarTier(omniScore) {
    const score = omniScore || 15;
    if (score < 20) return { name: 'Nebula', color: 0x8b5cf6, size: 5 }; 
    if (score < 40) return { name: 'Protostar', color: 0xec4899, size: 7 };
    if (score < 60) return { name: 'Main Sequence', color: 0x3b82f6, size: 9 };
    if (score < 75) return { name: 'Red Giant', color: 0xf59e0b, size: 15 };
    if (score < 90) return { name: 'Supernova', color: 0xef4444, size: 18 };
    return { name: 'Pulsar', color: 0x06b6d4, size: 11 };
}

/* --- 3. THE UNIVERSAL CELESTIAL TITANS --- */
// Absolute, fixed-coordinate constellations appearing identical globally.
const CELESTIAL_TITANS = [
    { title: "PODCAST INDEX HUB", x: -250, y: 300, z: -400, type: 'station', color: 0x38bdf8, desc: "Central nervous system of open podcast indexation." },
    { title: "ALBY TRADING OUTPOST", x: 400, y: -200, z: 500, type: 'station', color: 0xf59e0b, desc: "Hub for real-time value4value settlement streams." },
    { title: "FOUNTAIN COMET", x: -600, y: -400, z: 300, type: 'ship', color: 0x4ade80, desc: "Deep space comet harvesting satoshi-boost streams." },
    { title: "PODVERSE DREADNOUGHT", x: 700, y: 500, z: -200, type: 'ship', color: 0xec4899, desc: "Grand sovereign cruiser broadcasting open federation tags." },
    { title: "CURRY-JONES BINARY SUN", x: 0, y: 800, z: -700, type: 'sun', color: 0xef4444, desc: "Massive ancient binary solar core seeding v4v genes." }
];

/* --- 4. ASTROGATION THREE.JS CORE ENGINE --- */
class AstrogationView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020617, 0.0006);

        // Viewport Camera
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 1, 6000);
        this.camera.position.set(0, 250, 800);

        // WebGL Renderer with rich color representation
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        const ambient = new THREE.AmbientLight(0x0f172a, 1.5);
        this.scene.add(ambient);

        // Cosmic Static Field
        this.initStarfield();

        // Plot Group
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);

        // Initialize OrbitControls (Global Scope via Script injection)
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 2500;
        this.controls.minDistance = 50;

        // Raycasting setup
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredStar = null;

        this.setupHUDInteractions();

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    initStarfield() {
        const count = 1200;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 4000;
        }
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0x475569, size: 1.5, transparent: true, opacity: 0.6 });
        this.scene.add(new THREE.Points(geom, mat));
    }

    setupHUDInteractions() {
        const targetingDiv = document.getElementById('targetingDisplay');
        const previewModal = document.getElementById('scanPreviewModal');
        const prevTitle = document.getElementById('prevTitle');
        const prevBody = document.getElementById('prevBody');
        const closePrev = document.getElementById('closePrevModal');
        const warpBtn = document.getElementById('engageWarpBtn');

        let activeModalTarget = null;

        // 📡 POINTER MOVE: Targeting lock overlay
        this.container.addEventListener('pointermove', (e) => {
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const hits = this.raycaster.intersectObjects(this.meshGroup.children);

            if (hits.length > 0) {
                const hit = hits[0].object;
                if (hit.userData && hit.userData.title) {
                    this.hoveredStar = hit;
                    targetingDiv.textContent = `TARGET LOCK: ${hit.userData.title.toUpperCase()}`;
                    targetingDiv.classList.add('visible');
                    this.renderer.domElement.style.cursor = 'pointer';
                    return;
                }
            }
            this.hoveredStar = null;
            targetingDiv.classList.remove('visible');
            this.renderer.domElement.style.cursor = 'default';
        });

        // 🖱️ CLICK: Detail dialog window popups
        this.container.addEventListener('click', () => {
            if (this.hoveredStar) {
                const meta = this.hoveredStar.userData;
                activeModalTarget = meta;
                
                prevTitle.textContent = meta.title;
                prevBody.innerHTML = `
                    <div style="margin-bottom:10px; font-family:var(--font-mono); font-size:0.75rem; color:#38bdf8;">
                        🌌 COORDINATES: X:${this.hoveredStar.position.x.toFixed(0)} Y:${this.hoveredStar.position.y.toFixed(0)} Z:${this.hoveredStar.position.z.toFixed(0)}
                    </div>
                    <p>${meta.description || "Sector frequency signals present. Description records locked or empty."}</p>
                    <div style="margin-top:12px; font-family:var(--font-mono); font-size:0.7rem; border-top:1px dashed #334155; padding-top:8px;">
                        RSS SOURCE: ${meta.url}
                    </div>
                `;
                previewModal.classList.add('visible');
            }
        });

        if (closePrev) {
            closePrev.addEventListener('click', () => previewModal.classList.remove('visible'));
        }

        if (warpBtn) {
            warpBtn.addEventListener('click', () => {
                if (activeModalTarget && activeModalTarget.url) {
                    const input = document.getElementById('feedInput');
                    const scanTrigger = document.getElementById('scanBtn');
                    if (input && scanTrigger) {
                        input.value = activeModalTarget.url;
                        previewModal.classList.remove('visible');
                        
                        // Force Back to scan bay monitor UI
                        const triggerScannerKey = document.querySelector('[data-target="monitor-scanner"]');
                        if (triggerScannerKey) triggerScannerKey.click();
                        
                        setTimeout(() => scanTrigger.click(), 150);
                    }
                }
            });
        }
    }

    plot(title, url, data) {
        // 1. Complete containment flush
        while(this.meshGroup.children.length > 0) {
            this.meshGroup.remove(this.meshGroup.children[0]);
        }

        const center = new THREE.Vector3(0, 0, 0);
        const currentTier = getStarTier(data.scores.omni);

        // 2. Anchor Central Core
        const coreGeom = new THREE.SphereGeometry(currentTier.size, 32, 32);
        const coreMat = new THREE.MeshPhongMaterial({ 
            color: currentTier.color, 
            emissive: currentTier.color,
            emissiveIntensity: 1.5 
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        core.position.copy(center);
        core.userData = { 
            title: title, 
            url: url, 
            description: "ACTIVE TARGET FEED" 
        };
        this.meshGroup.add(core);

        // 3. Real-Time 350+ Deterministic Real Neighbors
        if (data.neighbors && data.neighbors.length > 0) {
            console.log(`[ASTROGATION] Mapping ${data.neighbors.length} Adjacent Galactic Nodes...`);
            
            data.neighbors.forEach((neigh, index) => {
                // Deterministic hash lock based strictly on static feed URL!
                const pos = getDeterministicPosition(neigh.url, 1400);
                
                const size = 3 + (index % 4); // Varied sizing
                const color = (index % 3 === 0) ? 0x38bdf8 : 0x4ade80; // V4V Teal & Neon Green mixes
                
                const geom = new THREE.SphereGeometry(size, 16, 16);
                const mat = new THREE.MeshBasicMaterial({ color: color });
                const star = new THREE.Mesh(geom, mat);
                star.position.copy(pos);
                
                star.userData = {
                    title: neigh.title || `Sector Node #${neigh.id}`,
                    url: neigh.url,
                    description: neigh.description || "Secure radio signal metadata discovered."
                };
                this.meshGroup.add(star);

                // Core Links for closest first-wave sectors (Simulating Podrolls)
                if (index < 8) {
                    const lineGeom = new THREE.BufferGeometry().setFromPoints([center, pos]);
                    const lineMat = new THREE.LineDashedMaterial({ color: 0x334155, dashSize: 15, gapSize: 8 });
                    const line = new THREE.Line(lineGeom, lineMat);
                    line.computeLineDistances();
                    this.meshGroup.add(line);
                }
            });
        }

        // 4. Draw the Universal Titans Constellation
        CELESTIAL_TITANS.forEach(titan => {
            let geom, mat;
            if (titan.type === 'station') {
                geom = new THREE.OctahedronGeometry(14, 0); // Sharp high-tech outpost shapes
                mat = new THREE.MeshPhongMaterial({ color: titan.color, emissive: titan.color, emissiveIntensity: 1.0 });
            } else if (titan.type === 'ship') {
                geom = new THREE.ConeGeometry(10, 25, 4); // Sharp cruisers
                mat = new THREE.MeshBasicMaterial({ color: titan.color, wireframe: true });
            } else {
                geom = new THREE.SphereGeometry(30, 32, 32); // Giant Binary Sun
                mat = new THREE.MeshBasicMaterial({ color: titan.color });
            }
            
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(titan.x, titan.y, titan.z);
            mesh.userData = {
                title: titan.title,
                url: "UNIVERSAL CONSTEL COORDINATE",
                description: titan.desc
            };
            
            // Slowly spin universal stations
            mesh.tick = () => {
                mesh.rotation.y += 0.01;
                mesh.rotation.x += 0.005;
            };
            this.meshGroup.add(mesh);
        });

        // Sector Point Light illumination
        const light = new THREE.PointLight(currentTier.color, 3, 800);
        this.meshGroup.add(light);

        // Reset camera focal lookAt but maintain OrbitControls zoom anchor
        this.controls.target.copy(center);
        this.controls.update();
    }

    resize() {
        if (!this.container.clientWidth) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update(); // Drive camera damping/pan inertia

        // Slowly spin the constellation and active nodes
        this.meshGroup.children.forEach(c => {
            if (c.tick) c.tick();
        });

        this.renderer.render(this.scene, this.camera);
    }
}

/* --- 5. QUAD CAM LOW-FOOTPRINT VIEWS --- */
class QuadCamView {
    constructor() {
        this.feeds = [
            { id: 'quadCanvas1', type: 'vector' },
            { id: 'quadCanvas2', type: 'top' },
            { id: 'quadCanvas3', type: 'chase' },
            { id: 'quadCanvas4', type: 'fly' }
        ];
        this.scenes = [];

        this.feeds.forEach(f => {
            const el = document.getElementById(f.id);
            if (!el) return;

            const sc = new THREE.Scene();
            const cam = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 1, 1000);
            cam.position.set(250, 150, 250);
            cam.lookAt(0, 0, 0);

            const ren = new THREE.WebGLRenderer({ antialias: false });
            ren.setSize(el.clientWidth, el.clientHeight);
            el.appendChild(ren.domElement);

            // Abstract low-poly geometry wireframes
            const grp = new THREE.Group();
            const box = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true }));
            grp.add(box);
            sc.add(grp);

            this.scenes.push({ sc, cam, ren, grp, el, type: f.type });
        });

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.scenes.forEach(s => {
            if (!s.el.clientWidth) return;
            s.cam.aspect = s.el.clientWidth / s.el.clientHeight;
            s.cam.updateProjectionMatrix();
            s.ren.setSize(s.el.clientWidth, s.el.clientHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.scenes.forEach(s => {
            if (!s.el.offsetParent) return; // Pause rendering if hidden
            s.grp.rotation.y += 0.005;
            s.ren.render(s.sc, s.cam);
        });
    }
}

/* --- 6. METAGALAXY MACRO VIEWER --- */
class MacroGalaxyView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 1, 8000);
        this.camera.position.set(0, 400, 1200);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxDistance = 4000;

        // Generate Host Cloud constellations
        this.grp = new THREE.Group();
        const clusters = ['Megaphone', 'iHeart', 'Spotify', 'Libsyn', 'Buzzsprout', 'SovereignV4V'];
        
        clusters.forEach((c, i) => {
            const pos = getDeterministicPosition(c, 1000);
            const coreGeom = new THREE.IcosahedronGeometry(30, 1);
            const coreMat = new THREE.MeshBasicMaterial({ color: (i === 5) ? 0x4ade80 : 0x6366f1, wireframe: true });
            const mesh = new THREE.Mesh(coreGeom, coreMat);
            mesh.position.copy(pos);
            this.grp.add(mesh);

            // Particle nebulas around clusters
            const partCount = 100;
            const positions = new Float32Array(partCount * 3);
            for (let k=0; k<partCount; k++) {
                positions[k*3] = pos.x + (Math.random() - 0.5) * 300;
                positions[k*3+1] = pos.y + (Math.random() - 0.5) * 300;
                positions[k*3+2] = pos.z + (Math.random() - 0.5) * 300;
            }
            const partGeom = new THREE.BufferGeometry();
            partGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const partMat = new THREE.PointsMaterial({ color: 0x818cf8, size: 3, transparent: true, opacity: 0.6 });
            this.grp.add(new THREE.Points(partGeom, partMat));
        });

        this.scene.add(this.grp);

        window.addEventListener('resize', () => {
            if (!this.container.clientWidth) return;
            this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });

        this.animate();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (!this.container.offsetParent) return;
        
        this.controls.update();
        this.grp.rotation.y += 0.0008;
        this.renderer.render(this.scene, this.camera);
    }
}

// --- ENGINE BOOT INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const astro = new AstrogationView('astrogationCanvasContainer');
    const quad = new QuadCamView();
    const macro = new MacroGalaxyView('macroCanvasContainer');

    // Map global hook so scanned feed payloads instantly paint the 3D world!
    window.plotStarNeighborhood = (title, url, data) => {
        if (astro) {
            astro.plot(title, url, data);
        }
    };
});
