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
  enemyBullets: [],
  gameOver: false,
  victory: false,
  exitOpened: false,
  shopOpen: false
};

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE - 8;
    this.height = TILE_SIZE - 8;
    this.baseSpeed = 4;
    this.speed = 4;
    this.direction = DIRECTIONS.RIGHT;
    this.lastFired = 0;
    this.cooldown = 300;
    this.weapon = 'pistol';
    this.doubleShot = false;
    this.speedLevel = 0;
  }

  update(keys) {
    if (game.shopOpen) return;
    
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
    let cooldown = this.cooldown;
    
    if (this.weapon === 'rifle') cooldown = 150;
    if (this.weapon === 'shotgun') cooldown = 500;
    
    if (now - this.lastFired < cooldown) return;
    this.lastFired = now;

    const bulletX = this.x + TILE_SIZE / 2;
    const bulletY = this.y + TILE_SIZE / 2;

    if (this.weapon === 'shotgun') {
      const dirs = [
        this.direction,
        { x: this.direction.x * 0.7 + this.direction.y * 0.7, y: this.direction.y * 0.7 - this.direction.x * 0.7 },
        { x: this.direction.x * 0.7 - this.direction.y * 0.7, y: this.direction.y * 0.7 + this.direction.x * 0.7 }
      ];
      dirs.forEach((dir, i) => {
        setTimeout(() => {
          game.bullets.push(new Bullet(bulletX, bulletY, dir, this.weapon));
        }, i * 50);
      });
    } else if (this.doubleShot) {
      const offset = this.direction === DIRECTIONS.UP || this.direction === DIRECTIONS.DOWN ? 10 : 0;
      const perpX = this.direction === DIRECTIONS.UP || this.direction === DIRECTIONS.DOWN ? 1 : 0;
      const perpY = this.direction === DIRECTIONS.LEFT || this.direction === DIRECTIONS.RIGHT ? 1 : 0;
      
      game.bullets.push(new Bullet(bulletX - offset * perpX - 10 * perpX, bulletY - offset * perpY - 10 * perpY, this.direction, this.weapon));
      game.bullets.push(new Bullet(bulletX + offset * perpX + 10 * perpX, bulletY + offset * perpY + 10 * perpY, this.direction, this.weapon));
    } else {
      game.bullets.push(new Bullet(bulletX, bulletY, this.direction, this.weapon));
    }
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
  constructor(x, y, direction, weapon = 'pistol') {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.weapon = weapon;
    this.speed = weapon === 'rifle' ? 12 : 8;
    this.radius = weapon === 'shotgun' ? 5 : 4;
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
    if (this.weapon === 'rifle') {
      ctx.fillStyle = '#00cec9';
    } else if (this.weapon === 'shotgun') {
      ctx.fillStyle = '#fd79a8';
    } else {
      ctx.fillStyle = '#f9ed69';
    }
    ctx.fill();
    ctx.closePath();
  }
}

class Enemy {
  constructor(x, y, type = 'basic') {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE - 8;
    this.height = TILE_SIZE - 8;
    this.type = type;
    this.speed = 2;
    this.direction = DIRECTIONS.DOWN;
    this.changeDirectionTimer = 0;
    this.lastFired = 0;
    this.teleportTimer = 0;
    this.phaseTimer = 0;
    
    this.setupType(type);
  }

  setupType(type) {
    switch(type) {
      case 'fast':
        this.speed = 3.5;
        break;
      case 'hunter':
        this.speed = 1.8;
        break;
      case 'teleporter':
        this.speed = 2;
        this.teleportTimer = 180;
        break;
      case 'ghost':
        this.speed = 2.5;
        break;
      case 'shooter':
        this.speed = 1.5;
        break;
    }
  }

  update() {
    if (this.type === 'hunter') {
      this.hunterBehavior();
    } else if (this.type === 'teleporter') {
      this.teleporterBehavior();
    } else if (this.type === 'ghost') {
      this.ghostBehavior();
    } else if (this.type === 'shooter') {
      this.shooterBehavior();
    } else {
      this.basicBehavior();
    }

    if (this.checkCollisionWithPlayer()) {
      endGame(false);
    }
  }

  basicBehavior() {
    this.changeDirectionTimer++;
    if (this.changeDirectionTimer > 60 + Math.random() * 60) {
      this.changeDirectionTimer = 0;
      this.pickRandomDirection();
    }
    this.move();
  }

