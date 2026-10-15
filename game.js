// ==========================================================================
// LAND CONQUEST : 6x6 전술 땅따먹기 대격돌 GAME LOGIC
// ==========================================================================

const BOARD_SIZE = 6;
const TOTAL_TILES = BOARD_SIZE * BOARD_SIZE;

class LandGame {
    constructor() {
        this.board = [];
        this.currentTurn = 'player'; // 'player' | 'pc'
        this.difficulty = 'normal';   // 'easy' | 'normal' | 'hard'
        this.firstTurn = 'player';
        this.isGameOver = false;
        this.isProcessing = false;
        this.playerCoins = 0;
        this.pcCoins = 0;
        this.confettiRunning = false;
        this.confettiParticles = [];

        this.initDOMElements();
        this.initEvents();
        this.setupConfetti();
    }

    initDOMElements() {
        // Screens
        this.screens = {
            intro: document.getElementById('screen-intro'),
            game: document.getElementById('screen-game'),
            result: document.getElementById('screen-result')
        };

        // Intro Controls
        this.btnStartGame = document.getElementById('btn-start-game');
        this.diffSelect = document.getElementById('ai-difficulty-select');
        this.turnOrderSelect = document.getElementById('turn-order-select');

        // Game HUD
        this.boardEl = document.getElementById('game-board');
        this.cardPlayer = document.getElementById('card-player');
        this.cardPc = document.getElementById('card-pc');
        this.playerScoreEl = document.getElementById('player-score');
        this.pcScoreEl = document.getElementById('pc-score');
        this.playerPercentEl = document.getElementById('player-percent');
        this.pcPercentEl = document.getElementById('pc-percent');
        this.barPlayer = document.getElementById('bar-player');
        this.barPc = document.getElementById('bar-pc');
        this.emptySlotsCountEl = document.getElementById('empty-slots-count');
        this.turnTextEl = document.getElementById('turn-text');
        this.eventLogEl = document.getElementById('event-log');
        this.btnSoundToggle = document.getElementById('btn-sound-toggle');
        this.soundIconEl = document.getElementById('sound-icon');
        this.btnGiveUp = document.getElementById('btn-give-up');

        // Custom Modal
        this.modalConfirm = document.getElementById('modal-confirm');
        this.btnModalCancel = document.getElementById('btn-modal-cancel');
        this.btnModalConfirm = document.getElementById('btn-modal-confirm');

        // Result Elements

        this.resultTitle = document.getElementById('result-title');
        this.resultSubtitle = document.getElementById('result-subtitle');
        this.resultBadgeIcon = document.getElementById('result-badge-icon');
        this.resPlayerScore = document.getElementById('result-player-score');
        this.resPlayerRate = document.getElementById('result-player-rate');
        this.resPlayerCoins = document.getElementById('result-player-coins');
        this.resPcScore = document.getElementById('result-pc-score');
        this.resPcRate = document.getElementById('result-pc-rate');
        this.resPcCoins = document.getElementById('result-pc-coins');
        this.finalStatsSummary = document.getElementById('final-stats-summary');
        this.btnReplay = document.getElementById('btn-replay');
        this.btnGoIntro = document.getElementById('btn-go-intro');
    }

