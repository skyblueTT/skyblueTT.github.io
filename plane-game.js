(() => {
  const canvas = document.querySelector('#plane-canvas');
  const ctx = canvas?.getContext('2d');
  const tab = document.querySelector('#plane-tab');
  const panel = document.querySelector('#plane-game-panel');
  const startButton = document.querySelector('#plane-start');
  const pauseButton = document.querySelector('#plane-pause');
  const restartButton = document.querySelector('#plane-restart');
  const scoreElement = document.querySelector('#plane-score');
  const highScoreElement = document.querySelector('#plane-high-score');
  const statusElement = document.querySelector('#plane-status');
  const wormTab = document.querySelector('#worm-tab');
  const wormPanel = document.querySelector('#worm-game-panel');

  if (!canvas || !ctx || !tab || !panel || !startButton || !pauseButton || !restartButton) return;

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const player = { x: WIDTH / 2 - 15, y: HEIGHT - 58, width: 30, height: 34, speed: 6 };
  const keys = new Set();
  let enemies = [];
  let bullets = [];
  let enemyBullets = [];
  let score = 0;
  let bestScore = readBestScore();
  let passed = 0;
  let timer = null;
  let running = false;
  let paused = false;
  let over = false;
  let lastEnemyAt = 0;
  let enemyId = 0;

  highScoreElement.textContent = String(bestScore);
  updateUnlock(readWormBest());

  function readWormBest() {
    try { return Number(localStorage.getItem('ccctt-worm-high-score')) || 0; } catch { return 0; }
  }

  function readBestScore() {
    try { return Number(localStorage.getItem('ccctt-plane-high-score')) || 0; } catch { return 0; }
  }

  function saveBestScore() {
    if (score <= bestScore) return;
    bestScore = score;
    highScoreElement.textContent = String(bestScore);
    try { localStorage.setItem('ccctt-plane-high-score', String(bestScore)); } catch { /* storage is optional */ }
  }

  function updateUnlock(wormBest) {
    const unlocked = Number(wormBest) >= 200;
    tab.disabled = !unlocked;
    [startButton, pauseButton, restartButton, ...document.querySelectorAll('[data-plane-direction], [data-plane-fire]')].forEach((button) => { button.disabled = !unlocked; });
    statusElement.textContent = unlocked ? 'Plane Run unlocked. Press Start.' : 'Reach Best Score 200 in Worm Run to unlock.';
  }

  function resetGame() {
    stopTimer();
    player.x = WIDTH / 2 - player.width / 2;
    player.y = HEIGHT - 58;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    score = 0;
    passed = 0;
    running = false;
    paused = false;
    over = false;
    scoreElement.textContent = '0';
    pauseButton.textContent = 'Pause';
    pauseButton.disabled = true;
    statusElement.textContent = tab.disabled ? 'Reach Best Score 200 in Worm Run to unlock.' : 'Plane Run unlocked. Press Start.';
    draw();
  }

  function startGame() {
    if (over) resetGame();
    if (running) return;
    running = true;
    paused = false;
    pauseButton.disabled = false;
    statusElement.textContent = 'Flying — arrows/WASD move, Space fires.';
    startTimer();
  }

  function togglePause() {
    if (!running || over) return;
    paused = !paused;
    if (paused) { stopTimer(); pauseButton.textContent = 'Resume'; statusElement.textContent = 'Paused.'; }
    else { pauseButton.textContent = 'Pause'; statusElement.textContent = 'Flying.'; startTimer(); }
  }

  function restartGame() { resetGame(); startGame(); }
  function startTimer() { stopTimer(); timer = window.setInterval(tick, 40); }
  function stopTimer() { if (timer !== null) window.clearInterval(timer); timer = null; }

  function tick() {
    movePlayer();
    const now = Date.now();
    if (now - lastEnemyAt > 700) { spawnEnemy(); lastEnemyAt = now; }
    updateBullets();
    updateEnemies();
    updateEnemyBullets();
    checkCollisions();
    draw();
  }

  function movePlayer() {
    if (keys.has('ArrowLeft') || keys.has('a')) player.x -= player.speed;
    if (keys.has('ArrowRight') || keys.has('d')) player.x += player.speed;
    if (keys.has('ArrowUp') || keys.has('w')) player.y -= player.speed;
    if (keys.has('ArrowDown') || keys.has('s')) player.y += player.speed;
    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y));
  }

  function spawnEnemy() {
    enemies.push({ id: enemyId++, x: Math.random() * (WIDTH - 28), y: -30, width: 28, height: 24, speed: 1.5 + Math.random() * 2, drift: (Math.random() - .5) * 2, shoots: Math.random() > .45, shotAt: Date.now() });
  }

  function updateBullets() { bullets = bullets.filter((bullet) => { bullet.y -= 8; return bullet.y > -12; }); }

  function updateEnemies() {
    enemies = enemies.filter((enemy) => {
      enemy.y += enemy.speed;
      enemy.x += enemy.drift;
      if (enemy.x <= 0 || enemy.x >= WIDTH - enemy.width) enemy.drift *= -1;
      if (enemy.shoots && Date.now() - enemy.shotAt > 1100) { enemyBullets.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height, speed: 4 }); enemy.shotAt = Date.now(); }
      if (enemy.y > HEIGHT) { passed += 1; if (passed % 10 === 0) { score += 10; scoreElement.textContent = String(score); saveBestScore(); } return false; }
      return true;
    });
  }

  function updateEnemyBullets() { enemyBullets = enemyBullets.filter((bullet) => { bullet.y += bullet.speed; return bullet.y < HEIGHT + 12; }); }
  function fire() { if (!running || paused || over) return; bullets.push({ x: player.x + player.width / 2, y: player.y - 6 }); }

  function checkCollisions() {
    if (enemies.some((enemy) => overlaps(player, enemy)) || enemyBullets.some((bullet) => overlaps(player, { x: bullet.x - 3, y: bullet.y - 6, width: 6, height: 12 }))) { endGame(); return; }
    bullets = bullets.filter((bullet) => {
      const hit = enemies.find((enemy) => overlaps({ x: bullet.x - 2, y: bullet.y - 8, width: 4, height: 10 }, enemy));
      if (!hit) return true;
      enemies = enemies.filter((enemy) => enemy.id !== hit.id);
      score += 10;
      scoreElement.textContent = String(score);
      saveBestScore();
      return false;
    });
  }

  function endGame() { stopTimer(); running = false; over = true; pauseButton.disabled = true; statusElement.textContent = `Game over — score ${score}. Press Restart.`; draw(); }
  function overlaps(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }

  function draw() {
    ctx.fillStyle = '#08111f'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#bb9af7'; ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.fillStyle = '#7aa2f7'; bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 10));
    ctx.fillStyle = '#f7768e'; enemies.forEach((enemy) => ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height));
    ctx.fillStyle = '#e0af68'; enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x - 3, bullet.y - 6, 6, 12));
  }

  function selectPlane() { if (tab.disabled) return; wormPanel.hidden = true; panel.hidden = false; wormTab.setAttribute('aria-selected', 'false'); tab.setAttribute('aria-selected', 'true'); }
  function selectWorm() { wormPanel.hidden = false; panel.hidden = true; wormTab.setAttribute('aria-selected', 'true'); tab.setAttribute('aria-selected', 'false'); }

  window.addEventListener('worm-score-change', (event) => updateUnlock(event.detail.bestScore));
  document.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(key)) event.preventDefault();
    if (key === ' ') fire(); else keys.add(key);
  });
  document.addEventListener('keyup', (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
  document.querySelectorAll('[data-plane-direction]').forEach((button) => { button.addEventListener('pointerdown', () => { keys.add(button.dataset.planeDirection); }); button.addEventListener('pointerup', () => keys.delete(button.dataset.planeDirection)); });
  document.querySelector('[data-plane-fire]')?.addEventListener('click', fire);
  tab.addEventListener('click', selectPlane); wormTab.addEventListener('click', selectWorm);
  startButton.addEventListener('click', startGame); pauseButton.addEventListener('click', togglePause); restartButton.addEventListener('click', restartGame);
  resetGame();
})();
