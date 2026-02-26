const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 48;
const COLS = 13;
const ROWS = 11;

const TILE_EMPTY = 0;
const TILE_WALL = 1;
const TILE_BRICK = 2;
const TILE_EXIT = 3;

const DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

let game = {
  level: 1,
  score: 0,
  map: [],
  player: null,
  enemies: [],
  bullets: [],
  gameOver: false,
  victory: false,
  exitOpened: false
};

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE - 8;
    this.height = TILE_SIZE - 8;
    this.speed = 4;
    this.direction = DIRECTIONS.RIGHT;
    this.lastFired = 0;
    this.cooldown = 300;
  }

  update(keys) {
    let dx = 0, dy = 0;

    if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -this.speed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = this.speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -this.speed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = this.speed;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    if (dx > 0) this.direction = DIRECTIONS.RIGHT;
    else if (dx < 0) this.direction = DIRECTIONS.LEFT;
    else if (dy > 0) this.direction = DIRECTIONS.DOWN;
    else if (dy < 0) this.direction = DIRECTIONS.UP;

    const newX = this.x + dx;
    const newY = this.y + dy;

    if (!this.collides(newX, this.y)) this.x = newX;
    if (!this.collides(this.x, newY)) this.y = newY;
  }

  collides(x, y) {
    const padding = 4;
    const playerRect = {
      x: x + padding,
      y: y + padding,
      width: this.width,
      height: this.height
    };

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = game.map[row][col];
        if (tile === TILE_WALL || tile === TILE_BRICK) {
          const tileRect = {
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE
          };
          if (this.rectIntersect(playerRect, tileRect)) return true;
        }
      }
    }
    return false;
  }

  rectIntersect(r1, r2) {
    return !(r2.x >= r1.x + r1.width ||
             r2.x + r2.width <= r1.x ||
             r2.y >= r1.y + r1.height ||
             r2.y + r2.height <= r1.y);
  }

  shoot() {
    const now = Date.now();
    if (now - this.lastFired < this.cooldown) return;
    this.lastFired = now;

    const bulletX = this.x + TILE_SIZE / 2;
    const bulletY = this.y + TILE_SIZE / 2;

    game.bullets.push(new Bullet(bulletX, bulletY, this.direction));
  }

  draw() {
    ctx.fillStyle = '#4ecca3';
    ctx.fillRect(this.x + 4, this.y + 4, this.width, this.height);

    ctx.fillStyle = '#2d3436';
    const eyeSize = 6;
    const eyeOffset = 12;
    if (this.direction === DIRECTIONS.RIGHT) {
      ctx.fillRect(this.x + eyeOffset + 4, this.y + 10, eyeSize, eyeSize);
    } else if (this.direction === DIRECTIONS.LEFT) {
      ctx.fillRect(this.x + 4, this.y + 10, eyeSize, eyeSize);
    } else if (this.direction === DIRECTIONS.UP) {
      ctx.fillRect(this.x + 10, this.y + 4, eyeSize, eyeSize);
    } else {
      ctx.fillRect(this.x + 10, this.y + eyeOffset, eyeSize, eyeSize);
    }

    ctx.fillStyle = '#45b390';
    ctx.fillRect(this.x + TILE_SIZE / 2 - 3, this.y + TILE_SIZE / 2 - 3, 6, 6);
  }
}

