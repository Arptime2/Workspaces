const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Placeholder for autoSave, will be overridden by save.js
window.reconstructingItem = null;
if (window.visualViewport) {
    canvas.width = window.visualViewport.width;
    canvas.height = window.visualViewport.height;
    document.body.style.height = window.visualViewport.height + 'px';
    document.documentElement.style.height = window.visualViewport.height + 'px';
} else {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.style.height = window.innerHeight + 'px';
    document.documentElement.style.height = window.innerHeight + 'px';
}
window.panOffsetX = 0;
window.panOffsetY = 0;
window.crosshairVirtualX = canvas.width / 2;
window.crosshairVirtualY = canvas.height / 2;

window.getItemUnderCrosshair = function() {
    const screenX = window.crosshairVirtualX - window.panOffsetX;
    const screenY = window.crosshairVirtualY - window.panOffsetY;
    // Check nodes
    for (let ball of window.balls) {
        const dist = Math.sqrt((screenX - ball.x) ** 2 + (screenY - ball.y) ** 2);
        if (dist < ball.radius) {
            return { type: 'node', item: ball };
        }
    }
    // Check window.workspaces, innermost
    let candidate = null;
    for (let ws of window.workspaces) {
        if (screenX >= ws.x && screenX <= ws.x + ws.width && screenY >= ws.y && screenY <= ws.y + ws.height) {
            if (!candidate || (ws.width * ws.height < candidate.width * candidate.height)) {
                candidate = ws;
            }
        }
    }
    if (candidate) {
        return { type: 'workspace', item: candidate };
    }
    return null;
};
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
    window.drawCrosshair(ctx);
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
        const id = window.nextWorkspaceId++;
        window.workspaces.push(new Workspace(x, y, w, h, id, 'Workspace ' + id, '', []));
        const ws = window.workspaces[window.workspaces.length - 1];
        window.balls.forEach(ball => {
            if (isNodeInWorkspace(ball, ws) && !isNodeInAnyWorkspace(ball)) {
                ws.nodeIds.push(ball.id);
            }
        });
        window.workspaces.forEach(otherWs => {
            if (otherWs !== ws && isWorkspaceInWorkspace(otherWs, ws)) {
                ws.workspaceIds.push(otherWs.id);
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
                 draggedNodes = getAllChildNodes(ws);
                 draggedChildWorkspaces = getAllChildWorkspaces(ws);
                 draggedChildWorkspaces.forEach(child => {
                     child.offsetX = child.x - draggedWorkspace.x;
                     child.offsetY = child.y - draggedWorkspace.y;
                 });
                 draggedNodes.forEach(node => {
                     node.offsetX = node.x - draggedWorkspace.x;
                     node.offsetY = node.y - draggedWorkspace.y;
                 });
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
        window.balls.forEach(ball => {
            ball.x += deltaX;
            ball.y += deltaY;
        });
        panWorkspaces(deltaX, deltaY);
        window.panOffsetX += deltaX;
        window.panOffsetY += deltaY;
        window.crosshairVirtualX += deltaX;
        window.crosshairVirtualY += deltaY;
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
        window.balls = window.balls.filter(ball => ball !== draggedBall);
        // remove from outgoing connections
        window.balls.forEach(ball => {
            ball.outgoing = ball.outgoing.filter(id => id !== draggedBall.id);
        });
        // update window.workspaces
        window.workspaces.forEach(ws => {
            if (ws.nodeIds.includes(draggedBall.id)) {
                ws.nodeIds = ws.nodeIds.filter(id => id !== draggedBall.id);
                updateWorkspaceSize(ws);
            }
        });
    } else if (draggedWorkspace && isOverDeleteButton(mouseX, mouseY)) {
        // delete workspace and its nodes and child window.workspaces
        window.workspaces = window.workspaces.filter(ws => ws !== draggedWorkspace && !getAllChildWorkspaces(draggedWorkspace).includes(ws));
        draggedNodes.forEach(node => {
            window.balls = window.balls.filter(ball => ball !== node);
            // remove connections to this node
            window.balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => id !== node.id);
            });
        });
        // Also delete nodes in child window.workspaces
        getAllChildWorkspaces(draggedWorkspace).forEach(childWs => {
            window.balls = window.balls.filter(ball => !childWs.nodeIds.includes(ball.id));
        });
    }
    // Update window.workspaces for node placement
    if (draggedBall && window.balls.includes(draggedBall)) {
        window.workspaces.forEach(ws => {
            ws.nodeIds = window.balls.filter(ball => isNodeInWorkspace(ball, ws) && !window.workspaces.filter(other => other !== ws).some(other => other.nodeIds.includes(ball.id))).map(ball => ball.id);
            updateWorkspaceSize(ws);
        });
    }
    // Update window.workspaces for workspace placement
    if (draggedWorkspace) {
        const draggedTree = [draggedWorkspace, ...draggedChildWorkspaces];
        window.workspaces.forEach(ws => {
            if (!draggedTree.includes(ws)) {
                ws.nodeIds = window.balls.filter(ball => isNodeInWorkspace(ball, ws) && !window.workspaces.filter(other => other !== ws).some(other => other.nodeIds.includes(ball.id))).map(ball => ball.id);
                ws.workspaceIds = window.workspaces.filter(other => other !== ws && isWorkspaceInWorkspace(other, ws)).map(other => other.id);
                updateWorkspaceSize(ws);
            }
        });
    }
    mouseDown = false;
    draggedBall = null;
    isDragging = false;
    draggedWorkspace = null;
    draggedNodes = [];
    draggedChildWorkspaces = [];
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
    window.balls.forEach(async (ball) => {
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
                     const under = getItemUnderCrosshair();
                     if (under && under.type === 'node' && under.item === ball) {
                         window.editingItem = ball;
                         editingType = 'node_description';
                         window.isEditing = true;
                         editInput.textContent = ball.description;
                         editInput.style.left = (nameX - 50 * window.scale) + 'px'; // Center approx
                         editInput.style.top = (nameY - 12 * window.scale) + 'px';
                         editInput.style.width = `${100 * window.scale}px`;
                         editInput.style.display = 'inline-block';
                         editInput.focus();
                         document.getSelection().selectAllChildren(editInput);
                         clickedOnBall = true; // Prevent other actions
                     } else {
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
                 // Check if clicked on description
                 if (!clickedOnBall) {
                     const under = getItemUnderCrosshair();
                     if (under && under.type === 'node' && under.item === ball) {
                         const descX = ball.x;
                         const descY = ball.y - ball.radius - 20;
                         const descDist = Math.sqrt((pendingMouseX - descX) ** 2 + (pendingMouseY - descY) ** 2);
                         if (descDist < 20 * window.scale) {
                             window.editingItem = ball;
                             editingType = 'node_description';
                             window.isEditing = true;
                             editInput.textContent = ball.description;
                             editInput.style.left = (descX - 50 * window.scale) + 'px';
                             editInput.style.top = (descY - 12 * window.scale) + 'px';
                             editInput.style.width = `${100 * window.scale}px`;
                             editInput.style.display = 'inline-block';
                             editInput.focus();
                             document.getSelection().selectAllChildren(editInput);
                             clickedOnBall = true; // Prevent other actions
                         }
                     }
                 }
            }
    });

    // Check for workspace name click
    if (!clickedOnBall) {
        for (let ws of window.workspaces) {
            const nameX = ws.x + ws.width / 2;
            const nameY = ws.y - 10;
            const nameDist = Math.sqrt((pendingMouseX - nameX) ** 2 + (pendingMouseY - nameY) ** 2);
             if (nameDist < 30 * window.scale) { // Tolerance
                 const under = getItemUnderCrosshair();
                 if (under && under.type === 'workspace' && under.item === ws) {
                     window.editingItem = ws;
                     editingType = 'workspace_description';
                     window.isEditing = true;
                     editInput.textContent = ws.description;
                     editInput.style.left = (nameX - 50 * window.scale) + 'px';
                     editInput.style.top = (nameY - 12 * window.scale) + 'px';
                     editInput.style.width = `${100 * window.scale}px`;
                     editInput.style.display = 'inline-block';
                     editInput.focus();
                     document.getSelection().selectAllChildren(editInput);
                     clickedOnBall = true; // Prevent other actions
                     break;
                 } else {
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
             // Check for workspace description click
             if (!clickedOnBall) {
                 const under = getItemUnderCrosshair();
                 if (under && under.type === 'workspace' && under.item === ws) {
                     const descX = ws.x + ws.width / 2;
                     const descY = ws.y - 25;
                     const descDist = Math.sqrt((pendingMouseX - descX) ** 2 + (pendingMouseY - descY) ** 2);
                     if (descDist < 30 * window.scale) {
                         window.editingItem = ws;
                         editingType = 'workspace_description';
                         window.isEditing = true;
                         editInput.textContent = ws.description;
                         editInput.style.left = (descX - 50 * window.scale) + 'px';
                         editInput.style.top = (descY - 12 * window.scale) + 'px';
                         editInput.style.width = `${100 * window.scale}px`;
                         editInput.style.display = 'inline-block';
                         editInput.focus();
                         document.getSelection().selectAllChildren(editInput);
                         clickedOnBall = true; // Prevent other actions
                         break;
                     }
                 }
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
        for (let ws of window.workspaces) {
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
            const inClosedWorkspace = window.workspaces.some(ws => ws.closed && pendingMouseX >= ws.x && pendingMouseX <= ws.x + ws.width && pendingMouseY >= ws.y && pendingMouseY <= ws.y + ws.height);
            if (!inClosedWorkspace) {
                // Check for overlap
                const tooClose = window.balls.some(ball => {
                    const dist = Math.sqrt((pendingMouseX - ball.x) ** 2 + (pendingMouseY - ball.y) ** 2);
                    return dist < ball.radius + 20;
                });
                if (!tooClose) {
                    const newNode = new Node(pendingMouseX, pendingMouseY, 20 * window.scale, window.nextId++);
                    window.balls.push(newNode);
                    window.workspaces.forEach(ws => {
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

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        canvas.width = window.visualViewport.width;
        canvas.height = window.visualViewport.height;
        document.body.style.height = window.visualViewport.height + 'px';
        document.documentElement.style.height = window.visualViewport.height + 'px';
    });
} else {
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        document.body.style.height = window.innerHeight + 'px';
        document.documentElement.style.height = window.innerHeight + 'px';
    });
}

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
    if (window.editingItem) {
        let nameChanged = false;
        let newName = '';
        if (editingType === 'node') {
            editingItem.name = editInput.textContent;
        } else if (editingType === 'node_description') {
            editingItem.description = editInput.textContent;
        } else if (editingType === 'workspace') {
            const oldName = editingItem.name;
            editingItem.name = editInput.textContent;
            newName = editingItem.name;
            nameChanged = newName !== oldName;
        } else if (editingType === 'workspace_description') {
            editingItem.description = editInput.textContent;
        }
        if (nameChanged) {
            // Check if saved workspace exists
            window.reconstructingItem = editingItem;
            window.sendToBackend(JSON.stringify({type: 'load_workspace', name: newName}));
        } else {
            //
        }
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

// Execute the functions once on load
createNewNode();
createNewWorkspace();
const ws = window.workspaces[window.workspaces.length - 1];
const node = window.balls[window.balls.length - 1];
ws.nodeIds.push(node.id);
updateWorkspaceSize(ws);
saveWorkspace('New Workspace');
saveNode('New Node');
setTimeout(() => {
    loadWorkspaceNewVersion('New Workspace', 100, 100);
    loadNode('New Node');
}, 5000);

setTimeout(() => {
    loadWorkspaceNewVersion('New Workspace', 200, 200);
}, 10000);