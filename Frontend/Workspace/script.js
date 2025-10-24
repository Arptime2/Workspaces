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
let longPressTimer;
let wasLongPress = false;
window.isDefiningWorkspace = false;
let justPlacedWorkspace = false;

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWorkspaces(ctx);
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
    if (window.isDefiningWorkspace) {
        // Second click to place
        const w = Math.abs(e.clientX - workspaceStartX);
        const h = Math.abs(e.clientY - workspaceStartY);
        const x = Math.min(e.clientX, workspaceStartX);
        const y = Math.min(e.clientY, workspaceStartY);
        const id = nextWorkspaceId++;
        workspaces.push(new Workspace(x, y, w, h, id, 'Workspace ' + id, '', []));
        window.isDefiningWorkspace = false;
        justPlacedWorkspace = true;
        return;
    }
    mouseDown = true;
    hasMoved = false;
    handleBallMouseDown(e);
    const ws = handleWorkspaceMouseDown(e);
    if (!draggedBall && !ws) {
        longPressTimer = setTimeout(() => {
            if (!hasMoved) {
                window.isDefiningWorkspace = true;
                workspaceStartX = e.clientX;
                workspaceStartY = e.clientY;
                workspaceEndX = e.clientX;
                workspaceEndY = e.clientY;
            }
        }, 300);
    } else if (ws && !draggedBall) {
        // On workspace, start timer for dragging
        longPressTimer = setTimeout(() => {
            if (!hasMoved) {
                draggedWorkspace = ws;
                draggedNodes = balls.filter(ball => isNodeInWorkspace(ball, ws));
                // Update nodeIds
                ws.nodeIds = draggedNodes.map(ball => ball.id);
            }
        }, 300);
    }
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
    } else if (draggedWorkspace) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        handleWorkspaceMouseMove(deltaX, deltaY);
    } else if (mouseDown && !isDragging && !draggedWorkspace && !window.isDefiningWorkspace) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        balls.forEach(ball => {
            ball.x += deltaX;
            ball.y += deltaY;
        });
        panWorkspaces(deltaX, deltaY);
    }
    if (window.isDefiningWorkspace) {
        workspaceEndX = e.clientX;
        workspaceEndY = e.clientY;
    }
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
});

canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
    draggedWorkspace = null;
    draggedNodes = [];
    window.isDefiningWorkspace = false;
});

document.addEventListener('mouseup', () => {
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
    draggedWorkspace = null;
    draggedNodes = [];
    clearTimeout(longPressTimer);
    if (window.isDefiningWorkspace) {
        // Continue defining, don't place yet
    } else {
        wasLongPress = false;
    }
});

canvas.addEventListener('click', async (e) => {
    if (hasMoved || wasLongPress || window.isDefiningWorkspace || justPlacedWorkspace) {
        justPlacedWorkspace = false;
        return;
    } // Prevent click after drag, long press, defining, or placement
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
            const newNode = new Node(mouseX, mouseY, 20 * window.scale, nextId++);
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