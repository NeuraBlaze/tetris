"use strict";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const STORAGE_KEY = "classic-tetris-best-score";
const LAST_SCORE_KEY = "classic-tetris-last-score";

const COLORS = {
  I: "#19d3da",
  J: "#3478f6",
  L: "#ff9f1c",
  O: "#f1c40f",
  S: "#31d158",
  T: "#bf5af2",
  Z: "#ff453a"
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]]
};

const boardCanvas = document.getElementById("board");
const boardContext = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const levelEl = document.getElementById("level");
const linesEl = document.getElementById("lines");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const pauseButton = document.getElementById("pauseButton");

let grid = createGrid();
let current = null;
let next = randomPiece();
let score = 0;
let lines = 0;
let level = 1;
let bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
let dropCounter = 0;
let lastTime = 0;
let running = false;
let paused = false;
let touchStart = null;

bestScoreEl.textContent = bestScore;
draw();
showOverlay("Tetris", "Nyomj indítást.");

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  const shape = SHAPES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0
  };
}

function startGame() {
  grid = createGrid();
  current = randomPiece();
  next = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  dropCounter = 0;
  lastTime = 0;
  running = true;
  paused = false;
  pauseButton.textContent = "II";
  hideOverlay();
  updateStats();
  requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running) return;

  const delta = time - lastTime;
  lastTime = time;

  if (!paused) {
    dropCounter += delta;
    if (dropCounter > dropInterval()) {
      softDrop();
    }
  }

  draw();
  requestAnimationFrame(update);
}

function dropInterval() {
  return Math.max(110, 820 - (level - 1) * 70);
}

function softDrop() {
  if (!current) return;
  current.y += 1;

  if (collides(current)) {
    current.y -= 1;
    lockPiece();
  }

  dropCounter = 0;
}

function hardDrop() {
  if (!running || paused || !current) return;

  let cells = 0;
  while (!collides({ ...current, y: current.y + 1 })) {
    current.y += 1;
    cells += 1;
  }

  score += cells * 2;
  lockPiece();
  updateStats();
  draw();
}

function lockPiece() {
  current.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      const boardY = current.y + y;
      const boardX = current.x + x;
      if (boardY >= 0) grid[boardY][boardX] = current.type;
    });
  });

  clearLines();
  current = next;
  next = randomPiece();

  if (collides(current)) {
    gameOver();
  }
}

function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (grid[y].every(Boolean)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }

  if (!cleared) return;

  const points = [0, 100, 300, 500, 800][cleared] * level;
  score += points;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
  updateStats();
}

function move(dir) {
  if (!running || paused || !current) return;
  current.x += dir;
  if (collides(current)) current.x -= dir;
  draw();
}

function rotatePiece() {
  if (!running || paused || !current) return;

  const original = current.shape;
  const rotated = original[0].map((_, index) => original.map((row) => row[index]).reverse());
  current.shape = rotated;

  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    current.x += kick;
    if (!collides(current)) {
      draw();
      return;
    }
    current.x -= kick;
  }

  current.shape = original;
}

function collides(piece) {
  return piece.shape.some((row, y) => row.some((cell, x) => {
    if (!cell) return false;
    const boardX = piece.x + x;
    const boardY = piece.y + y;
    return boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && grid[boardY][boardX]);
  }));
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "▶" : "II";

  if (paused) {
    showOverlay("Szünet", "Folytatáshoz nyomj rá.");
    startButton.textContent = "Folytatás";
  } else {
    hideOverlay();
  }
}

function gameOver() {
  running = false;
  localStorage.setItem(LAST_SCORE_KEY, String(score));

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  }

  updateStats();
  showOverlay("Vége", `${score} pont. Rekord: ${bestScore}`);
  startButton.textContent = "Újra";
}

function updateStats() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  levelEl.textContent = level;
  linesEl.textContent = lines;
}

function draw() {
  boardContext.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  drawBoardBackground();
  drawGridCells(grid, boardContext, BLOCK);
  if (current) drawPiece(current, boardContext, BLOCK);
  drawNext();
}

function drawBoardBackground() {
  boardContext.fillStyle = "#f4fbf8";
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  boardContext.strokeStyle = "#cbd8d4";
  boardContext.lineWidth = 1;

  for (let x = 0; x <= COLS; x += 1) {
    boardContext.beginPath();
    boardContext.moveTo(x * BLOCK + 0.5, 0);
    boardContext.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
    boardContext.stroke();
  }

  for (let y = 0; y <= ROWS; y += 1) {
    boardContext.beginPath();
    boardContext.moveTo(0, y * BLOCK + 0.5);
    boardContext.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
    boardContext.stroke();
  }
}

function drawGridCells(sourceGrid, context, blockSize) {
  sourceGrid.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawBlock(context, x, y, blockSize, COLORS[type]);
    });
  });
}

function drawPiece(piece, context, blockSize, offsetX = 0, offsetY = 0) {
  piece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) {
        drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, blockSize, COLORS[piece.type]);
      }
    });
  });
}

function drawBlock(context, x, y, blockSize, color) {
  const px = x * blockSize;
  const py = y * blockSize;
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);
  context.fillStyle = "rgba(255, 255, 255, 0.22)";
  context.fillRect(px + 3, py + 3, blockSize - 6, 4);
  context.fillStyle = "rgba(0, 0, 0, 0.18)";
  context.fillRect(px + 3, py + blockSize - 7, blockSize - 6, 4);
}

function drawNext() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextContext.fillStyle = "#f4fbf8";
  nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  const blockSize = 20;
  const width = next.shape[0].length;
  const height = next.shape.length;
  const preview = {
    ...next,
    x: Math.floor((nextCanvas.width / blockSize - width) / 2),
    y: Math.floor((nextCanvas.height / blockSize - height) / 2)
  };

  drawPiece(preview, nextContext, blockSize);
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
  startButton.textContent = "Indítás";
}

function handleAction(action) {
  if (action === "left") move(-1);
  if (action === "right") move(1);
  if (action === "rotate") rotatePiece();
  if (action === "drop") hardDrop();
}

document.getElementById("leftButton").addEventListener("click", () => handleAction("left"));
document.getElementById("rightButton").addEventListener("click", () => handleAction("right"));
document.getElementById("rotateButton").addEventListener("click", () => handleAction("rotate"));
document.getElementById("dropButton").addEventListener("click", () => handleAction("drop"));
restartButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);

startButton.addEventListener("click", () => {
  if (running && paused) {
    togglePause();
    return;
  }
  startGame();
});

window.addEventListener("keydown", (event) => {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "p", "P"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();

  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.key === "ArrowUp") rotatePiece();
  if (event.key === "ArrowDown") softDrop();
  if (event.key === " ") hardDrop();
  if (event.key === "p" || event.key === "P") togglePause();
});

boardCanvas.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });

boardCanvas.addEventListener("touchend", (event) => {
  if (!touchStart) return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < 24) {
    rotatePiece();
  } else if (absX > absY) {
    move(dx > 0 ? 1 : -1);
  } else if (dy > 0) {
    hardDrop();
  }

  touchStart = null;
}, { passive: true });
