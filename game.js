const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const timerFill = document.getElementById('timer-fill');
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');

// Game Constants
const GRID = 40;
const CANVAS_W = 480;
const CANVAS_H = 520;

const COLORS = {
    BLACK: '#000000',
    WHITE: '#ffffff',
    LIGHT_GREEN: '#66ff66',
    DARK_GREEN: '#004400',
    YELLOW: '#ffff00',
    BLUE: '#0000bb'
};

const THEMES = [
    { name: 'CITY', road: '#111111', river: '#000066', safe: '#224400', car: '#ff00ff', log: '#ffaa00' },
    { name: 'DESERT', road: '#331a00', river: '#aa8800', safe: '#442200', car: '#ffffff', log: '#ffff00' },
    { name: 'SPACE', road: '#000000', river: '#220044', safe: '#003344', car: '#00ffff', log: '#ffffff' }
];

let score = 0;
let lives = 4;
let gameState = 'MENU';
let timer = 100;
let cameraY = 0;
let frames = 0;
let lastCheckpointY = null;

const player = {
    x: 5 * GRID,
    y: CANVAS_H - GRID,
    w: 30,
    h: 30,
    color: COLORS.LIGHT_GREEN,
    reset(full = false) {
        if (full || lastCheckpointY === null) {
            this.x = 5 * GRID;
            this.y = CANVAS_H - GRID;
            cameraY = 0;
            lastCheckpointY = null;
            initMap();
        } else {
            this.x = 5 * GRID;
            this.y = lastCheckpointY;
            cameraY = -(this.y - CANVAS_H + 280);
        }
    }
};

let lanes = [];
let nextLaneY = CANVAS_H;
const CHECKPOINT_FREQ = 10; 

function createLane(y, forceType = null) {
    const laneIndex = Math.abs(Math.floor(y / GRID));
    const themeIdx = Math.floor(laneIndex / CHECKPOINT_FREQ) % THEMES.length;
    const theme = THEMES[themeIdx];
    
    let type = forceType || 'road';
    if (!forceType) {
        if (laneIndex % CHECKPOINT_FREQ === 0) type = 'checkpoint';
        else if (Math.random() > 0.45 && laneIndex % CHECKPOINT_FREQ > 3) type = 'river';
    }

    let speed = (Math.random() > 0.5 ? 1 : -1) * (1.3 + Math.random() * 0.7);
    let gap = 240 + Math.random() * 120; // Fair spacing
    let obsW = (type === 'river') ? 100 : 40;

    const rowObstacles = [];
    if (type !== 'checkpoint' && type !== 'sidewalk') {
        const offset = Math.random() * 400;
        for (let x = -400 + offset; x < CANVAS_W + 1200; x += gap) {
            rowObstacles.push({ x, w: obsW });
        }
    }

    return { y, type, speed, obsW, obstacles: rowObstacles, reached: false, theme };
}

function initMap() {
    lanes = [];
    nextLaneY = CANVAS_H;
    lanes.push(createLane(nextLaneY, 'sidewalk')); nextLaneY -= GRID;
    lanes.push(createLane(nextLaneY, 'sidewalk')); nextLaneY -= GRID;
    for (let i = 0; i < 40; i++) {
        lanes.push(createLane(nextLaneY));
        nextLaneY -= GRID;
    }
}

function updateUI() {
    scoreElement.textContent = score.toString().padStart(3, '0');
    livesElement.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const div = document.createElement('div');
        div.className = 'life-block';
        livesElement.appendChild(div);
    }
    timerFill.style.width = timer + '%';
}

function die() {
    lives--;
    timer = 100;
    if (lives < 0) {
        gameState = 'MENU';
        menuOverlay.style.display = 'flex';
        menuOverlay.querySelector('h2').innerText = "FIM DE JOGO!\n" + score;
        score = 0;
        lives = 4;
        player.reset(true);
    } else {
        player.reset(false);
    }
    updateUI();
}

function checkCollision() {
    const lane = lanes.find(l => player.y >= l.y && player.y < l.y + GRID);
    if (!lane) return;

    if (lane.type === 'checkpoint' && !lane.reached) {
        lane.reached = true;
        score += 50;
        timer = Math.min(100, timer + 30);
        lastCheckpointY = lane.y;
    }

    if (lane.type === 'road') {
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.obsW && player.x + player.w > obs.x) {
                die();
                return;
            }
        }
    }

    if (lane.type === 'river') {
        let onPlatform = false;
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.obsW && player.x + player.w > obs.x) {
                onPlatform = true;
                player.x += lane.speed;
                break;
            }
        }
        if (!onPlatform) die();
    }

    if (player.x < -10 || player.x + player.w > CANVAS_W + 10) die();
    if (player.y > -cameraY + CANVAS_H) die();
}

