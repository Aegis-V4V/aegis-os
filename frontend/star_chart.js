import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// Master Global Hook for main.js handoff
window.plotStarNeighborhood = null;

// Core State
let activeTarget = null;
let activeNeighbors = [];

/* --- 1. MATHEMATICAL DETERMINISM ENGINE --- */
function hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Force to signed 32bit integer
    }
    return hash;
}

function getDeterministicPosition(seedString, scale = 800) {
    const h1 = hashString(seedString + "-alpha");
    const h2 = hashString(seedString + "-beta");
    const h3 = hashString(seedString + "-gamma");

    // Normalize and map to 3D space bounds
    const x = ((Math.abs(h1) % scale) - (scale / 2));
    const y = ((Math.abs(h2) % scale) - (scale / 2));
    const z = ((Math.abs(h3) % scale) - (scale / 2));
    return new THREE.Vector3(x, y, z);
}

/* --- 2. PODCAST-TO-STAR EVOLUTION METRICS (Tiers 1-7) --- */
function getStarTier(data) {
    const score = data.scores.omni || 10;
    
    // Custom Tiers mapped to astronomical archetypes
    if (score < 15) return { name: 'Nebula', color: 0x9333ea, size: 4, glow: '#a855f7' }; 
    if (score < 30) return { name: 'Protostar', color: 0xdb2777, size: 6, glow: '#ec4899' };
    if (score < 50) return { name: 'Main Sequence', color: 0x2563eb, size: 8, glow: '#3b82f6' };
    if (score < 70) return { name: 'Red Giant', color: 0xd97706, size: 14, glow: '#f59e0b' };
    if (score < 85) return { name: 'Supernova', color: 0xe11d48, size: 16, glow: '#f43f5e' };
    if (score < 95) return { name: 'Pulsar', color: 0x0891b2, size: 10, glow: '#06b6d4' };
    return { name: 'Black Hole', color: 0x0f172a, size: 18, glow: '#ffffff', isSpecial: true };
}

