let grid = [];
const gridSize = 8;
const cellSize = 50;
let selectedUnit = null;
let playerTurn = true;
let score = 0;
let highlightedCells = [];
let particles = [];
let enemyMoveIndex = 0;
let lastEnemyMoveTime = 0;

const units = {
  player: [
    { type: '🦸', x: 0, y: 3, range: 3, attack: 2, health: 10 }, // Hero
    { type: '⚔️', x: 1, y: 2, range: 1, attack: 3, health: 8 },  // Fighter
    { type: '🏹', x: 1, y: 4, range: 4, attack: 2, health: 6 },  // Archer
    { type: '🧙', x: 2, y: 3, range: 2, attack: 4, health: 5 }   // Mage
  ],
  enemy: [
    { type: '👺', x: 7, y: 3, range: 2, attack: 2, health: 8 },
    { type: '🐺', x: 6, y: 2, range: 1, attack: 3, health: 6 },
    { type: '🧛', x: 6, y: 4, range: 3, attack: 2, health: 7 }
  ]
};

const obstacles = [
  { type: '🌳', x: 3, y: 1 },
  { type: '🌳', x: 3, y: 5 },
  { type: '🪨', x: 4, y: 3 }
];

function setup() {
  createCanvas(gridSize * cellSize, gridSize * cellSize + 50);
  initializeGrid();
  textAlign(CENTER, CENTER);
  textSize(20);
}

function draw() {
  background(220);
  drawGrid();
  drawHighlightedCells();
  drawUnits();
  drawObstacles();
  drawScore();
  updateAndDrawParticles();
  
  if (!playerTurn && millis() - lastEnemyMoveTime > 10000) {
    enemyTurn();
  }
}

function initializeGrid() {
  for (let i = 0; i < gridSize; i++) {
    grid[i] = [];
    for (let j = 0; j < gridSize; j++) {
      grid[i][j] = '';
    }
  }
}

function drawGrid() {
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      fill(255);
      stroke(0);
      rect(i * cellSize, j * cellSize, cellSize, cellSize);
    }
  }
}

function drawHighlightedCells() {
  fill(144, 238, 144, 150); // Light green with some transparency
  noStroke();
  for (let cell of highlightedCells) {
    rect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
  }
}

function drawUnits() {
  for (let unit of units.player.concat(units.enemy)) {
    text(unit.type, unit.x * cellSize + cellSize / 2, unit.y * cellSize + cellSize / 2);
  }
}

function drawObstacles() {
  for (let obstacle of obstacles) {
    text(obstacle.type, obstacle.x * cellSize + cellSize / 2, obstacle.y * cellSize + cellSize / 2);
  }
}

function drawScore() {
  fill(0);
  text(`Score: ${score}`, width / 2, height - 25);
}

function mousePressed() {
  if (!playerTurn) return;

  let x = floor(mouseX / cellSize);
  let y = floor(mouseY / cellSize);

  if (selectedUnit) {
    if (isEnemyAt(x, y)) {
      attackEnemy(x, y);
    } else {
      moveUnit(x, y);
    }
  } else {
    selectUnit(x, y);
  }
}

function selectUnit(x, y) {
  selectedUnit = units.player.find(unit => unit.x === x && unit.y === y);
  if (selectedUnit) {
    highlightMoveRange();
  }
}

function moveUnit(x, y) {
  if (isValidMove(x, y)) {
    selectedUnit.x = x;
    selectedUnit.y = y;
    selectedUnit = null;
    clearHighlightedCells();
    checkEndPlayerTurn();
    redraw();
  }
}

function attackEnemy(x, y) {
  let enemy = units.enemy.find(unit => unit.x === x && unit.y === y);
  if (enemy && isInRange(selectedUnit, enemy)) {
    enemy.health -= selectedUnit.attack;
    score += selectedUnit.attack;
    if (enemy.health <= 0) {
      units.enemy = units.enemy.filter(unit => unit !== enemy);
      score += 10;
      createExplosion(x, y);
    }
    selectedUnit = null;
    clearHighlightedCells();
    checkEndPlayerTurn();
    redraw();
  }
}

function isValidMove(x, y) {
  let dx = Math.abs(x - selectedUnit.x);
  let dy = Math.abs(y - selectedUnit.y);
  return dx + dy <= selectedUnit.range && !isOccupied(x, y);
}

function isInRange(attacker, target) {
  let dx = Math.abs(target.x - attacker.x);
  let dy = Math.abs(target.y - attacker.y);
  return dx + dy <= attacker.range;
}

function isOccupied(x, y) {
  return units.player.concat(units.enemy).some(unit => unit.x === x && unit.y === y) ||
         obstacles.some(obstacle => obstacle.x === x && obstacle.y === y);
}

function isEnemyAt(x, y) {
  return units.enemy.some(unit => unit.x === x && unit.y === y);
}

function highlightMoveRange() {
  clearHighlightedCells();
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (isValidMove(i, j)) {
        highlightedCells.push({x: i, y: j});
      }
    }
  }
}

function clearHighlightedCells() {
  highlightedCells = [];
}

function checkEndPlayerTurn() {
  if (units.player.every(unit => unit.moved)) {
    endPlayerTurn();
  }
}

function endPlayerTurn() {
  playerTurn = false;
  units.player.forEach(unit => unit.moved = false);
  enemyMoveIndex = 0;
  lastEnemyMoveTime = millis();
}

function enemyTurn() {
  if (enemyMoveIndex < units.enemy.length) {
    let enemy = units.enemy[enemyMoveIndex];
    let nearestPlayer = findNearestPlayer(enemy);
    if (nearestPlayer) {
      if (isInRange(enemy, nearestPlayer)) {
        // Attack
        nearestPlayer.health -= enemy.attack;
        if (nearestPlayer.health <= 0) {
          units.player = units.player.filter(unit => unit !== nearestPlayer);
        }
      } else {
        // Move towards player
        let dx = nearestPlayer.x - enemy.x;
        let dy = nearestPlayer.y - enemy.y;
        let moveX = dx !== 0 ? Math.sign(dx) : 0;
        let moveY = dy !== 0 ? Math.sign(dy) : 0;
        if (!isOccupied(enemy.x + moveX, enemy.y + moveY)) {
          enemy.x += moveX;
          enemy.y += moveY;
        }
      }
    }
    enemyMoveIndex++;
    lastEnemyMoveTime = millis();
  } else {
    playerTurn = true;
    enemyMoveIndex = 0;
  }
  redraw();
}

function findNearestPlayer(enemy) {
  return units.player.reduce((nearest, player) => {
    let distance = Math.abs(player.x - enemy.x) + Math.abs(player.y - enemy.y);
    if (!nearest || distance < nearest.distance) {
      return { unit: player, distance: distance };
    }
    return nearest;
  }, null)?.unit;
}

function createExplosion(x, y) {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: x * cellSize + cellSize / 2,
      y: y * cellSize + cellSize / 2,
      vx: random(-2, 2),
      vy: random(-2, 2),
      lifetime: 60
    });
  }
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.lifetime--;
    
    if (p.lifetime <= 0) {
      particles.splice(i, 1);
    } else {
      fill(255, 0, 0, p.lifetime * 4);
      noStroke();
      ellipse(p.x, p.y, 5, 5);
    }
  }
}

function touchStarted() {
  mousePressed();
  return false;
}