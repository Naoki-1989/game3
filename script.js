const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

let fruits = [];
let currentFruit = null;
let score = 0;
let gameRunning = false;
let dropInterval;

canvas.width = 800; // 2倍に変更
canvas.height = 1200; // 2倍に変更

const fruitTypes = [
    { type: 'F1.4', color: 'red', size: 40 }, // サイズも2倍に変更
    { type: 'F2', color: 'orange', size: 50 },
    { type: 'F2.8', color: 'yellow', size: 60 },
    { type: 'F4', color: 'green', size: 70 },
    { type: 'F5.6', color: 'blue', size: 80 },
    { type: 'F8', color: 'purple', size: 90 },
    { type: 'F11', color: 'pink', size: 100 },
    { type: 'F16', color: 'gray', size: 110 }
];

class Fruit {
    constructor(x, y, typeIndex, dy) {
        this.x = x;
        this.y = y;
        this.typeIndex = typeIndex;
        this.type = fruitTypes[typeIndex].type;
        this.size = fruitTypes[typeIndex].size;
        this.color = fruitTypes[typeIndex].color;
        this.dy = dy; // 落下速度
        this.dx = 0; // 水平方向の速度
        this.stopped = false; // 落下が停止したかどうか
        this.bounceFactor = 1; // 跳ね返る力の減衰
        this.bounceCount = 0; // 跳ね返りの回数をカウント
        this.merging = false; // 進化中かどうかを示すフラグ
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // F値を表示
        ctx.fillStyle = 'black';
        ctx.font = `${this.size / 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type, this.x, this.y);
    }

    update() {
        if (!this.stopped) {
            this.y += this.dy;
            this.x += this.dx;

            // キャンバスの下部に到達したら落下を停止
            if (this.y + this.size >= canvas.height) {
                this.y = canvas.height - this.size;
                this.stopped = true;
                this.dx = 0; // 水平方向の動きを停止
                this.bounceCount = 0; // 跳ね返りの回数をリセット
                currentFruit = null; // 現在の果物をリセット
                checkGameOver();
                return;
            }

            // キャンバスの左右の境界に到達したら位置を修正
            if (this.x - this.size <= 0) {
                this.x = this.size;
                this.dx = 0;
            } else if (this.x + this.size >= canvas.width) {
                this.x = canvas.width - this.size;
                this.dx = 0;
            }

            this.checkCollision();
        }

        if (this.bounceCount > 10 && Math.abs(this.dy) < 0.1) {
            // 十分に跳ね返りが弱くなった場合に停止
            this.dy = 0;
            this.stopped = true;
            currentFruit = null; // 現在の果物をリセット
            checkGameOver();
        }
    }

    checkCollision() {
        for (let fruit of fruits) {
            if (fruit !== this && this.isColliding(fruit)) {
                if (this.typeIndex === fruit.typeIndex) {
                    this.combineWith(fruit);
                } else {
                    // 衝突時の跳ね返り処理
                    let overlap = (this.size + fruit.size) - Math.hypot(this.x - fruit.x, this.y - fruit.y);
                    let angle = Math.atan2(this.y - fruit.y, this.x - fruit.x);

                    // 衝突後の位置調整
                    if (Math.abs(overlap) > 0) {
                        this.x += overlap * Math.cos(angle);
                        this.y += overlap * Math.sin(angle);
                    }

                    // ランダムでX軸方向に跳ね返る処理
                    if (Math.abs(angle) < Math.PI / 4 || Math.abs(angle) > 3 * Math.PI / 4) {
                        let direction = Math.random() < 0.5 ? -1 : 1;
                        this.dx = direction * 1;
                    } else {
                        this.dx = Math.cos(angle) * 2;
                    }

                    this.dy = -5 * this.bounceFactor;
                    this.bounceFactor *= 0.6;
                    this.bounceCount++;

                    setTimeout(() => {
                        this.dy = getFallSpeed(); // スコアに応じた速度を取得
                    }, 100);

                    this.stopped = false;
                    return;
                }
            }
        }
    }

    combineWith(other) {
        if (this.typeIndex === other.typeIndex) {
            this.merging = true;
            if (this.typeIndex === fruitTypes.length - 2) { // F11の果物同士が接触する場合
                this.typeIndex++;
                this.type = fruitTypes[this.typeIndex].type;
                this.size = fruitTypes[this.typeIndex].size;
                this.color = fruitTypes[this.typeIndex].color;
                fruits.splice(fruits.indexOf(other), 1);
                score += 20 * (this.typeIndex + 1);
                scoreDisplay.innerText = `Score: ${score}`;
                this.stopped = false;
                this.checkCollision();
                resetAllFruits(); // すべての果物の停止を解除
            } else if (this.typeIndex === fruitTypes.length - 1) { // F16の果物同士が接触する場合
                fruits.splice(fruits.indexOf(this), 1);
                fruits.splice(fruits.indexOf(other), 1);
                score += 100; // 高得点を入れる
                scoreDisplay.innerText = `Score: ${score}`;
                currentFruit = null;
                resetAllFruits(); // すべての果物の停止を解除
            } else {
                this.typeIndex++;
                this.type = fruitTypes[this.typeIndex].type;
                this.size = fruitTypes[this.typeIndex].size;
                this.color = fruitTypes[this.typeIndex].color;
                fruits.splice(fruits.indexOf(other), 1);
                score += 20 * (this.typeIndex + 1);
                scoreDisplay.innerText = `Score: ${score}`;
                this.stopped = false;
                this.checkCollision();
                resetAllFruits(); // すべての果物の停止を解除
            }
            this.merging = false;
        }
    }

    isColliding(other) {
        return Math.hypot(this.x - other.x, this.y - other.y) < this.size + other.size;
    }
}

function resetAllFruits() {
    fruits.forEach(fruit => {
        fruit.stopped = false;
        fruit.merging = false;
    });
}

function startGame() {
    fruits = [];
    score = 0;
    gameRunning = true;
    scoreDisplay.innerText = `Score: ${score}`;
    if (dropInterval) clearInterval(dropInterval);
    dropInterval = setInterval(() => {
        if (!currentFruit && allFruitsStopped()) {
            dropNewFruit();
        }
    }, 1000);
    animate();
}

function dropNewFruit() {
    if (currentFruit) return;
    const x = Math.random() * (canvas.width - 20) + 10;
    const typeIndex = Math.floor(Math.random() * (fruitTypes.length));
    currentFruit = new Fruit(x, 0, typeIndex, getFallSpeed());
    fruits.push(currentFruit);
}

function getFallSpeed() {
    return 2 + (Math.floor(score / 4000)); // スコアに応じて速度を設定、さらに10倍緩やかに
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    fruits.forEach(fruit => {
        fruit.update();
        fruit.draw();
    });

    requestAnimationFrame(animate);
}

function gameOver() {
    gameRunning = false;
    clearInterval(dropInterval);
    alert("Game Over!"); // ゲームオーバーの通知
}

function checkGameOver() {
    if (allFruitsStopped()) {
        for (let fruit of fruits) {
            if (fruit.y - fruit.size <= 0 && !fruit.merging) {
                gameOver();
                break;
            }
        }
    }
}

function allFruitsStopped() {
    return fruits.every(fruit => fruit.stopped);
}

canvas.addEventListener('mousemove', (e) => {
    if (!currentFruit || currentFruit.stopped) return;

    const rect = canvas.getBoundingClientRect();
    currentFruit.x = e.clientX - rect.left;
});

canvas.addEventListener('touchmove', (e) => {
    if (!currentFruit || currentFruit.stopped) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    currentFruit.x = touch.clientX - rect.left;
});

document.addEventListener('keydown', (e) => {
    if (!currentFruit || currentFruit.stopped) return;

    if (e.key === 'ArrowLeft') {
        currentFruit.x -= 10;
    } else if (e.key === 'ArrowRight') {
        currentFruit.x += 10;
    } else if (e.key === 'ArrowDown') {
        currentFruit.dy = getFallSpeed() + 3; // スピードアップ
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' && currentFruit) {
        currentFruit.dy = getFallSpeed(); // 通常速度に戻す
    }
});

canvas.addEventListener('mousedown', () => {
    if (currentFruit) {
        currentFruit.dy = getFallSpeed() + 3; // スピードアップ
    }
});

canvas.addEventListener('mouseup', () => {
    if (currentFruit) {
        currentFruit.dy = getFallSpeed(); // 通常速度に戻す
    }
});

canvas.addEventListener('touchstart', () => {
    if (currentFruit) {
        currentFruit.dy = getFallSpeed() + 3; // スピードアップ
    }
});

canvas.addEventListener('touchend', () => {
    if (currentFruit) {
        currentFruit.dy = getFallSpeed(); // 通常速度に戻す
    }
});

document.getElementById('start-button').addEventListener('click', () => {
    if (!gameRunning) {
        startGame();
    }
});
