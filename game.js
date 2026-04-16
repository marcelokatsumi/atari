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
    LIGHT_GREEN: '#66ff66',
    PINK: '#ff00ff',
    ORANGE: '#ffaa00',
    PURPLE: '#9900ff',
    WHITE: '#ffffff'
};

const THEMES = [
    { name: 'OCEAN', road: '#000000', river: '#000077', wall: '#66ff66', waterWave: '#3333ff' },
    { name: 'JUNGLE', road: '#1a2e00', river: '#004d33', wall: '#669900', waterWave: '#00664d' },
    { name: 'VOLCANO', road: '#220000', river: '#992200', wall: '#cc8800', waterWave: '#cc4400' },
    { name: 'CYBER', road: '#0a0015', river: '#440044', wall: '#00aaaa', waterWave: '#880088' },
    { name: 'DESERT', road: '#331a00', river: '#997700', wall: '#ccaa00', waterWave: '#cc9900' }
];

let score = 0;
let lives = 4;
let gameState = 'MENU';
let timer = 100;
let cameraY = 0;
let frames = 0;

const player = {
    x: 5 * GRID,
    y: 11 * GRID,
    w: 30,
    h: 30,
    color: COLORS.LIGHT_GREEN,
    reset() {
        this.x = 5 * GRID;
        this.y = 11 * GRID;
        cameraY = 0;
        initMap();
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

    let color = (type === 'checkpoint') ? theme.wall : (type === 'river' ? theme.river : theme.road);
    let speed = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 1.3);
    let obstacleColor = [COLORS.PINK, COLORS.PURPLE, COLORS.ORANGE, COLORS.WHITE][Math.floor(Math.random() * 4)];
    
    // REDUCED ENEMY QUANTITY: Increased gap significantly
    let gap = 240 + Math.random() * 120; 
    let obsW = 40;

    if (type === 'river') {
        obstacleColor = Math.random() > 0.5 ? COLORS.YELLOW : COLORS.ORANGE;
        obsW = 90 + Math.random() * 30;
        gap = 260 + Math.random() * 100;
    }

    const rowObstacles = [];
    if (type !== 'checkpoint') {
        const offset = Math.random() * 500;
        for (let x = -300 + offset; x < CANVAS_W + 1200; x += gap) {
            rowObstacles.push({ x, w: obsW, h: 32 });
        }
    }

    return { y, type, color, speed, obstacleColor, obstacles: rowObstacles, reached: false, themeIdx, theme };
}

function initMap() {
    lanes = [];
    nextLaneY = CANVAS_H;
    
    // START ON SIDEWALK: Create 2 initial safe lanes
    lanes.push(createLane(nextLaneY, 'checkpoint'));
    nextLaneY -= GRID;
    lanes.push(createLane(nextLaneY, 'checkpoint'));
    nextLaneY -= GRID;

    for (let i = 0; i < 25; i++) {
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
    } else {
        const safety = lanes.find(l => l.type === 'checkpoint' && l.y > player.y);
        if (safety) {
            player.y = safety.y;
            player.x = 5 * GRID;
        } else {
            player.reset();
        }
    }
    updateUI();
}

function checkCollision() {
    const lane = lanes.find(l => player.y + player.h > l.y && player.y < l.y + GRID);
    if (!lane) return;

    if (lane.type === 'checkpoint' && !lane.reached) {
        lane.reached = true;
        score += 50;
        timer = Math.min(100, timer + 30);
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
    if (player.y > -cameraY + CANVAS_H) die();
}

startBtn.addEventListener('click', () => {
    gameState = 'PLAYING';
    menuOverlay.style.display = 'none';
    player.reset();
    updateUI();
});

window.addEventListener('keydown', e => {
    if (gameState !== 'PLAYING') return;
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') player.y -= GRID;
    if (key === 's' || key === 'arrowdown') player.y += GRID;
    if (key === 'a' || key === 'arrowleft') player.x -= GRID;
    if (key === 'd' || key === 'arrowright') player.x += GRID;
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
        for (let i = 0; i < 5; i++) {
            lanes.push(createLane(nextLaneY));
            nextLaneY -= GRID;
        }
    }
    if (lanes.length > 60) lanes.shift();

    checkCollision();
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save();
    ctx.translate(0, cameraY);

    lanes.forEach(lane => {
        // Base Lane
        ctx.fillStyle = lane.color;
        ctx.fillRect(0, lane.y, CANVAS_W, GRID);

        // BETTER IDENTIFICATION: Water Ripple Effect
        if (lane.type === 'river') {
            ctx.fillStyle = lane.theme.waterWave;
            for (let i = 0; i < 10; i++) {
                let wx = ((frames * 1.5 + i * 60) % CANVAS_W);
                ctx.fillRect(wx, lane.y + 15, 20, 2);
            }
        }

        if (lane.type === 'checkpoint') {
            ctx.fillStyle = '#ffffff33';
            ctx.fillRect(0, lane.y + 2, CANVAS_W, 2);
            ctx.fillRect(0, lane.y + GRID - 4, CANVAS_W, 2);
        }

        ctx.fillStyle = lane.obstacleColor;
        lane.obstacles.forEach(obs => {
            if (lane.type === 'river') {
                // Better looking PLATFORMS (Logs)
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#00000033';
                ctx.fillRect(obs.x + 10, lane.y + 4, 4, 32);
                ctx.fillRect(obs.x + obs.w - 14, lane.y + 4, 4, 32);
                ctx.fillStyle = lane.obstacleColor;
            } else {
                // Better looking CARS
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#fff';
                let eyeSide = lane.speed > 0 ? obs.x + obs.w - 8 : obs.x + 4;
                ctx.fillRect(eyeSide, lane.y + 8, 4, 4);
                ctx.fillRect(eyeSide, lane.y + 22, 4, 4);
                ctx.fillStyle = lane.obstacleColor;
            }
        });
    });

    // Draw Frank with better details
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