  hunterBehavior() {
    this.phaseTimer++;
    const dx = game.player.x - this.x;
    const dy = game.player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      const targetDir = {
        x: Math.sign(dx),
        y: Math.sign(dy)
      };
      
      if (this.phaseTimer > 30) {
        this.phaseTimer = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.direction = targetDir.x > 0 ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
        } else {
          this.direction = targetDir.y > 0 ? DIRECTIONS.DOWN : DIRECTIONS.UP;
        }
      }
    }
    this.move();
  }

  teleporterBehavior() {
    this.changeDirectionTimer++;
    this.teleportTimer--;
    
    if (this.teleportTimer <= 0) {
      this.doTeleport();
      this.teleportTimer = 180 + Math.random() * 120;
    }
    
    if (this.changeDirectionTimer > 40 + Math.random() * 40) {
      this.changeDirectionTimer = 0;
      this.pickRandomDirection();
    }
    this.move();
  }

  doTeleport() {
    let attempts = 0;
    let newX, newY;
    do {
      newX = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_SIZE;
      newY = Math.floor(Math.random() * (ROWS - 2) + 1) * TILE_SIZE;
      attempts++;
    } while (this.isNearPlayer(newX, newY) || attempts < 50);
    
    this.x = newX;
    this.y = newY;
  }

  isNearPlayer(x, y) {
    const dist = Math.sqrt(Math.pow(x - game.player.x, 2) + Math.pow(y - game.player.y, 2));
    return dist < 3 * TILE_SIZE;
  }

  ghostBehavior() {
    this.changeDirectionTimer++;
    if (this.changeDirectionTimer > 50 + Math.random() * 50) {
      this.changeDirectionTimer = 0;
      this.pickRandomDirection();
    }
    this.moveGhost();
  }

  shooterBehavior() {
    this.changeDirectionTimer++;
    this.phaseTimer++;
    
    if (this.phaseTimer > 90) {
      this.shootAtPlayer();
      this.phaseTimer = 0;
    }
    
    if (this.changeDirectionTimer > 60 + Math.random() * 60) {
      this.changeDirectionTimer = 0;
      this.pickRandomDirection();
    }
    this.move();
  }

  shootAtPlayer() {
    const centerX = this.x + TILE_SIZE / 2;
    const centerY = this.y + TILE_SIZE / 2;
    const playerCenterX = game.player.x + TILE_SIZE / 2;
    const playerCenterY = game.player.y + TILE_SIZE / 2;
    
    const dx = playerCenterX - centerX;
    const dy = playerCenterY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      const dir = { x: dx / dist, y: dy / dist };
      game.enemyBullets.push(new EnemyBullet(centerX, centerY, dir));
    }
  }

  move() {
    const newX = this.x + this.direction.x * this.speed;
    const newY = this.y + this.direction.y * this.speed;

    if (this.collides(newX, newY)) {
      this.pickRandomDirection();
    } else {
      this.x = newX;
      this.y = newY;
    }
  }

  moveGhost() {
    const newX = this.x + this.direction.x * this.speed;
    const newY = this.y + this.direction.y * this.speed;

    if (this.collidesGhost(newX, newY)) {
      this.pickRandomDirection();
    } else {
      this.x = newX;
      this.y = newY;
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

  collidesGhost(x, y) {
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
        if (tile === TILE_WALL) {
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
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;
    
    switch(this.type) {
      case 'fast':
        ctx.fillStyle = '#f9ca24';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 10, y + 10, 10, 4);
        ctx.fillRect(x + 22, y + 10, 10, 4);
        break;
      case 'hunter':
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x + 14, y + 16, 4, 0, Math.PI * 2);
        ctx.arc(x + 28, y + 16, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'teleporter':
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 8, y + 12, 8, 8);
        ctx.fillRect(x + 24, y + 12, 8, 8);
        if (Math.floor(this.teleportTimer / 15) % 2 === 0) {
          ctx.strokeStyle = '#74b9ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, w + 4, h + 4);
        }
        break;
      case 'ghost':
        ctx.fillStyle = 'rgba(0, 206, 201, 0.6)';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + 16, y + 14, 5, 0, Math.PI * 2);
        ctx.arc(x + 28, y + 14, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'shooter':
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 10);
        ctx.lineTo(x + 30, y + 16);
        ctx.lineTo(x + 12, y + 22);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = '#e94560';
        ctx.fillRect(x + 4, y + 4, w, h);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 10, y + 12, 8, 8);
        ctx.fillRect(x + 24, y + 12, 8, 8);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 12, y + 14, 4, 4);
        ctx.fillRect(x + 26, y + 14, 4, 4);
    }
  }
}

