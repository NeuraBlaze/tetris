"use strict";

const { COLS, ROWS, SHAPES, createGrid, rotate, makePiece, collides, lock, resolveZones } = MosaicCore;
const STORAGE_KEY = "mozaikzapor-best-score-v1";
const CELL = 40;
const COLORS = ["#0aa982", "#ff9f43", "#4c78ff", "#e4528d", "#8667e8", "#e6ad16"];

const boardCanvas = document.getElementById("board");
const boardContext = boardCanvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextContext = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const levelEl = document.getElementById("level");
const comboEl = document.getElementById("combo");
const zonesEl = document.getElementById("zones");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const comboPop = document.getElementById("comboPop");

let grid = createGrid();
let current = null;
let next = makePiece();
let score = 0;
let zones = 0;
let level = 1;
let combo = 1;
let bestScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
let dropCounter = 0;
let lastTime = 0;
let running = false;
let paused = false;
let touchStart = null;
let animationId = 0;

bestScoreEl.textContent = bestScore;
draw();

function coloredPiece() {
  const piece = makePiece();
  piece.color = Math.floor(Math.random() * COLORS.length);
  return piece;
}

function startGame() {
  cancelAnimationFrame(animationId);
  grid = createGrid();
  current = coloredPiece();
  next = coloredPiece();
  score = 0;
  zones = 0;
  level = 1;
  combo = 1;
  dropCounter = 0;
  lastTime = 0;
  running = true;
  paused = false;
  pauseButton.textContent = "Ⅱ";
  hideOverlay();
  updateStats();
  animationId = requestAnimationFrame(update);
}

function update(time = 0) {
  if (!running) return;
  const delta = lastTime ? time - lastTime : 0;
  lastTime = time;
  if (!paused) {
    dropCounter += delta;
    if (dropCounter >= Math.max(170, 850 - (level - 1) * 65)) softDrop();
  }
  draw();
  animationId = requestAnimationFrame(update);
}

function softDrop() {
  if (!running || paused || !current) return;
  if (!collides(grid, current, 0, 1)) current.y += 1;
  else lockCurrent();
  dropCounter = 0;
}

function hardDrop() {
  if (!running || paused || !current) return;
  let distance = 0;
  while (!collides(grid, current, 0, 1)) { current.y += 1; distance += 1; }
  score += distance;
  lockCurrent();
}

function lockCurrent() {
  const lost = lock(grid, current, current.color);
  if (lost) { gameOver(); return; }

  const result = resolveZones(grid);
  if (result.totalZones) {
    zones += result.totalZones;
    combo = Math.max(1, result.chain);
    score += result.points + 25 * level;
    showCombo(result);
  } else {
    combo = 1;
    score += 10;
  }

  level = Math.floor(zones / 4) + 1;
  current = next;
  current.x = Math.floor((COLS - current.shape[0].length) / 2);
  current.y = -1;
  next = coloredPiece();
  updateStats();

  if (collides(grid, current, 0, 0) && collides(grid, current, 0, 1)) gameOver();
}

function move(direction) {
  if (!running || paused || !current) return;
  if (!collides(grid, current, direction, 0)) current.x += direction;
  draw();
}

function rotatePiece() {
  if (!running || paused || !current) return;
  const turned = rotate(current.shape);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!collides(grid, current, kick, 0, turned)) {
      current.x += kick;
      current.shape = turned;
      draw();
      return;
    }
  }
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseButton.textContent = paused ? "▶" : "Ⅱ";
  if (paused) showOverlay("Szünet", "A mozaikok megvárnak.", "Folytatás");
  else { hideOverlay(); lastTime = performance.now(); }
}

function gameOver() {
  running = false;
  cancelAnimationFrame(animationId);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  }
  updateStats();
  showOverlay("Vége", `${score} pont · ${zones} kész zóna`, "Újra");
}

function updateStats() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  levelEl.textContent = level;
  comboEl.textContent = `×${combo}`;
  zonesEl.textContent = zones;
}

