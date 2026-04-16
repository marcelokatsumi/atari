const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const timerFill = document.getElementById('timer-fill');
const menuOverlay = document.getElementById('menu-overlay');
const startBtn = document.getElementById('start-btn');

// Game Constants
const GRID = 40;
const ROWS = 13;
const COLS = 12;

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

let score = 0;
let lives = 4;
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER
let timer = 100;

const player = {
    x: 5 * GRID,
    y: 12 * GRID,
    targetX: 5 * GRID,
    targetY: 12 * GRID,
    w: 30,
    h: 30,
    color: COLORS.LIGHT_GREEN,
    moveSpeed: 0.25, // For smooth interpolation
    reset() {
        this.x = 5 * GRID;
        this.y = 12 * GRID;
        this.targetX = 5 * GRID;
        this.targetY = 12 * GRID;
    }
};

// Easier difficulty: Larger gaps and slower speeds
const lanes = [
    { y: 11 * GRID, speed: -1.0, color: COLORS.PINK, type: 'car', gap: 250, w: 40 },
    { y: 10 * GRID, speed: 0.8, color: COLORS.LIGHT_GREEN, type: 'car', gap: 300, w: 40 },
    { y: 9 * GRID, speed: -1.2, color: COLORS.PURPLE, type: 'car', gap: 280, w: 40 },
    { y: 8 * GRID, speed: 0.7, color: COLORS.ORANGE, type: 'car', gap: 250, w: 60 },
    { y: 7 * GRID, speed: -1.1, color: COLORS.WHITE, type: 'car', gap: 320, w: 40 },
    
    // River
    { y: 5 * GRID, speed: 1.0, color: COLORS.YELLOW, type: 'log', gap: 250, w: 100 },
    { y: 4 * GRID, speed: -0.8, color: COLORS.ORANGE, type: 'turtle', gap: 220, w: 80 },
    { y: 3 * GRID, speed: 1.5, color: COLORS.YELLOW, type: 'log', gap: 300, w: 140 },
    { y: 2 * GRID, speed: -0.7, color: COLORS.ORANGE, type: 'turtle', gap: 250, w: 80 },
    { y: 1 * GRID, speed: 0.9, color: COLORS.YELLOW, type: 'log', gap: 280, w: 100 }
];

let obstacles = [];

function initObstacles() {
    obstacles = [];
    lanes.forEach(lane => {
        // Reduced initial count for easier start
        for (let x = -100; x < canvas.width + lane.gap; x += lane.gap) {
            obstacles.push({
                x: x,
                y: lane.y + 5,
                w: lane.w,
                h: 30,
                speed: lane.speed,
                color: lane.color,
                type: lane.type
            });
        }
    });
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
    }
    player.reset();
    updateUI();
}

function checkCollision() {
    const row = Math.floor((player.y + player.h/2) / GRID);
    
    // Road lanes (7-11)
    if (row >= 7 && row <= 11) {
        for (let obs of obstacles) {
            if (obs.type === 'car') {
                if (player.x < obs.x + obs.w && player.x + player.w > obs.x && player.y < obs.y + obs.h && player.y + player.h > obs.y) {
                    die();
                    return;
                }
            }
        }
    }
    
    // River lanes (1-5)
    if (row >= 1 && row <= 5) {
        let onPlatform = false;
        for (let obs of obstacles) {
            if (obs.type === 'log' || obs.type === 'turtle') {
                if (player.x < obs.x + obs.w && player.x + player.w > obs.x && player.y < obs.y + obs.h && player.y + player.h > obs.y) {
                    onPlatform = true;
                    // Push player targets along with platform speed
                    player.x += obs.speed;
                    player.targetX += obs.speed;
                    break;
                }
            }
        }
        if (!onPlatform) {
            die();
            return;
        }
    }

    // Goal (Row 0)
    if (row === 0) {
        const col = Math.floor((player.x + player.w/2) / GRID);
        if (col % 2 === 1) { 
            player.targetY = GRID;
        } else {
            score += 100;
            timer = 100;
            player.reset();
        }
    }

    // Bounds check
    if (player.x < -10 || player.x + player.w > canvas.width + 10) {
        die();
    }
}

// Menu Controls
startBtn.addEventListener('click', () => {
    gameState = 'PLAYING';
    menuOverlay.style.display = 'none';
    score = 0;
    lives = 4;
    timer = 100;
    player.reset();
    initObstacles();
    updateUI();
});

window.addEventListener('keydown', e => {
    if (gameState !== 'PLAYING') return;
    
    // Only allow new move if player is roughly at target (prevents queuing multiple jumps)
    const isStationary = Math.abs(player.x - player.targetX) < 1 && Math.abs(player.y - player.targetY) < 1;
    if (!isStationary) return;

    switch(e.key) {
        case 'ArrowUp': player.targetY -= GRID; break;
        case 'ArrowDown': if (player.targetY < 12 * GRID) player.targetY += GRID; break;
        case 'ArrowLeft': player.targetX -= GRID; break;
        case 'ArrowRight': player.targetX += GRID; break;
    }
    
    if (player.targetY < 0) player.targetY = 0;
});

function update() {
    if (gameState !== 'PLAYING') return;

    timer -= 0.04;
    if (timer <= 0) die();

    // Smooth movement interpolation
    player.x += (player.targetX - player.x) * player.moveSpeed;
    player.y += (player.targetY - player.y) * player.moveSpeed;

    obstacles.forEach(obs => {
        obs.x += obs.speed;
        if (obs.speed > 0 && obs.x > canvas.width + 20) obs.x = -obs.w - 100;
        if (obs.speed < 0 && obs.x < -obs.w - 20) obs.x = canvas.width + 100;
    });

    checkCollision();
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    ctx.fillStyle = COLORS.YELLOW;
    ctx.fillRect(0, 12 * GRID, canvas.width, GRID); // Start
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 7 * GRID, canvas.width, 5 * GRID); // Road
    ctx.fillStyle = COLORS.YELLOW;
    ctx.fillRect(0, 6 * GRID, canvas.width, GRID); // Middle
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillRect(0, 1 * GRID, canvas.width, 5 * GRID); // River
    ctx.fillStyle = COLORS.GREEN;
    ctx.fillRect(0, 0, canvas.width, GRID); // Goal
    
    // Goal Niches
    ctx.fillStyle = COLORS.BLUE;
    for (let i = 0; i < COLS; i += 2) {
        ctx.fillRect(i * GRID, 0, GRID, GRID);
    }

    // Draw Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        if (obs.type === 'turtle') {
            ctx.fillRect(obs.x, obs.y, 25, 25);
            ctx.fillRect(obs.x + 35, obs.y, 25, 25);
        } else {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
    });

    // Draw Player (Frank)
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + 5, player.y + 5, player.w - 10, player.h - 10);
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 10, player.y + 10, 4, 4);
    ctx.fillRect(player.x + 20, player.y + 10, 4, 4);

    requestAnimationFrame(draw);
}

setInterval(update, 1000/60);
initObstacles();
updateUI();
draw();