class EnemyBullet {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = 5;
    this.radius = 5;
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
      if (tile === TILE_WALL || tile === TILE_BRICK) {
        this.active = false;
      }
    }

    const playerCenterX = game.player.x + TILE_SIZE / 2;
    const playerCenterY = game.player.y + TILE_SIZE / 2;
    const dist = Math.sqrt(Math.pow(this.x - playerCenterX, 2) + Math.pow(this.y - playerCenterY, 2));
    if (dist < 20) {
      endGame(false);
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6b6b';
    ctx.fill();
    ctx.closePath();
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

  const enemyTypes = ['basic'];
  if (game.level >= 2) enemyTypes.push('fast');
  if (game.level >= 3) enemyTypes.push('hunter');
  if (game.level >= 4) enemyTypes.push('teleporter');
  if (game.level >= 5) enemyTypes.push('ghost');
  if (game.level >= 6) enemyTypes.push('shooter');

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

    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    game.enemies.push(new Enemy(x, y, type));
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

function initGame(resetUpgrades = false) {
  generateMap();
  
  if (resetUpgrades || !game.player) {
    game.player = new Player(TILE_SIZE, TILE_SIZE);
  }
  
  game.bullets = [];
  game.enemyBullets = [];
  game.gameOver = false;
  game.victory = false;
  game.exitOpened = false;
  game.shopOpen = false;

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
  if (game.gameOver || game.shopOpen) return;

  game.player.update(keys);

  if (keys[' '] || keys['Spacebar']) {
    game.player.shoot();
  }

  game.bullets.forEach(bullet => bullet.update());
  game.bullets = game.bullets.filter(b => b.active);

  game.enemyBullets.forEach(bullet => bullet.update());
  game.enemyBullets = game.enemyBullets.filter(b => b.active);

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
  game.enemyBullets.forEach(bullet => bullet.draw());
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
  if ((e.key === 't' || e.key === 'T') && !game.gameOver) {
    toggleShop();
  }
  if (e.key === 'Escape' && game.shopOpen) {
    closeShop();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function toggleShop() {
  game.shopOpen = !game.shopOpen;
  const shop = document.getElementById('shop');
  if (game.shopOpen) {
    shop.classList.remove('hidden');
    updateShopUI();
  } else {
    shop.classList.add('hidden');
  }
}

function closeShop() {
  game.shopOpen = false;
  document.getElementById('shop').classList.add('hidden');
}

function updateShopUI() {
  document.getElementById('shopScore').textContent = game.score;
  const buttons = document.querySelectorAll('.buy-btn');
  buttons.forEach(btn => {
    const price = parseInt(btn.dataset.price);
    btn.disabled = game.score < price;
  });
}

function buyItem(item) {
  const prices = {
    speed: 200,
    doubleShot: 300,
    rifle: 400,
    shotgun: 600
  };
  
  const price = prices[item];
  if (game.score < price) return;
  
  if (item === 'speed') {
    if (game.player.speedLevel >= 3) return;
    game.player.speedLevel++;
    game.player.speed = game.player.baseSpeed + game.player.speedLevel * 1.5;
    game.score -= price;
  } else if (item === 'doubleShot') {
    if (game.player.doubleShot) return;
    game.player.doubleShot = true;
    game.score -= price;
  } else if (item === 'rifle') {
    if (game.player.weapon === 'rifle' || game.player.weapon === 'shotgun') return;
    game.player.weapon = 'rifle';
    game.score -= price;
  } else if (item === 'shotgun') {
    if (game.player.weapon === 'shotgun') return;
    game.player.weapon = 'shotgun';
    game.score -= price;
  }
  
  updateUI();
  updateShopUI();
}

document.querySelectorAll('.buy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    buyItem(btn.closest('.shop-item').dataset.item);
  });
});

document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('gameOver').classList.add('hidden');
  game.level = 1;
  game.score = 0;
  initGame(true);
});

initGame();
gameLoop();
