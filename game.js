(() => {
  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas?.getContext('2d');
  const difficultySelect = document.querySelector('#difficulty');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const statusElement = document.querySelector('#game-status');

  if (!canvas || !ctx || !difficultySelect || !startButton || !pauseButton || !restartButton) return;

  const CELL = 20;
  const COLUMNS = canvas.width / CELL;
  const ROWS = canvas.height / CELL;
  const DIFFICULTIES = {
    easy: { interval: 220, enemies: 2 },
    normal: { interval: 155, enemies: 3 },
    hard: { interval: 100, enemies: 5 },
  };
  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  let snake;
  let food;
  let enemies;
  let direction;
  let queuedDirection;
  let score;
  let timer = null;
  let running = false;
  let paused = false;
  let gameOver = false;
  let highScore = readHighScore();

  highScoreElement.textContent = String(highScore);
  notifyScoreChange();

  function readHighScore() {
    try { return Number(localStorage.getItem('ccctt-worm-high-score')) || 0; } catch { return 0; }
  }

  function saveHighScore() {
    if (score <= highScore) return;
    highScore = score;
    highScoreElement.textContent = String(highScore);
    try { localStorage.setItem('ccctt-worm-high-score', String(highScore)); } catch { /* storage is optional */ }
    notifyScoreChange();
  }

  function notifyScoreChange() {
    window.dispatchEvent(new CustomEvent('worm-score-change', { detail: { score, bestScore: highScore } }));
  }

  function resetGame() {
    stopTimer();
    const center = { x: Math.floor(COLUMNS / 2), y: Math.floor(ROWS / 2) };
    snake = [center, { x: center.x - 1, y: center.y }, { x: center.x - 2, y: center.y }];
    direction = 'right';
    queuedDirection = 'right';
    score = 0;
    running = false;
    paused = false;
    gameOver = false;
    scoreElement.textContent = '0';
    enemies = createEnemies(DIFFICULTIES[difficultySelect.value].enemies);
    food = createFood();
    pauseButton.disabled = true;
    pauseButton.textContent = 'Pause';
    statusElement.textContent = 'Press Start to begin.';
    draw();
  }

  function startGame() {
    if (gameOver) resetGame();
    if (running) return;
    running = true;
    paused = false;
    pauseButton.disabled = false;
    statusElement.textContent = 'Running — use arrow keys, WASD, or the touch buttons.';
    startTimer();
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    if (paused) {
      stopTimer();
      pauseButton.textContent = 'Resume';
      statusElement.textContent = 'Paused.';
    } else {
      pauseButton.textContent = 'Pause';
      statusElement.textContent = 'Running.';
      startTimer();
    }
  }

  function restartGame() {
    resetGame();
    startGame();
  }

  function startTimer() {
    stopTimer();
    timer = window.setInterval(tick, DIFFICULTIES[difficultySelect.value].interval);
  }

  function stopTimer() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function tick() {
    direction = queuedDirection;
    const head = snake[0];
    const next = { x: head.x + DIRECTIONS[direction].x, y: head.y + DIRECTIONS[direction].y };
    const ateFood = next.x === food.x && next.y === food.y;
    const bodyToCheck = ateFood ? snake : snake.slice(0, -1);

    if (hitsWall(next) || hitsSnake(next, bodyToCheck) || hitsEnemy(next)) {
      endGame();
      return;
    }

    snake.unshift(next);
    if (ateFood) {
      score += 10;
      scoreElement.textContent = String(score);
      saveHighScore();
      food = createFood();
    } else {
      snake.pop();
    }

    moveEnemies();
    if (hitsEnemy(snake[0])) {
      endGame();
      return;
    }
    draw();
  }

  function endGame() {
    stopTimer();
    running = false;
    gameOver = true;
    pauseButton.disabled = true;
    statusElement.textContent = `Game over — score ${score}. Press Restart to try again.`;
    draw();
  }

  function createEnemies(count) {
    const result = [];
    let attempts = 0;
    while (result.length < count && attempts < 500) {
      attempts += 1;
      const candidate = randomCell();
      if (!hitsSnake(candidate, snake) && !result.some((enemy) => sameCell(enemy, candidate))) result.push(candidate);
    }
    return result;
  }

  function moveEnemies() {
    enemies = enemies.map((enemy) => {
      const options = Object.values(DIRECTIONS).map((step) => ({ x: enemy.x + step.x, y: enemy.y + step.y }));
      const valid = options.filter((candidate) => !hitsWall(candidate));
      return valid[Math.floor(Math.random() * valid.length)] || enemy;
    });
  }

  function createFood() {
    let candidate;
    do { candidate = randomCell(); } while (hitsSnake(candidate, snake) || hitsEnemy(candidate));
    return candidate;
  }

  function randomCell() {
    return { x: Math.floor(Math.random() * COLUMNS), y: Math.floor(Math.random() * ROWS) };
  }

  function hitsWall(cell) { return cell.x < 0 || cell.x >= COLUMNS || cell.y < 0 || cell.y >= ROWS; }
  function hitsSnake(cell, parts) { return parts.some((part) => sameCell(part, cell)); }
  function hitsEnemy(cell) { return enemies.some((enemy) => sameCell(enemy, cell)); }
  function sameCell(a, b) { return a.x === b.x && a.y === b.y; }

  function setDirection(nextDirection) {
    if (!DIRECTIONS[nextDirection] || OPPOSITE[queuedDirection] === nextDirection) return;
    queuedDirection = nextDirection;
  }

  function draw() {
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCell(food, '#e0af68');
    enemies.forEach((enemy) => drawCell(enemy, '#f7768e'));
    snake.forEach((part, index) => drawCell(part, index === 0 ? '#bb9af7' : '#9ece6a'));
  }

  function drawCell(cell, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cell.x * CELL + 2, cell.y * CELL + 2, CELL - 4, CELL - 4);
  }

  document.addEventListener('keydown', (event) => {
    const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (keys[event.key]) { event.preventDefault(); setDirection(keys[event.key]); }
    if (event.key === ' ') { event.preventDefault(); togglePause(); }
  });

  document.querySelectorAll('[data-direction]').forEach((button) => {
    button.addEventListener('click', () => setDirection(button.dataset.direction));
  });
  startButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  difficultySelect.addEventListener('change', resetGame);
  resetGame();
})();
