const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
initBalls(canvas);
let prevMouseX = 0;
let prevMouseY = 0;
let mouseInitialized = false;
let mouseDown = false;
let hasMoved = false;

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBalls(ctx);
    drawConnections(ctx);
    drawSelectionLine(ctx);
}

function animate() {
    draw();
    requestAnimationFrame(animate);
}

animate();

canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    hasMoved = false;
    handleBallMouseDown(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (!mouseInitialized) {
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        mouseInitialized = true;
        return;
    }
    hasMoved = true;
    if (isConnecting && draggedBall) {
        // Cancel connection if dragging
        isConnecting = false;
        document.body.classList.remove('connecting');
    }
    if (draggedBall) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        draggedBall.x += deltaX;
        draggedBall.y += deltaY;
    } else if (mouseDown && !isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        balls.forEach(ball => {
            ball.x += deltaX;
            ball.y += deltaY;
        });
    }
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
});

canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
});

document.addEventListener('mouseup', () => {
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
});

canvas.addEventListener('click', async (e) => {
    if (hasMoved) return; // Prevent click after drag
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    let clickedOnBall = false;
    balls.forEach(async (ball) => {
        const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
        if (dist < ball.radius) {
            clickedOnBall = true;
            handleConnectionClick(ball);
            // Optionally send message
            // await window.sendToBackend('Ball clicked at ' + mouseX + ',' + mouseY);
        }
    });
    if (!clickedOnBall) {
        // Check for overlap
        const tooClose = balls.some(ball => {
            const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
            return dist < ball.radius + 20;
        });
        if (!tooClose) {
            const newNode = new Node(mouseX, mouseY, 20, nextId++);
            balls.push(newNode);
            if (isConnecting) {
                finishConnection(newNode);
            }
        }
    }
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});