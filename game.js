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
    BLUE: '#000077',
    YELLOW: '#ffff00',
    GREEN: '#00cc00',
    DARK_GREEN: '#004400', // New Checkpoint Color
    LIGHT_GREEN: '#66ff66',
    WHITE: '#ffffff'
};

const THEMES = [
    { name: 'OCEAN', road: '#000000', river: '#000077', wall: '#004400', waterWave: '#3333ff' },
    { name: 'JUNGLE', road: '#1a2e00', river: '#004d33', wall: '#003300', waterWave: '#00664d' },
    { name: 'VOLCANO', road: '#220000', river: '#992200', wall: '#441100', waterWave: '#cc4400' },
    { name: 'CYBER', road: '#0a0015', river: '#440044', wall: '#110022', waterWave: '#880088' },
    { name: 'DESERT', road: '#331a00', river: '#997700', wall: '#332200', waterWave: '#cc9900' }
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
            // Adjust camera to focus on respawn point
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
        if (laneIndex % CHECKPOINT_FREQ === 0) {
            type = 'checkpoint';
        } else if (Math.random() > 0.5 && laneIndex % CHECKPOINT_FREQ > 3) {
            type = 'river';
        }
    }

    let color = (type === 'checkpoint') ? COLORS.DARK_GREEN : (type === 'river' ? theme.river : theme.road);
    let speed = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 1.3);
    let obstacleColor = [COLORS.PINK, COLORS.PURPLE, COLORS.ORANGE, COLORS.WHITE, COLORS.YELLOW][Math.floor(Math.random() * 5)];
    
    let gap = 260 + Math.random() * 140; 
    let obsW = 40;

    if (type === 'river') {
        obstacleColor = Math.random() > 0.5 ? COLORS.YELLOW : COLORS.ORANGE;
        obsW = 90 + Math.random() * 30;
        gap = 280 + Math.random() * 100;
    }

    const rowObstacles = [];
    if (type !== 'checkpoint') {
        const offset = Math.random() * 600;
        for (let x = -400 + offset; x < CANVAS_W + 1500; x += gap) {
            rowObstacles.push({ x, w: obsW, h: 32 });
        }
    }

    return { y, type, color, speed, obstacleColor, obstacles: rowObstacles, reached: false, themeIdx, theme };
}

function initMap() {
    lanes = [];
    nextLaneY = CANVAS_H;
    
    // START ON SIDEWALK: Initial position is safe
    lanes.push(createLane(nextLaneY, 'checkpoint'));
    nextLaneY -= GRID;
    lanes.push(createLane(nextLaneY, 'checkpoint'));
    nextLaneY -= GRID;

    for (let i = 0; i < 30; i++) {
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
        menuOverlay.querySelector('h2').textContent = "FIM DE JOGO!\nSCORE: " + score;
        score = 0;
        lives = 4;
        player.reset(true);
    } else {
        player.reset(false);
    }
    updateUI();
}

function checkCollision() {
    const lane = lanes.find(l => player.y + player.h > l.y && player.y < l.y + GRID);
    if (!lane) return;

    if (lane.type === 'checkpoint' && !lane.reached) {
        lane.reached = true;
        score += 50;
        timer = Math.min(100, timer + 40);
        lastCheckpointY = lane.y; // UPDATE LAST CHECKPOINT
    }

    if (lane.type === 'road') {
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.w && player.x + player.w > obs.x) {
                die();
                return;
            }
        }
    }

    if (lane.type === 'river') {
        let onPlatform = false;
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.w && player.x + player.w > obs.x) {
                onPlatform = true;
                player.x += lane.speed;
                break;
            }
        }
        if (!onPlatform) die();
    }

    if (player.x < -10 || player.x + player.w > CANVAS_W + 10) die();
    // Safety: if camera moves too far or player falls off bottom
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
    if (key === 's' || key === 'arrowdown') player.y += GRID;
    if (key === 'a' || key === 'arrowleft') player.x -= GRID;
    if (key === 'd' || key === 'arrowright') player.x += GRID;
    
    // Bounds check to avoid leaving top/bottom of world too far
    if (player.y > (CANVAS_H - GRID)) player.y = CANVAS_H - GRID;
});

function update() {
    if (gameState !== 'PLAYING') return;
    frames++;
    timer -= 0.04;
    if (timer <= 0) die();

    const targetCameraY = -(player.y - CANVAS_H + 280);
    cameraY += (targetCameraY - cameraY) * 0.1;

    lanes.forEach(lane => {
        if (lane.type !== 'checkpoint') {
            lane.obstacles.forEach(obs => {
                obs.x += lane.speed;
                if (lane.speed > 0 && obs.x > CANVAS_W + 200) obs.x = -200;
                if (lane.speed < 0 && obs.x < -200) obs.x = CANVAS_W + 200;
            });
        }
    });

    if (player.y < nextLaneY + (GRID * 15)) {
        for (let i = 0; i < 8; i++) {
            lanes.push(createLane(nextLaneY));
            nextLaneY -= GRID;
        }
    }
    // Optimization: keep lanes relevant to camera
    if (lanes.length > 80) {
        // Only remove if it's far below the camera
        if (lanes[0].y > -cameraY + CANVAS_H + GRID * 5) {
            lanes.shift();
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
        ctx.fillStyle = lane.color;
        ctx.fillRect(0, lane.y, CANVAS_W, GRID);

        if (lane.type === 'river') {
            ctx.fillStyle = lane.theme.waterWave;
            for (let i = 0; i < 8; i++) {
                let wx = ((frames * 1.2 + i * 80) % (CANVAS_W + 100)) - 50;
                ctx.fillRect(wx, lane.y + 18, 15, 2);
            }
        }

        if (lane.type === 'checkpoint') {
            ctx.fillStyle = COLORS.WHITE;
            ctx.font = "8px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("CHECKPOINT", CANVAS_W / 2, lane.y + 25);
            // Visual indicators for safe zone
            ctx.fillStyle = "#ffffff22";
            ctx.fillRect(0, lane.y + 2, CANVAS_W, 2);
            ctx.fillRect(0, lane.y + GRID - 4, CANVAS_W, 2);
        }

        ctx.fillStyle = lane.obstacleColor;
        lane.obstacles.forEach(obs => {
            if (lane.type === 'river') {
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#00000033';
                ctx.fillRect(obs.x + 15, lane.y + 4, 3, 32);
                ctx.fillRect(obs.x + obs.w - 18, lane.y + 4, 3, 32);
                ctx.fillStyle = lane.obstacleColor;
            } else {
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#fff';
                let eyeSide = lane.speed > 0 ? obs.x + obs.w - 8 : obs.x + 4;
                ctx.fillRect(eyeSide, lane.y + 8, 4, 4);
                ctx.fillRect(eyeSide, lane.y + 22, 4, 4);
                ctx.fillStyle = lane.obstacleColor;
            }
        });
    });

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
