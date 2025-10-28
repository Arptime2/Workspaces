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
let clickCount = 0;
let lastClickTime = 0;
const tripleClickThreshold = 1000;
let pendingTimeout;
let pendingMouseX;
let pendingMouseY;
let editInput;
window.editingItem;
let editingType;
window.isEditing = false;
window.terminalHistory = [];

function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw terminal history as background
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    let y = 20;
    window.terminalHistory.forEach(line => {
        ctx.fillText(line, 10, y);
        y += 15;
    });
    ctx.globalAlpha = 1;
    drawWorkspaces(ctx);
    drawBalls(ctx);
    drawConnections(ctx);
    drawClosedOverlays(ctx);
    drawSelectionLine(ctx);
}

function animate() {
    if (window.zooming) {
        const elapsed = (Date.now() - window.zoomStartTime) / 1000;
        const accel = window.baseFactor > 1 ? 0.02 : -0.02;
        const currentFactor = window.baseFactor + elapsed * accel;
        adjustScale(currentFactor);
    }
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
        const ws = workspaces[workspaces.length - 1];
        balls.forEach(ball => {
            if (isNodeInWorkspace(ball, ws) && !isNodeInAnyWorkspace(ball)) {
                ws.nodeIds.push(ball.id);
            }
        });
        updateWorkspaceSize(ws);
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
                draggedNodes = balls.filter(ball => ws.nodeIds.includes(ball.id));
            }
        }, 300);
    }
});

document.addEventListener('mousemove', (e) => {
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
    window.isDefiningWorkspace = false;
});

