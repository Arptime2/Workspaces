const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const balls = [];
for (let i = 0; i < 5; i++) {
    balls.push({
        x: Math.random() * 1000 + canvas.width / 2 - 500,
        y: Math.random() * 1000 + canvas.height / 2 - 500,
        radius: 20
    });
}
let prevMouseX = 0;
let prevMouseY = 0;
let mouseInitialized = false;
let isDragging = false;
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'white';
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
        ctx.fill();
    });
}
function animate() {
    draw();
    requestAnimationFrame(animate);
}
animate();
canvas.addEventListener('mousedown', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    balls.forEach(ball => {
        const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
        if (dist < ball.radius) {
            isDragging = true;
        }
    });
});
canvas.addEventListener('mouseup', () => {
    isDragging = false;
});
canvas.addEventListener('mousemove', (e) => {
    if (!mouseInitialized) {
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        mouseInitialized = true;

        return;
    }
    if (!isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        balls.forEach(ball => {
            ball.x -= deltaX;
            ball.y -= deltaY;
        });
    }
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
});
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});