    initEvents() {
        // Intro Settings
        this.diffSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.pill-btn');
            if (!btn) return;
            this.diffSelect.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.difficulty = btn.dataset.diff;
            window.soundManager.playClick();
        });

        this.turnOrderSelect.addEventListener('click', (e) => {
            const btn = e.target.closest('.pill-btn');
            if (!btn) return;
            this.turnOrderSelect.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.firstTurn = btn.dataset.first;
            window.soundManager.playClick();
        });

        // Start Game
        this.btnStartGame.addEventListener('click', () => {
            window.soundManager.playClick();
            window.soundManager.playGameStart();
            this.startNewGame();
        });

        // Toolbar
        this.btnSoundToggle.addEventListener('click', () => {
            const enabled = window.soundManager.toggleSound();
            this.soundIconEl.textContent = enabled ? '🔊' : '🔇';
            if (enabled) window.soundManager.playClick();
        });

        this.btnGiveUp.addEventListener('click', () => {
            window.soundManager.playClick();
            this.modalConfirm.classList.add('show');
        });

        this.btnModalCancel.addEventListener('click', () => {
            window.soundManager.playClick();
            this.modalConfirm.classList.remove('show');
        });

        this.btnModalConfirm.addEventListener('click', () => {
            window.soundManager.playClick();
            this.modalConfirm.classList.remove('show');
            this.endGame();
        });



        // Result Actions
        this.btnReplay.addEventListener('click', () => {
            window.soundManager.playClick();
            this.startNewGame();
        });

        this.btnGoIntro.addEventListener('click', () => {
            window.soundManager.playClick();
            this.stopConfetti();
            this.switchScreen('intro');
        });
    }

    switchScreen(screenName) {
        Object.keys(this.screens).forEach(name => {
            this.screens[name].classList.remove('active');
        });
        this.screens[screenName].classList.add('active');
    }

    // ==========================================================================
    // GAME INITIALIZATION
    // ==========================================================================
    startNewGame() {
        this.stopConfetti();
        this.isGameOver = false;
        this.isProcessing = false;
        this.playerCoins = 0;
        this.pcCoins = 0;
        this.currentTurn = this.firstTurn;

        // Initialize Board Data: 6x6
        this.board = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            const row = [];
            for (let c = 0; c < BOARD_SIZE; c++) {
                row.push({
                    r,
                    c,
                    coin: null,   // null | 'player' | 'pc'
                    owner: null   // null | 'player' | 'pc'
                });
            }
            this.board.push(row);
        }

        this.renderBoard();
        this.updateHUD();
        this.switchScreen('game');

        this.logEvent('GAME START', `${this.currentTurn === 'player' ? '플레이어(레드)' : '컴퓨터(블루)'} 선공으로 전투가 시작되었습니다!`);

        // If PC goes first
        if (this.currentTurn === 'pc') {
            this.triggerPCTurn();
        }
    }

    // Render 6x6 Board DOM
    renderBoard() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.id = `cell-${r}-${c}`;
                cell.dataset.r = r;
                cell.dataset.c = c;

                // Click event
                cell.addEventListener('click', () => this.handleCellClick(r, c));

                // Hover preview events
                cell.addEventListener('mouseenter', () => this.handleCellHover(r, c));
                cell.addEventListener('mouseleave', () => this.clearPreview());

                this.boardEl.appendChild(cell);
            }
        }
    }

    // ==========================================================================
    // HOVER PREVIEW (Adjacent cross highlight)
    // ==========================================================================
    handleCellHover(r, c) {
        if (this.isGameOver || this.isProcessing || this.currentTurn !== 'player') return;
        const cellData = this.board[r][c];
        if (cellData.coin !== null) return; // Cannot place on already occupied cell

        this.clearPreview();

        // Highlight center origin
        const centerEl = document.getElementById(`cell-${r}-${c}`);
        if (centerEl) centerEl.classList.add('preview-origin');

        // Highlight cross neighbors (up, down, left, right)
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        directions.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidCoord(nr, nc)) {
                const neighborEl = document.getElementById(`cell-${nr}-${nc}`);
                if (neighborEl) neighborEl.classList.add('preview-target');
            }
        });
    }

    clearPreview() {
        document.querySelectorAll('.cell.preview-origin').forEach(el => el.classList.remove('preview-origin'));
        document.querySelectorAll('.cell.preview-target').forEach(el => el.classList.remove('preview-target'));
    }

    isValidCoord(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    // ==========================================================================
    // PLAYER MOVE
    // ==========================================================================
    handleCellClick(r, c) {
        if (this.isGameOver || this.isProcessing || this.currentTurn !== 'player') return;

        const cellData = this.board[r][c];
        if (cellData.coin !== null) {
            // Already occupied
            return;
        }

        this.clearPreview();
        this.executeMove(r, c, 'player');
    }

    // ==========================================================================
    // CORE MOVE EXECUTION & ADJACENT CAPTURE
    // ==========================================================================
    executeMove(r, c, playerType) {
        this.isProcessing = true;
        const isPlayer = playerType === 'player';

        // 1. Place Coin
        this.board[r][c].coin = playerType;
        if (isPlayer) this.playerCoins++;
        else this.pcCoins++;

        window.soundManager.playCoinDrop(isPlayer);

        // Update center cell in DOM
        const centerCellEl = document.getElementById(`cell-${r}-${c}`);
        centerCellEl.classList.add('has-coin');
        
        const coinEl = document.createElement('div');
        coinEl.className = `coin ${isPlayer ? 'coin-player' : 'coin-pc'}`;
        centerCellEl.appendChild(coinEl);

        // 2. Identify captured cells (center + cross neighbors)
        const capturedTargets = [{ r, c }];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        directions.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidCoord(nr, nc)) {
                capturedTargets.push({ r: nr, c: nc });
            }
        });

        // 3. Apply territory changes with wave effect
        let newCapturesCount = 0;
        let stealsCount = 0;

        capturedTargets.forEach((target, index) => {
            const cell = this.board[target.r][target.c];
            if (cell.owner !== playerType) {
                if (cell.owner !== null) stealsCount++;
                else newCapturesCount++;
            }
            cell.owner = playerType;

            // Delayed visual wave
            setTimeout(() => {
                const el = document.getElementById(`cell-${target.r}-${target.c}`);
                if (el) {
                    el.classList.remove('land-player', 'land-pc');
                    el.classList.add(isPlayer ? 'land-player' : 'land-pc');
                    el.classList.add('capture-wave');
                    setTimeout(() => el.classList.remove('capture-wave'), 500);
                }
                if (index > 0) {
                    window.soundManager.playCapture(0, isPlayer);
                }
            }, index * 45);
        });

        // Event log
        const coordsStr = `(${r + 1}, ${c + 1})`;
        const sideName = isPlayer ? '당신(레드)' : '컴퓨터(블루)';
        let logMsg = `${sideName}이 ${coordsStr}에 코인을 배치! 총 ${capturedTargets.length}칸을 점령했습니다.`;
        if (stealsCount > 0) {
            logMsg += ` (상대 땅 ${stealsCount}칸 탈환!)`;
        }
        this.logEvent(isPlayer ? 'PLAYER MOVE' : 'PC MOVE', logMsg);

        // Allow animations to finish before updating turn
        const totalDelay = capturedTargets.length * 45 + 180;
        setTimeout(() => {
            this.updateHUD();

            // Check Game Over
            if (this.checkGameOver()) {
                this.endGame();
                return;
            }

            // Switch Turn
            this.currentTurn = isPlayer ? 'pc' : 'player';
            this.updateHUD();
            this.isProcessing = false;

            if (this.currentTurn === 'pc') {
                this.triggerPCTurn();
            }
        }, totalDelay);
    }

    // ==========================================================================
    // AI LOGIC
    // ==========================================================================
    triggerPCTurn() {
        this.turnTextEl.textContent = 'PC가 최적의 수를 분석하고 있습니다...';
        
        // Human-like thinking delay
        const thinkDelay = this.difficulty === 'easy' ? 450 : 700;

        setTimeout(() => {
            if (this.isGameOver) return;
            const bestMove = this.calculateBestAIMove();
            if (bestMove) {
                this.executeMove(bestMove.r, bestMove.c, 'pc');
            }
        }, thinkDelay);
    }

    calculateBestAIMove() {
        const availableSlots = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c].coin === null) {
                    availableSlots.push({ r, c });
                }
            }
        }

        if (availableSlots.length === 0) return null;

        // Easy Mode: Random pick 60% of the time, otherwise greedily pick
        if (this.difficulty === 'easy') {
            if (Math.random() < 0.6) {
                return availableSlots[Math.floor(Math.random() * availableSlots.length)];
            }
        }

        // Evaluate all candidate moves
        let bestScore = -Infinity;
        let candidateMoves = [];

        for (const slot of availableSlots) {
            const score = this.evaluateSlot(slot.r, slot.c);
            if (score > bestScore) {
                bestScore = score;
                candidateMoves = [slot];
            } else if (score === bestScore) {
                candidateMoves.push(slot);
            }
        }

        // Return random choice among best tied moves
        return candidateMoves[Math.floor(Math.random() * candidateMoves.length)];
    }

    evaluateSlot(r, c) {
        let score = 0;
        const directions = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

        let neutralConverted = 0;
        let playerSteals = 0;
        let selfMaintained = 0;

        directions.forEach(([dr, dc]) => {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidCoord(nr, nc)) {
                const owner = this.board[nr][nc].owner;
                if (owner === 'player') {
                    playerSteals++; // Stealing player's land is high value!
                } else if (owner === null) {
                    neutralConverted++; // Claiming neutral
                } else {
                    selfMaintained++;
                }
            }
        });

        // Basic gain calculation
        score += neutralConverted * 10;
        score += playerSteals * 22; // Stealing is double value swing!
        score += selfMaintained * 2;

        // Positional heuristics
        // Corners: 3 targets total (center + 2 neighbors)
        // Edges: 4 targets total (center + 3 neighbors)
        // Center: 5 targets total (center + 4 neighbors)
        const isCorner = (r === 0 || r === BOARD_SIZE - 1) && (c === 0 || c === BOARD_SIZE - 1);
        const isEdge = (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1);

        if (!isEdge) {
            score += 5; // Center positions have higher cross capture capacity
        }

        // Hard Mode: Add lookahead / counter-strike defensive awareness
        if (this.difficulty === 'hard') {
            // Check if placing here blocks player's high value placement
            let playerPotentialThreat = 0;
            directions.forEach(([dr, dc]) => {
                const nr = r + dr;
                const nc = c + dc;
                if (this.isValidCoord(nr, nc) && this.board[nr][nc].coin === null) {
                    playerPotentialThreat += 2;
                }
            });
            score += playerPotentialThreat;
        }

        return score;
    }

    // ==========================================================================
    // GAME OVER & SCORING
    // ==========================================================================
    checkGameOver() {
        // Game ends when all 36 cells have coins placed
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c].coin === null) {
                    return false;
                }
            }
        }
        return true;
    }

    calculateScores() {
        let playerLand = 0;
        let pcLand = 0;
        let neutralLand = 0;

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c].owner === 'player') playerLand++;
                else if (this.board[r][c].owner === 'pc') pcLand++;
                else neutralLand++;
            }
        }

        return { playerLand, pcLand, neutralLand };
    }

    updateHUD() {
        const { playerLand, pcLand } = this.calculateScores();
        const emptySlots = TOTAL_TILES - (this.playerCoins + this.pcCoins);

        // Update scores
        this.playerScoreEl.textContent = playerLand;
        this.pcScoreEl.textContent = pcLand;
        this.emptySlotsCountEl.textContent = `남은 빈칸: ${emptySlots}/${TOTAL_TILES}`;

        // Percentages
        const totalOccupied = Math.max(1, playerLand + pcLand);
        const playerRate = ((playerLand / TOTAL_TILES) * 100).toFixed(1);
        const pcRate = ((pcLand / TOTAL_TILES) * 100).toFixed(1);

        this.playerPercentEl.textContent = `${playerRate}%`;
        this.pcPercentEl.textContent = `${pcRate}%`;

        // Territory Bar
        this.barPlayer.style.width = `${(playerLand / TOTAL_TILES) * 100}%`;
        this.barPc.style.width = `${(pcLand / TOTAL_TILES) * 100}%`;

        // Turn Indication
        if (this.currentTurn === 'player') {
            this.cardPlayer.classList.add('active-turn');
            this.cardPc.classList.remove('active-turn');
            this.turnTextEl.textContent = '당신의 턴입니다! 빈 칸을 선택하세요.';
        } else {
            this.cardPlayer.classList.remove('active-turn');
            this.cardPc.classList.add('active-turn');
            this.turnTextEl.textContent = '컴퓨터의 턴입니다...';
        }
    }

    logEvent(tag, text) {
        this.eventLogEl.innerHTML = `<span class="log-tag">${tag}</span> ${text}`;
    }

    endGame() {
        this.isGameOver = true;
        const { playerLand, pcLand } = this.calculateScores();

        // Update Result Screen
        this.resPlayerScore.textContent = playerLand;
        this.resPlayerRate.textContent = `${((playerLand / TOTAL_TILES) * 100).toFixed(1)}% 영토 점유`;
        this.resPlayerCoins.textContent = `배치한 코인: ${this.playerCoins}개`;

        this.resPcScore.textContent = pcLand;
        this.resPcRate.textContent = `${((pcLand / TOTAL_TILES) * 100).toFixed(1)}% 영토 점유`;
        this.resPcCoins.textContent = `배치한 코인: ${this.pcCoins}개`;

        this.resultTitle.className = 'result-title';

        if (playerLand > pcLand) {
            // Player Won
            this.resultTitle.classList.add('win');
            this.resultTitle.textContent = 'VICTORY!';
            this.resultSubtitle.textContent = `축하합니다! 총 ${playerLand}칸을 지배하며 승리하셨습니다.`;
            this.resultBadgeIcon.textContent = '🏆';
            this.finalStatsSummary.innerHTML = `총 36칸 중 <strong>${playerLand}칸</strong> 차지 (${playerLand - pcLand}칸 차이로 압승!)`;
            window.soundManager.playVictory();
            this.startConfetti();
        } else if (pcLand > playerLand) {
            // PC Won
            this.resultTitle.classList.add('lose');
            this.resultTitle.textContent = 'DEFEAT';
            this.resultSubtitle.textContent = `아쉽습니다! PC가 ${pcLand}칸을 지배하며 승리를 가져갔습니다.`;
            this.resultBadgeIcon.textContent = '💀';
            this.finalStatsSummary.innerHTML = `총 36칸 중 <strong>${playerLand}칸</strong> 차지 (${pcLand - playerLand}칸 차이로 패배)`;
            window.soundManager.playDefeat();
        } else {
            // Draw
            this.resultTitle.classList.add('draw');
            this.resultTitle.textContent = 'DRAW!';
            this.resultSubtitle.textContent = '치열한 접전 끝에 영토가 동률로 비겼습니다!';
            this.resultBadgeIcon.textContent = '⚔️';
            this.finalStatsSummary.innerHTML = `양측 모두 <strong>${playerLand}칸</strong> 동률 달성!`;
            window.soundManager.playVictory();
        }

        setTimeout(() => {
            this.switchScreen('result');
        }, 800);
    }

    // ==========================================================================
    // CONFETTI PARTICLES SYSTEM
    // ==========================================================================
    setupConfetti() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    startConfetti() {
        this.confettiRunning = true;
        this.confettiParticles = [];
        const colors = ['#ff2a5f', '#ff6b3d', '#ffd700', '#00d2ff', '#ffffff'];

        for (let i = 0; i < 120; i++) {
            this.confettiParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * -this.canvas.height,
                w: Math.random() * 10 + 6,
                h: Math.random() * 6 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2.5,
                angle: Math.random() * 360,
                vAngle: (Math.random() - 0.5) * 6
            });
        }

        const render = () => {
            if (!this.confettiRunning) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.confettiParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.angle += p.vAngle;

                if (p.y > this.canvas.height) {
                    p.y = -10;
                    p.x = Math.random() * this.canvas.width;
                }

                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate((p.angle * Math.PI) / 180);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                this.ctx.restore();
            });

            requestAnimationFrame(render);
        };

        render();
    }

    stopConfetti() {
        this.confettiRunning = false;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new LandGame();
});
