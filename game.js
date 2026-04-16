const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const timerFill = document.getElementById('timer-fill');

// Game Constants
const GRID = 40;
const ROWS = 13;
const COLS = 12; // 480 / 40

// Colors from Atari Palette
const COLORS = {
    BLACK: '#000000',
    BLUE: '#000077', // Deep Royal Blue
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
let gameActive = false;
let timer = 100;

const player = {
    x: 5 * GRID,
    y: 12 * GRID,
    w: 30,
    h: 30,
    color: COLORS.LIGHT_GREEN,
    reset() {
        this.x = 5 * GRID;
        this.y = 12 * GRID;
    }
};

// Lane configuration
// Row 0: Goal
// Row 1-5: River (Logs/Turtles)
// Row 6: Safety Zone
// Row 7-11: Road (Cars)
// Row 12: Start

const lanes = [
    { y: 11 * GRID, speed: -1.5, color: COLORS.PINK, type: 'car', gap: 150, w: 40 },
    { y: 10 * GRID, speed: 1.2, color: COLORS.LIGHT_GREEN, type: 'car', gap: 180, w: 40 },
    { y: 9 * GRID, speed: -2.0, color: COLORS.PURPLE, type: 'car', gap: 160, w: 40 },
    { y: 8 * GRID, speed: 1.0, color: COLORS.ORANGE, type: 'car', gap: 140, w: 60 },
    { y: 7 * GRID, speed: -1.8, color: COLORS.WHITE, type: 'car', gap: 200, w: 40 },
    
    // River
    { y: 5 * GRID, speed: 1.5, color: COLORS.YELLOW, type: 'log', gap: 150, w: 100 },
    { y: 4 * GRID, speed: -1.2, color: COLORS.ORANGE, type: 'turtle', gap: 120, w: 80 },
    { y: 3 * GRID, speed: 2.5, color: COLORS.YELLOW, type: 'log', gap: 180, w: 140 },
    { y: 2 * GRID, speed: -1.0, color: COLORS.ORANGE, type: 'turtle', gap: 150, w: 80 },
    { y: 1 * GRID, speed: 1.4, color: COLORS.YELLOW, type: 'log', gap: 160, w: 100 }
];

let obstacles = [];

function initObstacles() {
    obstacles = [];
    lanes.forEach(lane => {
        for (let x = 0; x < canvas.width + lane.gap; x += lane.gap) {
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
        alert("GAME OVER! Score: " + score);
        score = 0;
        lives = 4;
    }
    player.reset();
    updateUI();
}

function checkCollision() {
    // Road/River bounds
    const row = Math.floor(player.y / GRID);
    
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
                    player.x += obs.speed; // Move with platform
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
        // Simple check for "niche" - let's say even columns are goals
        const col = Math.floor((player.x + player.w/2) / GRID);
        if (col % 2 === 1) { // Hit a green wall
            player.y += GRID;
        } else {
            score += 100;
            timer = 100;
            player.reset();
        }
    }

    // Out of bounds
    if (player.x < 0 || player.x + player.w > canvas.width) {
        die();
    }
}

window.addEventListener('keydown', e => {
    if (!gameActive) { gameActive = true; return; }
    
    const prevX = player.x;
    const prevY = player.y;

    switch(e.key) {
        case 'ArrowUp': player.y -= GRID; break;
        case 'ArrowDown': if (player.y < 12 * GRID) player.y += GRID; break;
        case 'ArrowLeft': player.x -= GRID; break;
        case 'ArrowRight': player.x += GRID; break;
    }
    
    // Prevent leaving screen top/bottom (except goal)
    if (player.y < 0) player.y = 0;
});

function update() {
    if (!gameActive) return;

    timer -= 0.05;
    if (timer <= 0) die();

    obstacles.forEach(obs => {
        obs.x += obs.speed;
        if (obs.speed > 0 && obs.x > canvas.width) obs.x = -obs.w - 50;
        if (obs.speed < 0 && obs.x < -obs.w) obs.x = canvas.width + 50;
    });

    checkCollision();
    updateUI();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background Zones
    // Start Zone
    ctx.fillStyle = COLORS.YELLOW;
    ctx.fillRect(0, 12 * GRID, canvas.width, GRID);
    
    // Road
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 7 * GRID, canvas.width, 5 * GRID);
    
    // Safety Zone
    ctx.fillStyle = COLORS.YELLOW;
    ctx.fillRect(0, 6 * GRID, canvas.width, GRID);
    
    // River
    ctx.fillStyle = COLORS.BLUE;
    ctx.fillRect(0, 1 * GRID, canvas.width, 5 * GRID);
    
    // Goal
    ctx.fillStyle = COLORS.GREEN;
    ctx.fillRect(0, 0, canvas.width, GRID);
    // Draw Goal Niches
    ctx.fillStyle = COLORS.BLUE;
    for (let i = 0; i < COLS; i += 2) {
        ctx.fillRect(i * GRID, 0, GRID, GRID);
    }

    // Draw Obstacles
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        if (obs.type === 'turtle') {
            // Draw blocks to simulate turtles
            ctx.fillRect(obs.x, obs.y, 25, 25);
            ctx.fillRect(obs.x + 35, obs.y, 25, 25);
        } else {
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        }
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + 5, player.y + 5, player.w - 10, player.h - 10);
    // Tiny eyes for the frog
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(player.x + 10, player.y + 10, 4, 4);
    ctx.fillRect(player.x + 20, player.y + 10, 4, 4);

    if (!gameActive) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0,0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.WHITE;
        ctx.textAlign = "center";
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillText("APERTE QUALQUER TECLA", canvas.width/2, canvas.height/2);
        ctx.fillText("PARA COMECAR", canvas.width/2, canvas.height/2 + 30);
    }
    
    requestAnimationFrame(draw);
}

// Tick update faster than draw for logic
setInterval(update, 1000/60);
initObstacles();
updateUI();
draw();
