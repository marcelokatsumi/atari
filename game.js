const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');

// Game Constants
const GRID = 40;
const CANVAS_W = 480;
const CANVAS_H = 520;

const COLORS = {
    BLACK: '#000000',
    WHITE: '#ffffff',
    FRANK_SKIN: '#5d3b31',
    FRANK_HAIR: '#7cb342', // Green
    LIGHT_GREEN: '#66ff66',
    DARK_GREEN: '#004400',
    YELLOW: '#ffff00',
    BLUE: '#0000bb',
    HEART_RED: '#ff0000'
};

const CAR_PALETTE = ['#ff00ff', '#00ffff', '#ffaa00', '#ffffff', '#ff3333', '#9900ff', '#00ff00', '#ffff00'];
const LOG_PALETTE = ['#ffaa00', '#ccaa00', '#ffffff', '#ffcc00'];

const THEMES = [
    { name: 'CITY', road: '#111111', river: '#000066', safe: '#224400' },
    { name: 'DESERT', road: '#331a00', river: '#aa8800', safe: '#442200' },
    { name: 'SPACE', road: '#000000', river: '#220044', safe: '#004466' }
];

let score = 0;
let lives = 4;
let gameState = 'MENU';
let cameraY = 0;
let frames = 0;
let lastCheckpointY = null;

const player = {
    x: 5 * GRID,
    y: CANVAS_H - GRID,
    w: 30,
    h: 30,
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
    const cyclePos = laneIndex % CHECKPOINT_FREQ;
    const themeIdx = Math.floor(laneIndex / CHECKPOINT_FREQ) % THEMES.length;
    const theme = THEMES[themeIdx];
    
    let type = forceType;
    if (!type) {
        if (cyclePos === 0) type = 'checkpoint';
        else if (cyclePos >= 5 && cyclePos <= 8) type = 'river';
        else type = 'road';
    }

    let speed = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.7);
    let obsW = (type === 'river') ? 130 : 45;
    let gap = (type === 'river') ? 280 + Math.random() * 80 : 320 + Math.random() * 100;
    let obstacleColor = (type === 'river') ? LOG_PALETTE[Math.floor(Math.random() * LOG_PALETTE.length)] : CAR_PALETTE[Math.floor(Math.random() * CAR_PALETTE.length)];

    const rowObstacles = [];
    if (type !== 'checkpoint' && type !== 'sidewalk') {
        const offset = Math.random() * 600;
        for (let x = -500 + offset; x < CANVAS_W + 1500; x += gap) {
            rowObstacles.push({ x, w: obsW, h: 32 });
        }
    }

    return { y, type, speed, obsW, obstacleColor, obstacles: rowObstacles, reached: false, theme };
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
        const span = document.createElement('span');
        span.className = 'life-heart';
        span.textContent = '❤️';
        livesElement.appendChild(span);
    }
}

function die() {
    lives--;
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
        lastCheckpointY = lane.y;
    }

    if (lane.type === 'road') {
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.w - 5 && player.x + player.w > obs.x + 5) {
                die();
                return;
            }
        }
    }

    if (lane.type === 'river') {
        let onPlatform = false;
        for (let obs of lane.obstacles) {
            if (player.x < obs.x + obs.w + 8 && player.x + player.w > obs.x - 8) {
                onPlatform = true;
                player.x += lane.speed;
                break;
            }
        }
        if (!onPlatform) die();
    }

    if (player.x < -30 || player.x + player.w > CANVAS_W + 30) die();
    // Safety check for scrolling past player
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
        if (lane.type === 'road') {
            ctx.fillStyle = lane.theme.road;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            ctx.fillStyle = '#ffffff33';
            for(let i=0; i<CANVAS_W; i+=40) ctx.fillRect(i, lane.y + GRID/2 - 1, 15, 2);
        } else if (lane.type === 'river') {
            ctx.fillStyle = lane.theme.river;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            ctx.fillStyle = '#ffffff22';
            for(let i=0; i<5; i++) {
                let wx = ((frames + i*130) % (CANVAS_W+150)) - 75;
                ctx.fillRect(wx, lane.y + 10, 15, 2);
                ctx.fillRect(wx + 50, lane.y + 25, 12, 2);
            }
        } else if (lane.type === 'checkpoint') {
            ctx.fillStyle = lane.theme.safe;
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
            ctx.fillStyle = COLORS.WHITE;
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText("CHECKPOINT", CANVAS_W/2, lane.y + 25);
        } else {
            ctx.fillStyle = '#444'; 
            ctx.fillRect(0, lane.y, CANVAS_W, GRID);
        }

        lane.obstacles.forEach(obs => {
            if (lane.type === 'road') {
                ctx.fillStyle = lane.obstacleColor;
                ctx.fillRect(obs.x, lane.y + 6, obs.w, 28);
                ctx.fillStyle = '#000000aa';
                ctx.fillRect(obs.x + 8, lane.y + 10, obs.w - 16, 20);
                ctx.fillStyle = '#ffff00';
                let hx = lane.speed > 0 ? obs.x + obs.w - 6 : obs.x + 2;
                ctx.fillRect(hx, lane.y + 8, 4, 4);
                ctx.fillRect(hx, lane.y + 28, 4, 4);
            } else if (lane.type === 'river') {
                ctx.fillStyle = lane.obstacleColor;
                ctx.fillRect(obs.x, lane.y + 4, obs.w, 32);
                ctx.fillStyle = '#00000022';
                for(let bx=15; bx < obs.w; bx+=35) ctx.fillRect(obs.x + bx, lane.y + 4, 3, 32);
            }
        });
    });

    // DRAW FRANK (WITH ARMS / BRACINHOS)
    const px = player.x + 5;
    const py = player.y + 5;
    
    // Skin (Face, Body, Legs)
    ctx.fillStyle = COLORS.FRANK_SKIN;
    // Torso
    ctx.fillRect(px, py + 15, 20, 10);
    // Legs
    ctx.fillRect(px + 4, py + 25, 4, 5); 
    ctx.fillRect(px + 12, py + 25, 4, 5);
    // Head
    ctx.fillRect(px, py + 5, 20, 10);
    
    // ARMS (BRACINHOS)
    ctx.fillRect(px - 4, py + 16, 4, 8); // Arm L
    ctx.fillRect(px + 20, py + 16, 4, 8); // Arm R

    // Hair
    ctx.fillStyle = COLORS.FRANK_HAIR;
    ctx.fillRect(px, py + 2, 20, 6);

    // Eyes
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(px + 4, py + 9, 3, 3);
    ctx.fillRect(px + 13, py + 9, 3, 3);

    ctx.restore();
    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
initMap();
updateUI();
draw();
