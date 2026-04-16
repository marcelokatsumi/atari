const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let frames = 0;
let gameState = 'START';
let score = 0;
let lives = 3;
let level = 1;

// Controls setup
const keys = {
    ArrowLeft: false, ArrowRight: false,
    ArrowUp: false, ArrowDown: false,
    Space: false
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code) || e.code === 'Space') {
        if (e.code === 'Space') keys.Space = true;
        else keys[e.code] = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code) || e.code === 'Space') {
        if (e.code === 'Space') keys.Space = false;
        else keys[e.code] = false;
        e.preventDefault();
    }
});

const GROUND_Y = 240;
const UNDER_GROUND_Y = 460;

// Solid platforms
const solids = [
    { x: 0, y: GROUND_Y, w: 50, h: 20 },
    { x: 90, y: GROUND_Y, w: 150, h: 20 },
    { x: 240, y: GROUND_Y, w: 160, h: 20, isWater: true },
    { x: 400, y: GROUND_Y, w: 240, h: 20 },
    { x: 0, y: UNDER_GROUND_Y, w: 640, h: 20 }
];

const ladders = [
    { x: 50, y: GROUND_Y, w: 40, h: 220 }
];

const player = {
    x: 10, y: 200, w: 20, h: 30,
    vx: 0, vy: 0, speed: 3.5, jumpForce: -9, grav: 0.5,
    state: 'idle', color: '#ffcc00', prevSpace: false
};

const rope = {
    pivotX: 320, pivotY: -30, length: 260,
    angle: 0, maxAngle: Math.PI / 2.5, speed: 0.04
};

let scorpions = [];

function initLevel() {
    scorpions = [
        { x: 200, y: 440, w: 20, h: 20, vx: 2 + level*0.2, leftBound: 120, rightBound: 380 },
        { x: 450, y: 440, w: 20, h: 20, vx: -(2 + level*0.2), leftBound: 400, rightBound: 620 }
    ];
}

function resetPlayer() {
    player.x = 10;
    player.y = 180;
    player.vx = 0;
    player.vy = 0;
    player.state = 'idle';
}

function rectIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.w || r2.x + r2.w <= r1.x || r2.y >= r1.y + r1.h || r2.y + r2.h <= r1.y);
}

function die() {
    lives--;
    if (lives <= 0) {
        gameState = 'GAMEOVER';
    } else {
        resetPlayer();
    }
}