function isOverDeleteButton(x, y) {
    const zoomOutBtn = document.querySelector('.zoom-btn:nth-child(2)');
    if (!zoomOutBtn) return false;
    const rect = zoomOutBtn.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

document.addEventListener('mouseup', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    if (draggedBall && isOverDeleteButton(mouseX, mouseY)) {
        // delete node
        balls = balls.filter(ball => ball !== draggedBall);
        // remove from outgoing connections
        balls.forEach(ball => {
            ball.outgoing = ball.outgoing.filter(id => id !== draggedBall.id);
        });
        // update workspaces
        workspaces.forEach(ws => {
            if (ws.nodeIds.includes(draggedBall.id)) {
                ws.nodeIds = ws.nodeIds.filter(id => id !== draggedBall.id);
                updateWorkspaceSize(ws);
            }
        });
    } else if (draggedWorkspace && isOverDeleteButton(mouseX, mouseY)) {
        // delete workspace and its nodes
        workspaces = workspaces.filter(ws => ws !== draggedWorkspace);
        draggedNodes.forEach(node => {
            balls = balls.filter(ball => ball !== node);
            // remove connections to this node
            balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => id !== node.id);
            });
        });
    }
    // Update workspaces for node placement
    if (draggedBall && balls.includes(draggedBall)) {
        workspaces.forEach(ws => {
            ws.nodeIds = balls.filter(ball => isNodeInWorkspace(ball, ws) && !workspaces.filter(other => other !== ws).some(other => other.nodeIds.includes(ball.id))).map(ball => ball.id);
            updateWorkspaceSize(ws);
        });
    }
    // Update workspaces for workspace placement
    if (draggedWorkspace) {
        workspaces.forEach(ws => {
            ws.nodeIds = balls.filter(ball => isNodeInWorkspace(ball, ws) && !workspaces.filter(other => other !== ws).some(other => other.nodeIds.includes(ball.id))).map(ball => ball.id);
            updateWorkspaceSize(ws);
        });
    }
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
    const currentTime = Date.now();
    if (currentTime - lastClickTime < tripleClickThreshold) {
        clickCount++;
    } else {
        clickCount = 1;
    }
    lastClickTime = currentTime;
    pendingMouseX = mouseX;
    pendingMouseY = mouseY;

    let clickedOnBall = false;
    balls.forEach(async (ball) => {
        const dist = Math.sqrt((pendingMouseX - ball.x) ** 2 + (pendingMouseY - ball.y) ** 2);
        if (dist < ball.radius) {
            clickedOnBall = true;
            handleConnectionClick(ball);
            // Optionally send message
            // await window.sendToBackend('Ball clicked at ' + mouseX + ',' + mouseY);
        } else {
            // Check if clicked on name
            const nameX = ball.x;
            const nameY = ball.y - ball.radius - 5;
            const nameDist = Math.sqrt((pendingMouseX - nameX) ** 2 + (pendingMouseY - nameY) ** 2);
            if (nameDist < 20 * window.scale) { // Tolerance
                window.editingItem = ball;
                editingType = 'node';
                window.isEditing = true;
                editInput.textContent = ball.name;
                editInput.style.left = (nameX - 50 * window.scale) + 'px'; // Center approx
                editInput.style.top = (nameY - 12 * window.scale) + 'px';
                editInput.style.width = `${100 * window.scale}px`;
                editInput.style.display = 'inline-block';
                editInput.focus();
                document.getSelection().selectAllChildren(editInput);
                clickedOnBall = true; // Prevent other actions
            }
        }
    });

    // Check for workspace name click
    if (!clickedOnBall) {
        for (let ws of workspaces) {
            const nameX = ws.x + ws.width / 2;
            const nameY = ws.y - 10;
            const nameDist = Math.sqrt((pendingMouseX - nameX) ** 2 + (pendingMouseY - nameY) ** 2);
            if (nameDist < 30 * window.scale) { // Tolerance
                window.editingItem = ws;
                editingType = 'workspace';
                window.isEditing = true;
                editInput.textContent = ws.name;
                editInput.style.left = (nameX - 50 * window.scale) + 'px';
                editInput.style.top = (nameY - 12 * window.scale) + 'px';
                editInput.style.width = `${100 * window.scale}px`;
                editInput.style.display = 'inline-block';
                editInput.focus();
                document.getSelection().selectAllChildren(editInput);
                clickedOnBall = true; // Prevent other actions
                break;
            }
        }
    }

    // Check for workspace triple-click
    if (!clickedOnBall && clickCount === 3) {
        clickCount = 0; // Reset
        if (pendingTimeout) {
            clearTimeout(pendingTimeout);
            pendingTimeout = null;
        }
        for (let ws of workspaces) {
            if (pendingMouseX >= ws.x && pendingMouseX <= ws.x + ws.width && pendingMouseY >= ws.y && pendingMouseY <= ws.y + ws.height) {
                ws.closed = !ws.closed;
                return; // Toggle and exit
            }
        }
    }

    // Clear any pending timeout and set new one
    if (pendingTimeout) {
        clearTimeout(pendingTimeout);
    }
    pendingTimeout = setTimeout(() => {
        if (clickCount === 1 && !clickedOnBall) {
            // Check if click is in a closed workspace
            const inClosedWorkspace = workspaces.some(ws => ws.closed && pendingMouseX >= ws.x && pendingMouseX <= ws.x + ws.width && pendingMouseY >= ws.y && pendingMouseY <= ws.y + ws.height);
            if (!inClosedWorkspace) {
                // Check for overlap
                const tooClose = balls.some(ball => {
                    const dist = Math.sqrt((pendingMouseX - ball.x) ** 2 + (pendingMouseY - ball.y) ** 2);
                    return dist < ball.radius + 20;
                });
                if (!tooClose) {
                    const newNode = new Node(pendingMouseX, pendingMouseY, 20 * window.scale, nextId++);
                    balls.push(newNode);
                    workspaces.forEach(ws => {
                        if (isNodeInWorkspace(newNode, ws) && !isNodeInAnyWorkspace(newNode)) {
                            ws.nodeIds.push(newNode.id);
                            updateWorkspaceSize(ws);
                        }
                    });
                    if (isConnecting) {
                        finishConnection(newNode);
                    }
                }
            }
        }
        clickCount = 0;
        pendingTimeout = null;
    }, 200);
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Create edit paragraph
window.editInput = document.createElement('p');
editInput = window.editInput;
editInput.contentEditable = 'true';
editInput.style.position = 'absolute';
editInput.style.display = 'none';
editInput.style.font = `${12 * window.scale}px Arial`;
editInput.style.color = 'white';
editInput.style.background = 'transparent';
editInput.style.border = 'none';
editInput.style.outline = 'none';
editInput.style.zIndex = '2000';
editInput.style.textAlign = 'center';
editInput.style.padding = '0';
editInput.style.margin = '0';
editInput.style.width = `${100 * window.scale}px`;
editInput.style.verticalAlign = 'baseline';
editInput.style.display = 'inline-block';
document.body.appendChild(editInput);

editInput.addEventListener('blur', () => {
    if (editingItem) {
        editingItem.name = editInput.textContent;
        editInput.style.display = 'none';
        window.editingItem = null;
        editingType = null;
        window.isEditing = false;
    }
});

editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        editInput.blur();
    }
});