startBtn.addEventListener('click', () => {
    gameState = 'PLAYING';
    menuOverlay.style.display = 'none';
    player.reset(true);
    updateUI();
});

window.addEventListener('keydown', e => {
    if (gameState !== 'PLAYING') return;
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') player.y -= GRID;
    else if (key === 's' || key === 'arrowdown') player.y += GRID;
    else if (key === 'a' || key === 'arrowleft') player.x -= GRID;
    else if (key === 'd' || key === 'arrowright') player.x += GRID;
    if (player.y > (CANVAS_H - GRID)) player.y = CANVAS_H - GRID;
});

function update() {
    if (gameState !== 'PLAYING') return;
    frames++;
    timer -= 0.05;
    if (timer <= 0) die();

    const targetCameraY = -(player.y - CANVAS_H + 280);
    cameraY += (targetCameraY - cameraY) * 0.1;

    lanes.forEach(lane => {
        if (lane.type !== 'checkpoint' && lane.type !== 'sidewalk') {
            lane.obstacles.forEach(obs => {
                obs.x += lane.speed;
                if (lane.speed > 0 && obs.x > CANVAS_W + 200) obs.x = -200;
                if (lane.speed < 0 && obs.x < -200) obs.x = CANVAS_W + 200;
            });
        }
    });

    if (player.y < nextLaneY + (GRID * 15)) {
        for (let i = 0; i < 5; i++) {
            lanes.push(createLane(nextLaneY));
            nextLaneY -= GRID;
        }
    }
    checkCollision();
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(0, cameraY);

    lanes.forEach(lane => {
        // DRAW BACKGROUND
        if (lane.type === 'road') {
            ctx.fillStyle = lane.theme.road;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            // Road dashes (Yellow/White)
            ctx.fillStyle = '#ffffff44';
            for(let i=0; i<CANVAS_W; i+=40) ctx.fillRect(i, lane.y + GRID/2 - 1, 15, 2);
        } else if (lane.type === 'river') {
            ctx.fillStyle = lane.theme.river;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            // Water Ripples
            ctx.fillStyle = '#ffffff22';
            for(let i=0; i<5; i++) {
                let wx = ((frames + i*120) % (CANVAS_W+100)) - 50;
                ctx.fillRect(wx, lane.y + 10, 10, 2);
                ctx.fillRect(wx + 40, lane.y + 25, 10, 2);
            }
        } else if (lane.type === 'checkpoint') {
            ctx.fillStyle = lane.theme.safe;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            ctx.fillStyle = COLORS.WHITE;
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("CHECKPOINT", CANVAS_W/2, lane.y + 25);
        } else {
            ctx.fillStyle = '#555555'; // sidewalk
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
        }

        // DRAW OBSTACLES
        lane.obstacles.forEach(obs => {
            if (lane.type === 'road') {
                // CAR SHAPE
                ctx.fillStyle = lane.theme.car;
                ctx.fillRect(obs.x, lane.y + 6, lane.obsW, 28); // Body
                ctx.fillStyle = '#000000aa';
                ctx.fillRect(obs.x + 8, lane.y + 10, lane.obsW - 16, 20); // Roof/Windows
                ctx.fillStyle = '#ffff00'; // Headlights
                let headlightX = lane.speed > 0 ? obs.x + lane.obsW - 6 : obs.x + 2;
                ctx.fillRect(headlightX, lane.y + 8, 4, 4);
                ctx.fillRect(headlightX, lane.y + 28, 4, 4);
            } else if (lane.type === 'river') {
                // LOG SHAPE
                ctx.fillStyle = lane.theme.log;
                ctx.fillRect(obs.x, lane.y + 4, lane.obsW, 32);
                ctx.fillStyle = '#00000022'; // Bark texture
                for(let bx=10; bx < lane.obsW; bx+=30) ctx.fillRect(obs.x + bx, lane.y + 4, 4, 32);
            }
        });
    });

    // Draw Frank
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + 5, player.y + 5, 30, 30);
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 8, player.y + 8, 6, 6);
    ctx.fillRect(player.x + 22, player.y + 8, 6, 6);

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
initMap();
updateUI();
draw();