class Bullet {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = 8;
    this.radius = 4;
    this.active = true;
  }

  update() {
    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;

    if (this.x < 0 || this.x > canvas.width ||
        this.y < 0 || this.y > canvas.height) {
      this.active = false;
      return;
    }

    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      const tile = game.map[row][col];
      if (tile === TILE_WALL) {
        this.active = false;
      } else if (tile === TILE_BRICK) {
        game.map[row][col] = TILE_EMPTY;
        this.active = false;
        game.score += 10;
        updateUI();
      }
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f9ed69';
    ctx.fill();
    ctx.closePath();
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE - 8;
    this.height = TILE_SIZE - 8;
    this.speed = 2;
    this.direction = DIRECTIONS.DOWN;
    this.changeDirectionTimer = 0;
  }

  update() {
    this.changeDirectionTimer++;
    if (this.changeDirectionTimer > 60 + Math.random() * 60) {
      this.changeDirectionTimer = 0;
      this.pickRandomDirection();
    }

    const dirs = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
    const newX = this.x + this.direction.x * this.speed;
    const newY = this.y + this.direction.y * this.speed;

    if (this.collides(newX, newY)) {
      this.pickRandomDirection();
    } else {
      this.x = newX;
      this.y = newY;
    }

    if (this.checkCollisionWithPlayer()) {
      endGame(false);
    }
  }

  pickRandomDirection() {
    const dirs = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
    this.direction = dirs[Math.floor(Math.random() * dirs.length)];
  }

  collides(x, y) {
    const padding = 4;
    const enemyRect = {
      x: x + padding,
      y: y + padding,
      width: this.width,
      height: this.height
    };

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tile = game.map[row][col];
        if (tile === TILE_WALL || tile === TILE_BRICK) {
          const tileRect = {
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE
          };
          if (enemyRect.x < tileRect.x + tileRect.width &&
              enemyRect.x + enemyRect.width > tileRect.x &&
              enemyRect.y < tileRect.y + tileRect.height &&
              enemyRect.y + enemyRect.height > tileRect.y) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkCollisionWithPlayer() {
    const playerRect = {
      x: game.player.x + 4,
      y: game.player.y + 4,
      width: game.player.width,
      height: game.player.height
    };
    const enemyRect = {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width,
      height: this.height
    };

    return !(enemyRect.x >= playerRect.x + playerRect.width ||
             enemyRect.x + enemyRect.width <= playerRect.x ||
             enemyRect.y >= playerRect.y + playerRect.height ||
             enemyRect.y + enemyRect.height <= playerRect.y);
  }

  draw() {
    ctx.fillStyle = '#e94560';
    ctx.fillRect(this.x + 4, this.y + 4, this.width, this.height);

    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 10, this.y + 12, 8, 8);
    ctx.fillRect(this.x + 24, this.y + 12, 8, 8);

    ctx.fillStyle = '#000';
    ctx.fillRect(this.x + 12, this.y + 14, 4, 4);
    ctx.fillRect(this.x + 26, this.y + 14, 4, 4);
  }
}

function generateMap() {
  game.map = [];

  for (let row = 0; row < ROWS; row++) {
    game.map[row] = [];
    for (let col = 0; col < COLS; col++) {
      if (row === 0 || row === ROWS - 1 || col === 0 || col === COLS - 1) {
        game.map[row][col] = TILE_WALL;
      } else if (row % 2 === 0 && col % 2 === 0) {
        game.map[row][col] = TILE_WALL;
      } else if (Math.random() < 0.3 && !(row <= 2 && col <= 2)) {
        game.map[row][col] = TILE_BRICK;
      } else {
        game.map[row][col] = TILE_EMPTY;
      }
    }
  }

  game.map[1][1] = TILE_EMPTY;
  game.map[1][2] = TILE_EMPTY;
  game.map[2][1] = TILE_EMPTY;
}

function spawnEnemies() {
  game.enemies = [];
  const numEnemies = Math.min(2 + game.level, 8);

  for (let i = 0; i < numEnemies; i++) {
    let x, y;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_SIZE;
      y = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_SIZE;
      attempts++;
    } while ((x < 3 * TILE_SIZE && y < 3 * TILE_SIZE) ||
             game.map[Math.floor(y / TILE_SIZE)][Math.floor(x / TILE_SIZE)] !== TILE_EMPTY ||
             attempts < 100);

    game.enemies.push(new Enemy(x, y));
  }
}

function spawnExit() {
  let placed = false;
  for (let row = ROWS - 2; row > 0 && !placed; row--) {
    for (let col = COLS - 2; col > 0 && !placed; col--) {
      if (game.map[row][col] === TILE_EMPTY) {
        game.map[row][col] = TILE_EXIT;
        placed = true;
      }
    }
  }
}