function update() {
    if (gameState !== 'PLAYING') return;
    frames++;

    // Update Rope
    rope.angle = rope.maxAngle * Math.sin(frames * rope.speed);
    let ropeEndX = rope.pivotX + rope.length * Math.sin(rope.angle);
    let ropeEndY = rope.pivotY + rope.length * Math.cos(rope.angle);

    let prevX = player.x;
    let prevY = player.y;

    if (player.state === 'swinging') {
        player.x = ropeEndX - player.w/2;
        player.y = Math.min(ropeEndY - player.h/2, GROUND_Y - player.h - 5);
        
        // Let go of the rope
        if (keys.Space && !player.prevSpace) {
            player.state = 'jumping';
            let angVel = rope.maxAngle * rope.speed * Math.cos(frames * rope.speed);
            let vel = rope.length * angVel;
            player.vx = vel * Math.cos(rope.angle);
            player.vy = vel * Math.sin(rope.angle) * 1.5; 
            if(player.vy > 0) player.vy = -3;
            else player.vy -= 4;
        }
    } else if (player.state === 'climbing') {
        player.vx = 0; player.vy = 0;
        if (keys.ArrowUp) player.vy = -2.5;
        if (keys.ArrowDown) player.vy = 2.5;
        if (keys.ArrowLeft) { player.state = 'jumping'; player.vx = -player.speed; }
        if (keys.ArrowRight) { player.state = 'jumping'; player.vx = player.speed; }
        
        player.y += player.vy;
        player.x += player.vx;
        
        let onLadder = false;
        for (let l of ladders) {
            if (rectIntersect(player, l)) {
                onLadder = true;
                player.x = l.x + l.w/2 - player.w/2;
                break;
            }
        }
        if (!onLadder) player.state = 'jumping';
    } else {
        // Horizontal Movement
        if (keys.ArrowLeft) player.vx = -player.speed;
        else if (keys.ArrowRight) player.vx = player.speed;
        else player.vx = 0;

        player.vy += player.grav;
        player.y += player.vy;
        
        let isGrounded = false;
        
        // Y Collision
        for (let s of solids) {
            if (rectIntersect(player, s)) {
                if (s.isWater) { die(); return; }
                if (player.vy > 0 && prevY + player.h <= s.y + 4) {
                    player.y = s.y - player.h;
                    player.vy = 0;
                    isGrounded = true;
                } else if (player.vy < 0 && prevY >= s.y + s.h - 4) {
                    player.y = s.y + s.h;
                    player.vy = 0;
                }
            }
        }
        
        if (isGrounded) {
            player.state = player.vx === 0 ? 'idle' : 'walking';
            if (keys.Space && !player.prevSpace) {
                player.vy = player.jumpForce;
                player.state = 'jumping';
                isGrounded = false;
            }
            if (keys.ArrowDown) {
                for (let l of ladders) {
                    if (rectIntersect(player, l)) {
                        player.state = 'climbing';
                        player.y += 4;
                        break;
                    }
                }
            }
            if (keys.ArrowUp) {
                for (let l of ladders) {
                    if (rectIntersect({x:player.x, y:player.y-5, w:player.w, h:player.h}, l)) {
                        player.state = 'climbing';
                        player.y -= 4;
                        break;
                    }
                }
            }
        } else {
            player.state = 'jumping';
        }

        player.x += player.vx;
        
        // X Collision
        for (let s of solids) {
            if (rectIntersect(player, s) && !s.isWater) {
                if (player.vx > 0 && prevX + player.w <= s.x + 4) {
                    player.x = s.x - player.w;
                    player.vx = 0;
                } else if (player.vx < 0 && prevX >= s.x + s.w - 4) {
                    player.x = s.x + s.w;
                    player.vx = 0;
                }
            }
        }
        
        // Grab Rope Logic
        if (player.state === 'jumping' && player.vy > -2) {
            let cx = player.x + player.w/2;
            let cy = player.y + player.h/2;
            if (Math.hypot(cx - ropeEndX, cy - ropeEndY) < 30) {
                player.state = 'swinging';
            }
        }
    }
    
    // Bounds & Screen Transition
    if (player.x < 0) player.x = 0;
    if (player.x > 640) {
        score += 100;
        level++;
        player.x = 10;
        initLevel();
    }
    if (player.y > 480) { die(); return; }

    // Scorpions Movement & Collision
    for (let s of scorpions) {
        s.x += s.vx;
        if (s.x > s.rightBound) { s.x = s.rightBound; s.vx *= -1; }
        else if (s.x < s.leftBound) { s.x = s.leftBound; s.vx *= -1; }
        // Shrink hitbox slightly for fairness
        let scorpionHitbox = {x: s.x+2, y: s.y+4, w: s.w-4, h: s.h-4};
        if (rectIntersect(player, scorpionHitbox)) { die(); return; }
    }
    
    player.prevSpace = keys.Space;
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 640, 480);
    
    if (gameState === 'START') {
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 36px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText('JUNGLE ADVENTURE', 320, 200);
        ctx.fillStyle = '#fff'; ctx.font = '20px "Courier New"';
        ctx.fillText('Pressione ESPAÇO para começar', 320, 260);
        
        if (keys.Space) {
            gameState = 'PLAYING'; score = 0; lives = 3; level = 1;
            resetPlayer(); initLevel(); keys.Space = false;
        }
        return;
    }
    
    if (gameState === 'GAMEOVER') {
        ctx.fillStyle = '#ff3300'; ctx.font = 'bold 40px "Courier New"'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 320, 220);
        ctx.fillStyle = '#fff'; ctx.font = '20px "Courier New"';
        ctx.fillText('Pressione ESPAÇO para tentar de novo', 320, 280);
        
        if (keys.Space) { gameState = 'START'; keys.Space = false; }
        return;
    }
    
    // Draw Solids
    solids.forEach(s => {
        if (s.isWater) {
            ctx.fillStyle = '#0055ff'; ctx.fillRect(s.x, s.y, s.w, s.h + 20);
            ctx.fillStyle = '#3388ff'; ctx.fillRect(s.x + (frames % 20 > 10 ? 0 : 5), s.y + 5, s.w - 10, 4); // fake wave
        } else {
            ctx.fillStyle = '#33cc33'; ctx.fillRect(s.x, s.y, s.w, s.h);
        }
    });

    // Draw Dirt
    ctx.fillStyle = '#663300';
    ctx.fillRect(0, 260, 50, 220);
    ctx.fillRect(90, 260, 150, 220);
    ctx.fillRect(400, 260, 240, 220);

    // Draw Ladders
    ctx.fillStyle = '#cc8800';
    ladders.forEach(l => {
        ctx.fillRect(l.x, l.y, 4, l.h); ctx.fillRect(l.x + l.w - 4, l.y, 4, l.h);
        for(let sy = l.y + 10; sy < l.y + l.h; sy += 15) ctx.fillRect(l.x, sy, l.w, 4);
    });
    
    // Draw Rope
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(rope.pivotX, rope.pivotY);
    let ropeEndX = rope.pivotX + rope.length * Math.sin(rope.angle);
    let ropeEndY = rope.pivotY + rope.length * Math.cos(rope.angle);
    ctx.lineTo(ropeEndX, ropeEndY); ctx.stroke();
    // Rope grab handle
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ropeEndX, ropeEndY, 5, 0, Math.PI * 2); ctx.fill();

    // Draw Scorpions
    ctx.fillStyle = '#ff3300';
    scorpions.forEach(s => {
        ctx.fillRect(s.x, s.y + 8, s.w, 12); // body
        ctx.fillRect(s.x + (s.vx > 0 ? -4 : s.w), s.y, 4, 12); // tail
        ctx.fillRect(s.x + (s.vx > 0 ? s.w : -4), s.y + 8, 4, 4); // pincers
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + 4, player.y, 12, 10); // head
    ctx.fillRect(player.x, player.y + 10, 20, 12); // torso
    if (player.state === 'walking' && Math.floor(frames / 5) % 2 === 0) {
        ctx.fillRect(player.x + 2, player.y + 22, 4, 8); ctx.fillRect(player.x + 14, player.y + 22, 4, 8);
    } else {
        ctx.fillRect(player.x + 4, player.y + 22, 4, 8); ctx.fillRect(player.x + 12, player.y + 22, 4, 8);
    }
    
    // Draw UI
    ctx.fillStyle = '#fff'; ctx.font = '16px "Courier New"'; ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20); ctx.fillText(`LIVES: ${lives}`, 10, 40);
    ctx.textAlign = 'right'; ctx.fillText(`LEVEL: ${level}`, 630, 20);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
