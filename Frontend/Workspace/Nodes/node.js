class Node {
    constructor(x, y, radius = 20, id) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.id = id;
        this.name = 'Node ' + id; // Node name
        this.description = 'Node Description'; // Node description
        this.color = 'lightblue'; // Default color
        this.labels = []; // Array of labels
        this.outgoing = []; // IDs of outgoing connections
        this.systemPrompt = ''; // System prompt
        this.prompt = ''; // User prompt
        this.tokenCount = 0; // Token count
        this.contextLabels = []; // Array of context labels
        this.contextCount = 0; // Context count
        this.nodeType = 'default'; // Node type
    }
}

window.balls = [];
let draggedBall = null;
let isDragging = false;
window.nextId = 0;

function initBalls(canvas) {
    for (let i = 0; i < 5; i++) {
        window.balls.push(new Node(
            Math.random() * 1000 + canvas.width / 2 - 500,
            Math.random() * 1000 + canvas.height / 2 - 500,
            20,
            window.nextId++
        ));
    }
}

function drawBalls(ctx) {
    ctx.save();
    ctx.translate(window.panOffsetX, window.panOffsetY);
    ctx.scale(window.zoom, window.zoom);
    ctx.shadowBlur = 20;
    const under = window.getItemUnderCrosshair();
    window.balls.forEach(ball => {
        ctx.shadowColor = ball.color;
        ctx.fillStyle = ball.color;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
        ctx.fill();
        // Draw name
        if (!(window.isEditing && window.editingItem === ball)) {
            ctx.fillStyle = 'white';
            ctx.font = `${16 * window.scale}px Arial`;
            ctx.textAlign = 'center';
            // Draw description if under crosshair
            if (under && under.type === 'node' && under.item === ball) {
                ctx.fillStyle = 'black';
                ctx.fillRect(ball.x - 60, ball.y - ball.radius - 25, 120, 15);
                ctx.fillStyle = 'white';
                ctx.font = `${20 * window.scale}px Arial`;
                ctx.fillText(ball.description, ball.x, ball.y - ball.radius - 20);
            }
            ctx.fillText(ball.name, ball.x, ball.y - ball.radius - 5);
        }
    });
    ctx.restore();
}

function handleBallMouseDown(e) {
    const worldMouseX = (e.clientX - window.panOffsetX) / window.zoom;
    const worldMouseY = (e.clientY - window.panOffsetY) / window.zoom;
    for (let ball of window.balls) {
        const dist = Math.sqrt((worldMouseX - ball.x) ** 2 + (worldMouseY - ball.y) ** 2);
        if (dist < ball.radius) {
            return ball;
        }
    }
    return null;
}

function handleBallMouseMove(e, prevMouseX, prevMouseY) {
    if (draggedBall) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        draggedBall.x += deltaX;
        draggedBall.y += deltaY;
    }
}

function handleBallMouseUp() {
    draggedBall = null;
    isDragging = false;
}

function panBalls(deltaX, deltaY) {
    window.balls.forEach(ball => {
        ball.x += deltaX;
        ball.y += deltaY;
    });
}