function checkExit() {
  const playerCenterX = game.player.x + TILE_SIZE / 2;
  const playerCenterY = game.player.y + TILE_SIZE / 2;
  const col = Math.floor(playerCenterX / TILE_SIZE);
  const row = Math.floor(playerCenterY / TILE_SIZE);

  if (game.map[row] && game.map[row][col] === TILE_EXIT && game.exitOpened) {
    nextLevel();
  }
}

function nextLevel() {
  game.level++;
  game.score += 100 * game.level;
  game.bullets = [];
  initGame();
}

function initGame() {
  generateMap();
  game.player = new Player(TILE_SIZE, TILE_SIZE);
  game.bullets = [];
  game.gameOver = false;
  game.victory = false;
  game.exitOpened = false;

  spawnEnemies();
  spawnExit();
  updateUI();
}

function updateUI() {
  document.getElementById('level').textContent = `Nivel: ${game.level}`;
  document.getElementById('enemies').textContent = `Enemigos: ${game.enemies.length}`;
  document.getElementById('score').textContent = `Puntos: ${game.score}`;
}

function endGame(won) {
  game.gameOver = true;
  game.victory = won;

  const modal = document.getElementById('gameOver');
  const title = document.getElementById('gameOverTitle');
  const message = document.getElementById('gameOverMessage');

  if (won) {
    title.textContent = '¡Victoria! 🎉';
    message.textContent = `¡Has completado todos los niveles! Puntuación final: ${game.score}`;
  } else {
    title.textContent = '¡Game Over! 💀';
    message.textContent = `Has perdido en el nivel ${game.level}. Puntuación: ${game.score}`;
  }

  modal.classList.remove('hidden');
}

function drawMap() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = game.map[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (tile === TILE_WALL) {
        ctx.fillStyle = '#636e72';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#2d3436';
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (tile === TILE_BRICK) {
        ctx.fillStyle = '#d35400';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#a04000';
        ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      } else if (tile === TILE_EXIT) {
        ctx.fillStyle = game.exitOpened ? '#00b894' : '#636e72';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('🚪', x + 8, y + 32);
      }
    }
  }
}

function update() {
  if (game.gameOver) return;

  game.player.update(keys);

  if (keys[' '] || keys['Spacebar']) {
    game.player.shoot();
  }

  game.bullets.forEach(bullet => bullet.update());
  game.bullets = game.bullets.filter(b => b.active);

  game.enemies.forEach(enemy => enemy.update());

  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const bullet = game.bullets[i];
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const enemy = game.enemies[j];
      const bulletRect = {
        x: bullet.x - bullet.radius,
        y: bullet.y - bullet.radius,
        width: bullet.radius * 2,
        height: bullet.radius * 2
      };
      const enemyRect = {
        x: enemy.x + 4,
        y: enemy.y + 4,
        width: enemy.width,
        height: enemy.height
      };

      if (bulletRect.x < enemyRect.x + enemyRect.width &&
          bulletRect.x + bulletRect.width > enemyRect.x &&
          bulletRect.y < enemyRect.y + enemyRect.height &&
          bulletRect.y + bulletRect.height > enemyRect.y) {
        game.enemies.splice(j, 1);
        bullet.active = false;
        game.score += 50;
        updateUI();
      }
    }
  }

  if (game.enemies.length === 0 && !game.exitOpened) {
    game.exitOpened = true;
  }

  checkExit();

  if (game.exitOpened) {
    const exitCol = game.map[ROWS - 2][COLS - 2] === TILE_EXIT ? COLS - 2 : -1;
    if (exitCol >= 0) {
      const row = ROWS - 2;
      const col = COLS - 2;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      ctx.fillStyle = 'rgba(0, 184, 148, 0.3)';
      ctx.fillRect(x - 10, y - 10, TILE_SIZE + 20, TILE_SIZE + 20);
    }
  }
}

function draw() {
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawMap();

  game.bullets.forEach(bullet => bullet.draw());
  game.enemies.forEach(enemy => enemy.draw());
  game.player.draw();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('gameOver').classList.add('hidden');
  game.level = 1;
  game.score = 0;
  initGame();
});

initGame();
gameLoop();