/* --- 3. MAIN ASTROGATION ENGINE --- */
class AstrogationView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0008);

        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 1, 5000);
        this.camera.position.set(0, 200, 600);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Ambient Glow
        const ambientLight = new THREE.AmbientLight(0x1e293b);
        this.scene.add(ambientLight);

        // Add galactic static particle background
        this.initBackgroundStars();

        // Vector lines & Star meshes
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);

        // Camera Rotation Controls
        this.isDragging = false;
        this.prevMouse = { x: 0, y: 0 };
        this.rotSpeed = 0.003;
        this.setupControls();

        // Setup Raycaster for Click Interactions
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupInteraction();

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    initBackgroundStars() {
        const geom = new THREE.BufferGeometry();
        const count = 800;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            pos[i] = (Math.random() - 0.5) * 3000;
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 2, transparent: true, opacity: 0.5 });
        const points = new THREE.Points(geom, mat);
        this.scene.add(points);
    }

    setupControls() {
        this.container.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.prevMouse = { x: e.clientX, y: e.clientY };
        });
        this.container.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - this.prevMouse.x;
            const deltaY = e.clientY - this.prevMouse.y;

            this.meshGroup.rotation.y += deltaX * this.rotSpeed;
            this.meshGroup.rotation.x += deltaY * this.rotSpeed;

            this.prevMouse = { x: e.clientX, y: e.clientY };
        });
        this.container.addEventListener('mouseup', () => this.isDragging = false);
        this.container.addEventListener('mouseleave', () => this.isDragging = false);

        // Scroll to zoom
        this.container.addEventListener('wheel', (e) => {
            this.camera.position.z += e.deltaY * 0.5;
            this.camera.position.z = Math.max(100, Math.min(this.camera.position.z, 1500));
        });

        const resetBtn = document.getElementById('resetCamBtn');
        if(resetBtn) resetBtn.addEventListener('click', () => {
            this.meshGroup.rotation.set(0, 0, 0);
            this.camera.position.set(0, 200, 600);
        });
    }

    setupInteraction() {
        this.container.addEventListener('click', (e) => {
            // Don't fire interaction if we were dragging
            if (Math.abs(e.clientX - this.prevMouse.x) > 5) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.meshGroup.children);

            if (intersects.length > 0) {
                const clickedObj = intersects[0].object;
                if (clickedObj.userData && clickedObj.userData.type === 'star') {
                    alert(`🛸 PLOTTING WARP COORDINATES\n\nTargeting Show: ${clickedObj.userData.title}\nCoordinates: X: ${clickedObj.position.x.toFixed(0)}, Y: ${clickedObj.position.y.toFixed(0)}, Z: ${clickedObj.position.z.toFixed(0)}`);
                    
                    // Auto-Inject RSS back into console to warp!
                    const consoleInput = document.getElementById('feedInput');
                    const scanBtn = document.getElementById('scanBtn');
                    if(consoleInput && clickedObj.userData.url) {
                        consoleInput.value = clickedObj.userData.url;
                        // Force back to Main Monitor View for scanning!
                        const scanKey = document.querySelector('[data-target="monitor-scanner"]');
                        if(scanKey) scanKey.click();
                        setTimeout(() => scanBtn.click(), 100);
                    }
                }
            }
        });
    }

    plot(title, url, scanData) {
        // Clear group
        while(this.meshGroup.children.length > 0) {
            this.meshGroup.remove(this.meshGroup.children[0]);
        }

        const centerPos = new THREE.Vector3(0, 0, 0);
        const tier = getStarTier(scanData);

        // 1. Core Sun (Target Show)
        const sunGeom = new THREE.SphereGeometry(tier.size, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: tier.color });
        const sun = new THREE.Mesh(sunGeom, sunMat);
        sun.position.copy(centerPos);
        sun.userData = { type: 'star', title: title, url: url };
        this.meshGroup.add(sun);

        // Orbital Planets (The Episodes)
        const epCount = Math.min(scanData.recentEpisodesCount || 10, 12);
        for(let i = 0; i < epCount; i++) {
            const orbitRadius = 40 + (i * 20);
            const angle = Math.random() * Math.PI * 2;
            const planetPos = new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
            
            // Render Episode Planet
            const planGeom = new THREE.SphereGeometry(2 + Math.random() * 3, 16, 16);
            const planMat = new THREE.MeshPhongMaterial({ color: 0x475569, emissive: 0x111827 });
            const planet = new THREE.Mesh(planGeom, planMat);
            planet.position.copy(planetPos);
            this.meshGroup.add(planet);

            // Simple Orbit Ring Line
            const ringGeom = new THREE.RingGeometry(orbitRadius - 0.5, orbitRadius + 0.5, 64);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.rotation.x = Math.PI / 2;
            this.meshGroup.add(ring);
        }

        // 2. Deterministic Neighbors (Min 50 Stars)
        const neighborCount = 60;
        const targetHash = hashString(url);

        for(let i = 0; i < neighborCount; i++) {
            const neighborSeed = url + "-neigh-" + i;
            const pos = getDeterministicPosition(neighborSeed, 1000);

            // Create deterministic scale/color from loop index
            const isV4V = ((targetHash + i) % 4) === 0;
            const starSize = 2 + (Math.abs(targetHash + i) % 4);
            const starColor = isV4V ? 0x4ade80 : 0x38bdf8;

            const nGeom = new THREE.SphereGeometry(starSize, 16, 16);
            const nMat = new THREE.MeshBasicMaterial({ color: starColor });
            const neighbor = new THREE.Mesh(nGeom, nMat);
            neighbor.position.copy(pos);
            neighbor.userData = { 
                type: 'star', 
                title: `Podcast Node #${i + 100}`, 
                url: `https://podcastindex.org/podcast/${Math.abs(targetHash + i) % 5000000}` 
            };
            
            this.meshGroup.add(neighbor);

            // 3. Draw Neon Dashed Vector Line for certain nodes (Simulating Podroll links)
            if (i < 8) {
                const points = [];
                points.push(centerPos);
                points.push(pos);
                const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
                
                const lineMat = new THREE.LineDashedMaterial({
                    color: 0x06b6d4,
                    dashSize: 10,
                    gapSize: 5,
                    linewidth: 2
                });
                
                const line = new THREE.Line(lineGeom, lineMat);
                line.computeLineDistances(); // Mandatory for dashes!
                this.meshGroup.add(line);
            }
        }

        // Dynamic point light at sun center
        const light = new THREE.PointLight(tier.color, 2, 500);
        this.meshGroup.add(light);
    }

    resize() {
        if (!this.container.clientWidth) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Lazily rotate mesh group to feel alive
        if (!this.isDragging) {
            this.meshGroup.rotation.y += 0.0005;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

/* --- 4. QUAD VIEW CONTROLLER --- */
class QuadCamView {
    constructor() {
        // We set up 4 small orthographic/perspective scenes using low GPU footprints
        this.feeds = [
            { id: 'quadCanvas1', cameraType: 'chase' },
            { id: 'quadCanvas2', cameraType: 'top' },
            { id: 'quadCanvas3', cameraType: 'orbit' },
            { id: 'quadCanvas4', cameraType: 'vector' }
        ];

        this.scenes = [];

        this.feeds.forEach(f => {
            const el = document.getElementById(f.id);
            if (!el) return;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 1, 2000);
            
            if(f.cameraType === 'top') {
                camera.position.set(0, 400, 0);
                camera.lookAt(0, 0, 0);
            } else if (f.cameraType === 'chase') {
                camera.position.set(150, 150, 400);
                camera.lookAt(0,0,0);
            } else {
                camera.position.set(300, 0, 300);
                camera.lookAt(0,0,0);
            }

            const renderer = new THREE.WebGLRenderer({ antialias: false });
            renderer.setSize(el.clientWidth, el.clientHeight);
            el.appendChild(renderer.domElement);

            const group = new THREE.Group();
            scene.add(group);
            
            // Populate simple abstract galaxy nodes
            const geom = new THREE.BoxGeometry(10, 10, 10);
            const mat = new THREE.MeshBasicMaterial({ color: 0x166534, wireframe: true });
            const wireframeCube = new THREE.Mesh(geom, mat);
            group.add(wireframeCube);

            // Random orbital points
            const pGeom = new THREE.BufferGeometry();
            const pPos = new Float32Array(30 * 3);
            for(let i=0; i<90; i++) pPos[i] = (Math.random() - 0.5) * 400;
            pGeom.setAttribute('position', new THREE.BufferAttribute(pPos,3));
            const pMat = new THREE.PointsMaterial({ color: 0x22c55e, size: 3 });
            group.add(new THREE.Points(pGeom, pMat));

            this.scenes.push({ scene, camera, renderer, group, element: el, type: f.cameraType });
        });

        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.scenes.forEach(s => {
            if (!s.element.clientWidth) return;
            s.camera.aspect = s.element.clientWidth / s.element.clientHeight;
            s.camera.updateProjectionMatrix();
            s.renderer.setSize(s.element.clientWidth, s.element.clientHeight);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.scenes.forEach(s => {
            if (!s.element.offsetParent) return; // Only render if container is visible!
            
            s.group.rotation.y += 0.002;
            if (s.type === 'orbit') {
                s.camera.position.x = Math.cos(Date.now() * 0.0002) * 400;
                s.camera.position.z = Math.sin(Date.now() * 0.0002) * 400;
                s.camera.lookAt(0,0,0);
            }
            s.renderer.render(s.scene, s.camera);
        });
    }
}

/* --- 5. METAGALAXY MACRO ENGINE --- */
class MacroGalaxyView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, this.container.clientWidth / this.container.clientHeight, 1, 10000);
        this.camera.position.set(0, 500, 1500);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.container.appendChild(this.renderer.domElement);

        // Render 200 huge star systems (simulating hosting provider clusters)
        const group = new THREE.Group();
        
        // Major Hosts (Spore galaxies)
        const hosts = ['Megaphone', 'iHeart', 'Substack', 'Libsyn', 'Anchor', 'Buzzsprout'];
        hosts.forEach((host, idx) => {
            const seedPos = getDeterministicPosition(host, 1000);
            const coreGeom = new THREE.SphereGeometry(25, 32, 32);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true });
            const core = new THREE.Mesh(coreGeom, coreMat);
            core.position.copy(seedPos);
            group.add(core);

            // Cloud particles
            const cloudGeom = new THREE.BufferGeometry();
            const cPos = new Float32Array(50 * 3);
            for(let j=0; j<50; j++) {
                cPos[j*3] = seedPos.x + (Math.random() - 0.5) * 200;
                cPos[j*3+1] = seedPos.y + (Math.random() - 0.5) * 200;
                cPos[j*3+2] = seedPos.z + (Math.random() - 0.5) * 200;
            }
            cloudGeom.setAttribute('position', new THREE.BufferAttribute(cPos,3));
            const cloudMat = new THREE.PointsMaterial({ color: 0x818cf8, size: 4 });
            group.add(new THREE.Points(cloudGeom, cloudMat));
        });

        this.scene.add(group);
        this.group = group;

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
        this.group.rotation.y += 0.001;
        this.renderer.render(this.scene, this.camera);
    }
}

// Boot Engines on Initialization
document.addEventListener('DOMContentLoaded', () => {
    const astro = new AstrogationView('astrogationCanvasContainer');
    const quad = new QuadCamView();
    const macro = new MacroGalaxyView('macroCanvasContainer');

    // Attach hook so main.js can stream scan data into the 3D canvas!
    window.plotStarNeighborhood = (title, url, data) => {
        if(astro) {
            astro.plot(title, url, data);
        }
    };
});
