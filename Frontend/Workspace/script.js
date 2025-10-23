const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
initBalls(canvas);
let prevMouseX = 0;
let prevMouseY = 0;
let mouseInitialized = false;
let mouseDown = false;
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBalls(ctx);
}
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();
canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    handleBallMouseDown(e);
});
canvas.addEventListener('mouseup', () => {
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
});
canvas.addEventListener('mousemove', (e) => {
    if (!mouseInitialized) {
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
        mouseInitialized = true;
        return;
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
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Communication with backend
window.onMessageFromBackend = (message) => {
    console.log('Message from backend:', message);
    // Example: update canvas or something
};

// Send a message when clicking on a ball
canvas.addEventListener('click', async (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    balls.forEach(async (ball) => {
        const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
        if (dist < ball.radius) {
            await window.sendToBackend('Ball clicked at ' + mouseX + ',' + mouseY);
        }
    });
});