function showCombo(result) {
  comboPop.textContent = result.chain > 1 ? `${result.chain}× LÁNC! +${result.points}` : `ZÓNA! +${result.points}`;
  comboPop.classList.remove("hidden");
  comboPop.style.animation = "none";
  void comboPop.offsetWidth;
  comboPop.style.animation = "";
  setTimeout(() => comboPop.classList.add("hidden"), 720);
}

function draw() {
  boardContext.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  drawBackground();
  grid.forEach((row, y) => row.forEach((color, x) => {
    if (color !== null) drawTile(boardContext, x, y, CELL, COLORS[color]);
  }));
  if (current) drawPiece(current, boardContext, CELL);
  drawNext();
}

function drawBackground() {
  boardContext.fillStyle = "#f5fbf8";
  boardContext.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const zoneTone = (Math.floor(x / 3) + Math.floor(y / 3)) % 2;
      boardContext.fillStyle = zoneTone ? "#edf7f3" : "#f8fcfa";
      boardContext.fillRect(x * CELL, y * CELL, CELL, CELL);
      boardContext.strokeStyle = "#d7e4df";
      boardContext.lineWidth = 1;
      boardContext.strokeRect(x * CELL + .5, y * CELL + .5, CELL - 1, CELL - 1);
    }
  }
  boardContext.strokeStyle = "#72b9a8";
  boardContext.lineWidth = 3;
  for (let x = 3; x < COLS; x += 3) {
    boardContext.beginPath(); boardContext.moveTo(x * CELL, 0); boardContext.lineTo(x * CELL, ROWS * CELL); boardContext.stroke();
  }
  for (let y = 3; y < ROWS; y += 3) {
    boardContext.beginPath(); boardContext.moveTo(0, y * CELL); boardContext.lineTo(COLS * CELL, y * CELL); boardContext.stroke();
  }
}

function drawPiece(piece, context, size, offsetX = 0, offsetY = 0) {
  piece.shape.forEach((row, y) => row.forEach((cell, x) => {
    const boardY = piece.y + y + offsetY;
    if (cell && boardY >= 0) drawTile(context, piece.x + x + offsetX, boardY, size, COLORS[piece.color ?? 0]);
  }));
}

function drawTile(context, x, y, size, color) {
  const gap = Math.max(2, size * .07);
  const radius = Math.max(3, size * .15);
  const px = x * size + gap;
  const py = y * size + gap;
  const side = size - gap * 2;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(px, py, side, side, radius);
  context.fill();
  context.fillStyle = "rgba(255,255,255,.25)";
  context.beginPath();
  context.roundRect(px + side * .14, py + side * .12, side * .5, side * .12, radius);
  context.fill();
}

function drawNext() {
  nextContext.clearRect(0, 0, 108, 108);
  nextContext.fillStyle = "#f5fbf8";
  nextContext.fillRect(0, 0, 108, 108);
  if (!next) return;
  const size = 24;
  const width = next.shape[0].length;
  const height = next.shape.length;
  const preview = { ...next, x: (108 / size - width) / 2, y: (108 / size - height) / 2 };
  drawPiece(preview, nextContext, size);
}

function showOverlay(title, text, buttonText = "Indítás") {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() { overlay.classList.add("hidden"); }

document.getElementById("leftButton").addEventListener("click", () => move(-1));
document.getElementById("rightButton").addEventListener("click", () => move(1));
document.getElementById("rotateButton").addEventListener("click", rotatePiece);
document.getElementById("dropButton").addEventListener("click", hardDrop);
document.getElementById("restartButton").addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
startButton.addEventListener("click", () => paused ? togglePause() : startGame());

window.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "p", "P"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.key === "ArrowUp") rotatePiece();
  if (event.key === "ArrowDown") softDrop();
  if (event.key === " ") hardDrop();
  if (event.key.toLowerCase() === "p") togglePause();
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
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) rotatePiece();
  else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy > 0) hardDrop();
  touchStart = null;
}, { passive: true });
