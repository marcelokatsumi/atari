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
    WHITE: '#ffffff',
    CHECKPOINT: '#ffffff'
};

let score = 0;
let lives = 4;
let gameState = 'MENU';
let timer = 100;
let cameraY = 0;

const player = {
    x: CANVAS_W / 2 - 15,
    y: CANVAS_H - 80,
    w: 30,
    h: 30,
    speed: 4,
    color: COLORS.LIGHT_GREEN,
    reset() {
        this.x = CANVAS_W / 2 - 15;
        this.y = CANVAS_H - 80;
        cameraY = 0;
        initMap();
    }
};

const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Lane system for infinite map
let lanes = [];
let nextLaneY = CANVAS_H - GRID;
const CHECKPOINT_FREQ = 8; // Every 8 lanes

function createLane(y) {
    const laneIndex = Math.abs(Math.floor(y / GRID));
    let type = 'road';
    let color = COLORS.BLACK;
    let speed = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.5);
    let obstacleColor = [COLORS.PINK, COLORS.PURPLE, COLORS.ORANGE, COLORS.WHITE][Math.floor(Math.random() * 4)];
    let gap = 200 + Math.random() * 200;
    let obsW = 40;

    if (laneIndex % CHECKPOINT_FREQ === 0) {
        type = 'checkpoint';
        color = COLORS.YELLOW;
    } else if (Math.random() > 0.6) {
        type = 'river';
        color = COLORS.BLUE;
        obstacleColor = Math.random() > 0.5 ? COLORS.YELLOW : COLORS.ORANGE;
        obsW = 80 + Math.random() * 60;
    }

    const rowObstacles = [];
    if (type !== 'checkpoint') {
        for (let x = -200; x < CANVAS_W + gap; x += gap) {
            rowObstacles.push({ x, w: obsW, h: 30 });
        }
    }

    return { y, type, color, speed, obstacleColor, obstacles: rowObstacles, reached: false };
}

function initMap() {
    lanes = [];
    nextLaneY = CANVAS_H - GRID;
    // Generate initial set
    for (let i = 0; i < 20; i++) {
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
        // Back to last checkpoint logic simplified: find nearest safety below
        const safety = lanes.find(l => l.type === 'checkpoint' && l.y > player.y);
        if (safety) {
            player.y = safety.y + 5;
            cameraY = -(player.y - CANVAS_H + 150);
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
        timer = Math.min(100, timer + 20); // Bonus time
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
                player.x += lane.speed; // Move with river item
                break;
            }
        }
        if (!onPlatform) die();
    }

    if (player.x < 0 || player.x + player.w > CANVAS_W) die();
    // Special: Fell off bottom of screen
    if (player.y > -cameraY + CANVAS_H) die();
}

startBtn.addEventListener('click', () => {
    gameState = 'PLAYING';
    menuOverlay.style.display = 'none';
    player.reset();
    updateUI();
});

function update() {
    if (gameState !== 'PLAYING') return;

    timer -= 0.03;
    if (timer <= 0) die();

    // Continuous Movement (WASD + Arrows)
    if (keys['w'] || keys['arrowup']) player.y -= player.speed;
    if (keys['s'] || keys['arrowdown']) player.y += player.speed;
    if (keys['a'] || keys['arrowleft']) player.x -= player.speed;
    if (keys['d'] || keys['arrowright']) player.x += player.speed;

    // Smooth Camera Follow
    const targetCameraY = -(player.y - CANVAS_H + 200);
    cameraY += (targetCameraY - cameraY) * 0.1;

    // Lane Generation and Cleaning
    lanes.forEach(lane => {
        if (lane.type !== 'checkpoint') {
            lane.obstacles.forEach(obs => {
                obs.x += lane.speed;
                if (lane.speed > 0 && obs.x > CANVAS_W + 50) obs.x = -obs.w - 100;
                if (lane.speed < 0 && obs.x < -obs.w - 50) obs.x = CANVAS_W + 100;
            });
        }
    });

    if (player.y < nextLaneY + (GRID * 10)) {
        for (let i = 0; i < 5; i++) {
            lanes.push(createLane(nextLaneY));
            nextLaneY -= GRID;
        }
    }
    
    // Clean old lanes (optimization)
    if (lanes.length > 50) lanes.shift();

    checkCollision();
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.translate(0, cameraY);

    // Draw Lanes
    lanes.forEach(lane => {
        ctx.fillStyle = lane.color;
        ctx.fillRect(0, lane.y, CANVAS_W, GRID);

        if (lane.type === 'checkpoint') {
            ctx.fillStyle = COLORS.WHITE;
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillText("CHECKPOINT", 10, lane.y + 25);
        }

        ctx.fillStyle = lane.obstacleColor;
        lane.obstacles.forEach(obs => {
            ctx.fillRect(obs.x, lane.y + 5, obs.w, 30);
        });
    });

    // Draw Player (Frank)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 5, player.y + 5, 4, 4);
    ctx.fillRect(player.x + 20, player.y + 5, 4, 4);

    ctx.restore();

    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
initMap();
updateUI();
draw();
