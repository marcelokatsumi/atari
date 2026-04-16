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
    YELLOW: '#ffff00',
    PINK: '#ff00ff'
};

const THEMES = [
    { name: 'NIGHT CITY', road: '#111111', river: '#000044', safe: '#333333', accent: '#ffffff', wave: '#5555ff' },
    { name: 'RED DESERT', road: '#441100', river: '#994400', safe: '#662200', accent: '#ffcc00', wave: '#ff8800' },
    { name: 'DEEP FOREST', road: '#0d2200', river: '#003322', safe: '#1a4400', accent: '#88ff88', wave: '#00cc88' },
    { name: 'SYNTH WAVE', road: '#220033', river: '#440066', safe: '#000022', accent: '#00ffff', wave: '#ff00ff' },
    { name: 'WINTER', road: '#223344', river: '#44aabb', safe: '#ffffff', accent: '#000000', wave: '#ffffff' }
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
    color: '#66ff66',
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
        else if (Math.random() > 0.45 && laneIndex % CHECKPOINT_FREQ > 2) type = 'river';
    }

    let color = theme.road;
    if (type === 'checkpoint') color = theme.safe;
    else if (type === 'sidewalk') color = '#555555';
    else if (type === 'river') color = theme.river;

    let speed = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.9);
    
    // GUARANTEED FAIRNESS: Fixed spacing logic
    let obsW = (type === 'river') ? 110 : 45;
    let minGap = obsW + (GRID * 5); // Ensure at least 5 grid spaces between enemies
    let gap = minGap + Math.random() * 100;

    const rowObstacles = [];
    if (type !== 'checkpoint' && type !== 'sidewalk') {
        const startX = -400 + (Math.random() * 200);
        for (let x = startX; x < CANVAS_W + 1500; x += gap) {
            rowObstacles.push({ x, w: obsW, h: 32 });
        }
    }

    return { y, type, color, speed, obstacleColor: theme.accent, obstacles: rowObstacles, reached: false, theme };
}

function initMap() {
    lanes = [];
    nextLaneY = CANVAS_H;
    lanes.push(createLane(nextLaneY, 'sidewalk'));
    nextLaneY -= GRID;
    lanes.push(createLane(nextLaneY, 'sidewalk'));
    nextLaneY -= GRID;
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
        menuOverlay.querySelector('h2').innerText = "FIM DE JOGO!\nSCORE: " + score;
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
        lastCheckpointY = lane.y;
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
    if (player.y > (CANVAS_H - GRID)) player.y = CANVAS_H - GRID;
});

function update() {
    if (gameState !== 'PLAYING') return;
    frames++;
    timer -= 0.045;
    if (timer <= 0) die();

    const targetCameraY = -(player.y - CANVAS_H + 280);
    cameraY += (targetCameraY - cameraY) * 0.1;

    lanes.forEach(lane => {
        if (lane.type !== 'checkpoint' && lane.type !== 'sidewalk') {
            lane.obstacles.forEach(obs => {
                obs.x += lane.speed;
                if (lane.speed > 0 && obs.x > CANVAS_W + 300) obs.x = -300;
                if (lane.speed < 0 && obs.x < -300) obs.x = CANVAS_W + 300;
            });
        }
    });

    if (player.y < nextLaneY + (GRID * 15)) {
        for (let i = 0; i < 10; i++) {
            lanes.push(createLane(nextLaneY));
            nextLaneY -= GRID;
        }
    }
    if (lanes.length > 100) {
        if (lanes[0].y > -cameraY + CANVAS_H + GRID * 15) lanes.shift();
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

        // Visual Lane Markers
        if (lane.type === 'road') {
            ctx.fillStyle = lane.theme.accent + '22';
            for (let i = 0; i < CANVAS_W; i += 60) {
                ctx.fillRect(i, lane.y, 30, 2);
            }
        }

        // Water Effects
        if (lane.type === 'river') {
            ctx.fillStyle = lane.theme.wave;
            for (let i = 0; i < 4; i++) {
                let wx = ((frames * 0.9 + i * 140) % (CANVAS_W + 40)) - 20;
                ctx.fillRect(wx, lane.y + 18, 20, 3);
            }
        }

        if (lane.type === 'checkpoint') {
            ctx.fillStyle = lane.theme.accent;
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(lane.theme.name, CANVAS_W / 2, lane.y + 25);
        }

        lane.obstacles.forEach(obs => {
            ctx.fillStyle = lane.obstacleColor;
            if (lane.type === 'river') {
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#00000033';
                ctx.fillRect(obs.x + (obs.w / 4), lane.y + 4, 4, 32);
                ctx.fillRect(obs.x + (obs.w * 3 / 4), lane.y + 4, 4, 32);
            } else {
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#fff';
                let eyeSide = lane.speed > 0 ? obs.x + obs.w - 8 : obs.x + 4;
                ctx.fillRect(eyeSide, lane.y + 8, 4, 4);
                ctx.fillRect(eyeSide, lane.y + 22, 4, 4);
            }
        });
    });

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + 5, player.y + 5, 30, 30);
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 8, player.y + 8, 5, 5);
    ctx.fillRect(player.x + 22, player.y + 8, 5, 5);

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
initMap();
updateUI();
draw();
