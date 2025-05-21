document.addEventListener('DOMContentLoaded', function() {
    // Элементы интерфейса
    const welcomeScreen = document.getElementById('welcome-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');
    const gameoverScreen = document.getElementById('gameover-screen');
    
    const playerNameInput = document.getElementById('player-name');
    const startBtn = document.getElementById('start-btn');
    const displayName = document.getElementById('display-name');
    const timeDisplay = document.getElementById('time');
    const powerDisplay = document.getElementById('power');
    
    const resultName = document.getElementById('result-name');
    const resultTime = document.getElementById('result-time');
    const restartBtn = document.getElementById('restart-btn');
    const gameoverRestartBtn = document.getElementById('gameover-restart-btn');
    const gameoverMessage = document.getElementById('gameover-message');
    
    // Игровые элементы
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const gameElements = document.getElementById('game-elements');
    const background = document.getElementById('background');
    
    // Игровые переменные
    let playerName = '';
    let gameTime = 0;
    let power = 50;
    let gameInterval;
    let timeInterval;
    let powerInterval;
    let isPaused = false;
    let gameSpeed = 2;
    let walls = [];
    let batteries = [];
    
    // Состояние клавиш
    let keysPressed = {
        'w': false,
        's': false,
        'ArrowUp': false,
        'ArrowDown': false
    };
    
    // Размеры игрового поля
    const gameWidth = window.innerWidth;
    const gameHeight = window.innerHeight;
    
    // Размеры игрока
    const playerWidth = 60;
    const playerHeight = 40;
    let playerY = gameHeight / 2 - playerHeight / 2;
    
    // Настройки игры
    const wallGap = 300;
    const wallWidth = 50;
    const batteryWidth = 30;
    const batteryHeight = 50;
    
    // Создание модели квадрокоптера
    function createDrone() {
        player.innerHTML = `
            <div class="drone-body"></div>
            <div class="propeller top-left"></div>
            <div class="propeller top-right"></div>
            <div class="propeller bottom-left"></div>
            <div class="propeller bottom-right"></div>
            <div class="camera"></div>
        `;
    }
    
    // Проверка ввода имени
    playerNameInput.addEventListener('input', function() {
        startBtn.disabled = this.value.trim() === '';
    });
    
    // Начало игры
    startBtn.addEventListener('click', function() {
        playerName = playerNameInput.value.trim();
        displayName.textContent = playerName;
        
        welcomeScreen.classList.add('hidden');
        setTimeout(() => {
            gameScreen.classList.remove('hidden');
            startGame();
        }, 500);
    });
    
    // Рестарт игры
    restartBtn.addEventListener('click', restartGame);
    gameoverRestartBtn.addEventListener('click', restartGame);
    
    // Управление игроком
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            togglePause();
        }
        
        if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            keysPressed[e.key] = true;
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            keysPressed[e.key] = false;
        }
    });
    
    function movePlayer(amount) {
        playerY += amount;
        
        // Проверка границ с небольшим отступом
        const margin = 5;
        if (playerY < margin) playerY = margin;
        if (playerY > gameHeight - playerHeight - margin) playerY = gameHeight - playerHeight - margin;
        
        player.style.top = playerY + 'px';
    }
    
    function startGame() {
        // Сброс значений
        gameTime = 0;
        power = 50;
        walls = [];
        batteries = [];
        gameElements.innerHTML = '';
        playerY = gameHeight / 2 - playerHeight / 2;
        player.style.top = playerY + 'px';
        
        // Сброс состояния клавиш
        keysPressed = {
            'w': false,
            's': false,
            'ArrowUp': false,
            'ArrowDown': false
        };
        
        // Создание модели квадрокоптера
        createDrone();
        
        // Запуск таймеров
        timeInterval = setInterval(updateTime, 1000);
        powerInterval = setInterval(updatePower, 1000);
        gameInterval = setInterval(updateGame, 20);
        
        // Создание первых стен и батареек
        createInitialWalls();
    }
    
    function updateTime() {
        if (isPaused) return;
        
        gameTime++;
        const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
        const seconds = (gameTime % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${minutes}:${seconds}`;
    }
    
    function updatePower() {
        if (isPaused) return;
        
        power--;
        powerDisplay.textContent = power;
        
        if (power <= 0) {
            endGame('Заряд батареи закончился!');
        }
    }
    
    function updateGame() {
        if (isPaused) return;
        
        // Обработка зажатых клавиш
        if (keysPressed['w'] || keysPressed['ArrowUp']) {
            movePlayer(-5);
        }
        if (keysPressed['s'] || keysPressed['ArrowDown']) {
            movePlayer(5);
        }
        
        // Движение стен и батареек
        moveGameElements();
        
        // Проверка столкновений
        checkCollisions();
        
        // Создание новых стен и батареек
        if (walls.length === 0 || walls[walls.length - 1].x < gameWidth - wallGap) {
            createWall();
            createBattery();
        }
    }
    
    function moveGameElements() {
        // Движение стен
        walls.forEach(wall => {
            wall.x -= gameSpeed;
            wall.element.style.left = wall.x + 'px';
            
            // Удаление стен за пределами экрана
            if (wall.x < -wallWidth) {
                wall.element.remove();
                walls.shift();
            }
        });
        
        // Движение батареек
        batteries.forEach((battery, index) => {
            battery.x -= gameSpeed;
            battery.element.style.left = battery.x + 'px';
            
            // Удаление батареек за пределами экрана
            if (battery.x < -batteryWidth) {
                battery.element.remove();
                batteries.splice(index, 1);
            }
        });
    }
    
    function checkCollisions() {
        const playerRect = {
            x: 100,
            y: playerY,
            width: playerWidth,
            height: playerHeight
        };
        
        // Проверка столкновений со стенами
        for (const wall of walls) {
            const wallRect = {
                x: wall.x,
                y: wall.y,
                width: wall.width,
                height: wall.height
            };
            
            if (checkCollision(playerRect, wallRect)) {
                player.classList.add('crash-animation');
                setTimeout(() => {
                    player.classList.remove('crash-animation');
                }, 500);
                endGame('Квадрокоптер разбился о стену!');
                return;
            }
        }
        
        // Проверка сбора батареек
        for (let i = 0; i < batteries.length; i++) {
            const battery = batteries[i];
            const batteryRect = {
                x: battery.x,
                y: battery.y,
                width: batteryWidth,
                height: batteryHeight
            };
            
            if (checkCollision(playerRect, batteryRect)) {
                // Анимация сбора
                battery.element.classList.add('charge-animation');
                setTimeout(() => {
                    battery.element.remove();
                }, 500);
                
                // Увеличение заряда
                power = Math.min(power + 5, 100);
                powerDisplay.textContent = power;
                
                // Удаление батарейки из массива
                batteries.splice(i, 1);
                i--;
            }
        }
    }
    
    function checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }
    
    function createInitialWalls() {
        for (let x = gameWidth; x < gameWidth * 2; x += wallGap) {
            createWall(x);
            createBattery(x);
        }
    }
    
    function createWall(x = gameWidth) {
        const height = Math.floor(Math.random() * 400) + 100; // 100-500px
        const isTop = Math.random() > 0.5;
        
        const wall = document.createElement('div');
        wall.className = 'wall';
        wall.style.width = wallWidth + 'px';
        wall.style.height = height + 'px';
        wall.style.left = x + 'px';
        wall.style[isTop ? 'top' : 'bottom'] = '0';
        
        gameElements.appendChild(wall);
        
        walls.push({
            element: wall,
            x: x,
            y: isTop ? 0 : gameHeight - height,
            width: wallWidth,
            height: height
        });
    }
    
    function createBattery(x = gameWidth) {
        // Позиция между стенами
        const minY = 50;
        const maxY = gameHeight - batteryHeight - 50;
        const y = Math.floor(Math.random() * (maxY - minY)) + minY;
        
        // Проверка, чтобы батарейка не пересекалась со стенами
        let validPosition = true;
        const batteryRect = {
            x: x,
            y: y,
            width: batteryWidth,
            height: batteryHeight
        };
        
        for (const wall of walls) {
            const wallRect = {
                x: wall.x,
                y: wall.y,
                width: wall.width,
                height: wall.height
            };
            
            if (checkCollision(batteryRect, wallRect)) {
                validPosition = false;
                break;
            }
        }
        
        if (!validPosition) return;
        
        const battery = document.createElement('div');
        battery.className = 'battery';
        battery.style.left = x + 'px';
        battery.style.top = y + 'px';
        
        gameElements.appendChild(battery);
        
        batteries.push({
            element: battery,
            x: x,
            y: y
        });
    }
    
    function endGame(message) {
        clearInterval(timeInterval);
        clearInterval(powerInterval);
        clearInterval(gameInterval);
        
        gameScreen.classList.add('hidden');
        
        if (message.includes('разбился')) {
            gameoverMessage.textContent = message;
            setTimeout(() => {
                gameoverScreen.classList.remove('hidden');
            }, 500);
        } else {
            resultName.textContent = playerName;
            const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
            const seconds = (gameTime % 60).toString().padStart(2, '0');
            resultTime.textContent = `${minutes}:${seconds}`;
            setTimeout(() => {
                resultScreen.classList.remove('hidden');
            }, 500);
        }
    }
    
    function restartGame() {
        resultScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        
        setTimeout(() => {
            gameScreen.classList.remove('hidden');
            startGame();
        }, 500);
    }
    
    function togglePause() {
        isPaused = !isPaused;
        
        if (isPaused) {
            background.style.animationPlayState = 'paused';
            document.querySelectorAll('.wall, .battery').forEach(el => {
                el.style.animationPlayState = 'paused';
            });
        } else {
            background.style.animationPlayState = 'running';
            document.querySelectorAll('.wall, .battery').forEach(el => {
                el.style.animationPlayState = 'running';
            });
        }
    }
});