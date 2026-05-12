const canvas = document.getElementById('atlasCanvas');
const ctx = canvas.getContext('2d');
const btnWarp = document.getElementById('atlasScanBtn');
const atlasInput = document.getElementById('atlasInput');
const statusText = document.getElementById('atlasStatus');

let animationFrame;
let centerPlanet = null;
let satellites = [];
let time = 0;

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}
window.addEventListener('resize', resizeCanvas);

// Expose globally so main.js can call it
window.generateGravityWell = function(planetName) {
    statusText.style.display = 'none';
    resizeCanvas();
    
    centerPlanet = {
        name: planetName.toUpperCase(),
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 40,
        color: '#3b82f6', // Neon Blue
        glow: '#60a5fa'
    };

    const numSatellites = Math.floor(Math.random() * 10) + 3; // 3 to 12 satellites
    satellites = [];
    
    // Some realistic mock titles for the MVP
    const mockTitles = ["Podcasting 2.0", "No Agenda", "Podnews", "Jupiter Broadcasting", "Moe Factz", "Curry & The Keeper", "Linux Unplugged", "Codenewbie", "Syntax", "Darknet Diaries", "Lex Fridman", "Bite Size Bitcoin"];
    
    for (let i = 0; i < numSatellites; i++) {
        const orbitRadius = 100 + Math.random() * 200; 
        const speed = 0.0005 + Math.random() * 0.0015; // MUCH slower
        const randomTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)];
        
        satellites.push({
            name: randomTitle,
            orbitRadius: orbitRadius,
            speed: speed,
            angle: Math.random() * Math.PI * 2,
            radius: 8 + Math.random() * 8,
            color: '#10b981', 
            glow: '#34d399',
            currentX: 0,
            currentY: 0
        });
    }

    if (animationFrame) cancelAnimationFrame(animationFrame);
    animate();
};

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 1;

    if (centerPlanet) {
        ctx.beginPath();
        ctx.arc(centerPlanet.x, centerPlanet.y, centerPlanet.radius, 0, Math.PI * 2);
        ctx.fillStyle = centerPlanet.color;
        ctx.shadowColor = centerPlanet.glow;
        ctx.shadowBlur = 30;
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(centerPlanet.name, centerPlanet.x, centerPlanet.y + centerPlanet.radius + 20);
    }

    satellites.forEach(sat => {
        sat.angle += sat.speed;
        
        sat.currentX = centerPlanet.x + Math.cos(sat.angle) * sat.orbitRadius;
        sat.currentY = centerPlanet.y + Math.sin(sat.angle) * sat.orbitRadius;
        
        ctx.beginPath();
        ctx.arc(centerPlanet.x, centerPlanet.y, sat.orbitRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(25, 54, 93, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sat.currentX, sat.currentY, sat.radius, 0, Math.PI * 2);
        ctx.fillStyle = sat.color;
        ctx.shadowColor = sat.glow;
        ctx.shadowBlur = 15;
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.shadowBlur = 0;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sat.name, sat.currentX, sat.currentY - sat.radius - 5);
    });

    animationFrame = requestAnimationFrame(animate);
}

// Handle clicking on satellites to warp
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check distance to all satellites
    for (const sat of satellites) {
        const dist = Math.sqrt(Math.pow(clickX - sat.currentX, 2) + Math.pow(clickY - sat.currentY, 2));
        // Give a generous 15px hit radius
        if (dist < sat.radius + 15) {
            window.generateGravityWell(sat.name);
            break;
        }
    }
});

btnWarp.addEventListener('click', () => {
    const query = atlasInput.value.trim();
    if (query) {
        window.generateGravityWell(query);
    }
});
