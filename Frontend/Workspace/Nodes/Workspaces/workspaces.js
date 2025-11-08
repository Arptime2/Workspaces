class Workspace {
    constructor(x, y, width, height, id, name, description, nodeIds, workspaceIds) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.id = id;
        this.name = name || 'Workspace ' + id;
        this.description = description || 'Workspace Description';
        this.nodeIds = nodeIds || [];
        this.workspaceIds = workspaceIds || [];
        this.closed = false;
    }
}

window.workspaces = [];
let nextWorkspaceId = 0;
window.nextWorkspaceId = nextWorkspaceId;
let draggedWorkspace = null;
let draggedNodes = [];
let draggedChildWorkspaces = [];
let workspaceStartX, workspaceStartY, workspaceEndX, workspaceEndY;

function isWorkspaceInWorkspace(childWs, parentWs) {
    return childWs.x >= parentWs.x && childWs.x + childWs.width <= parentWs.x + parentWs.width &&
           childWs.y >= parentWs.y && childWs.y + childWs.height <= parentWs.y + parentWs.height;
}

function getAllChildWorkspaces(ws) {
    let children = [];
    ws.workspaceIds.forEach(id => {
        const child = window.workspaces.find(w => w.id === id);
        if (child) {
            children.push(child);
            children = children.concat(getAllChildWorkspaces(child));
        }
    });
    return children;
}

function getAllChildNodes(ws) {
    let nodes = ws.nodeIds.map(id => window.balls.find(b => b.id === id)).filter(b => b);
    ws.workspaceIds.forEach(id => {
        const child = window.workspaces.find(w => w.id === id);
        if (child) {
            nodes = nodes.concat(getAllChildNodes(child));
        }
    });
    return nodes;
}

function drawWorkspace(ws, ctx) {
    drawRoundedRect(ctx, ws.x, ws.y, ws.width, ws.height);
    // Draw name
    if (!(window.isEditing && window.editingItem === ws)) {
        ctx.fillStyle = 'white';
        ctx.font = `${16 * window.scale}px Arial`;
        ctx.textAlign = 'center';
        // Draw description if under crosshair
        const under = window.getItemUnderCrosshair();
        if (under && under.type === 'workspace' && under.item === ws) {
            ctx.fillStyle = 'black';
            ctx.fillRect(ws.x + ws.width / 2 - 60, ws.y - 30, 120, 15);
            ctx.fillStyle = 'white';
            ctx.font = `${20 * window.scale}px Arial`;
            ctx.fillText(ws.description, ws.x + ws.width / 2, ws.y - 25);
        }
        ctx.fillText(ws.name, ws.x + ws.width / 2, ws.y - 10);
    }
    // Draw children
    ws.workspaceIds.forEach(id => {
        const child = window.workspaces.find(w => w.id === id);
        if (child) {
            drawWorkspace(child, ctx);
        }
    });
}

function drawWorkspaces(ctx) {
    ctx.save();
    ctx.translate(window.panOffsetX, window.panOffsetY);
    ctx.scale(window.zoom, window.zoom);
    // Draw top-level window.workspaces (those not in any other)
    window.workspaces.forEach(ws => {
        if (!window.workspaces.some(other => other.workspaceIds.includes(ws.id))) {
            drawWorkspace(ws, ctx);
        }
    });
    if (window.isDefiningWorkspace) {
        const worldStartX = (workspaceStartX - window.panOffsetX) / window.zoom;
        const worldStartY = (workspaceStartY - window.panOffsetY) / window.zoom;
        const worldEndX = (workspaceEndX - window.panOffsetX) / window.zoom;
        const worldEndY = (workspaceEndY - window.panOffsetY) / window.zoom;
        const x = Math.min(worldStartX, worldEndX);
        const y = Math.min(worldStartY, worldEndY);
        const w = Math.abs(worldEndX - worldStartX);
        const h = Math.abs(worldEndY - worldStartY);
        drawRoundedRect(ctx, x, y, w, h);
    }
    ctx.restore();
}

function getCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function drawRoundedRect(ctx, x, y, width, height) {
    const radius = parseInt(getCSSVar('--workspace-radius'));
    const effectiveRadius = Math.min(radius, width / 2, height / 2);
    const fillColor = getCSSVar('--workspace-fill');
    const strokeColor = getCSSVar('--workspace-stroke');
    const lineWidth = parseInt(getCSSVar('--workspace-stroke-width'));
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x + effectiveRadius, y);
    ctx.lineTo(x + width - effectiveRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + effectiveRadius);
    ctx.lineTo(x + width, y + height - effectiveRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - effectiveRadius, y + height);
    ctx.lineTo(x + effectiveRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - effectiveRadius);
    ctx.lineTo(x, y + effectiveRadius);
    ctx.quadraticCurveTo(x, y, x + effectiveRadius, y);
    ctx.closePath();
    ctx.fill();
    // ctx.stroke(); // Remove stroke for closed overlays
}

function handleWorkspaceMouseDown(e) {
    const worldMouseX = (e.clientX - window.panOffsetX) / window.zoom;
    const worldMouseY = (e.clientY - window.panOffsetY) / window.zoom;
    console.log('handleWorkspaceMouseDown worldMouse:', worldMouseX, worldMouseY);
    let candidate = null;
    for (let ws of window.workspaces) {
        console.log('checking ws', ws.id, 'x:', ws.x, 'y:', ws.y, 'w:', ws.width, 'h:', ws.height);
        if (worldMouseX >= ws.x && worldMouseX <= ws.x + ws.width && worldMouseY >= ws.y && worldMouseY <= ws.y + ws.height) {
            console.log('in bounds for ws', ws.id);
            if (!candidate || (ws.width * ws.height < candidate.width * candidate.height)) {
                candidate = ws;
            }
        }
    }
    console.log('candidate ws:', candidate ? candidate.id : null);
    return candidate;
}

function isNodeInWorkspace(ball, ws) {
    return ball.x >= ws.x && ball.x <= ws.x + ws.width && ball.y >= ws.y && ball.y <= ws.y + ws.height;
}

function handleWorkspaceMouseMove(deltaX, deltaY) {
    if (draggedWorkspace) {
        draggedWorkspace.x += deltaX / window.zoom;
        draggedWorkspace.y += deltaY / window.zoom;
        // Set positions relative to draggedWorkspace
        draggedNodes.forEach(ball => {
            ball.x = draggedWorkspace.x + ball.offsetX;
            ball.y = draggedWorkspace.y + ball.offsetY;
        });
        draggedChildWorkspaces.forEach(child => {
            child.x = draggedWorkspace.x + child.offsetX;
            child.y = draggedWorkspace.y + child.offsetY;
        });
    }
}

function panWorkspaces(deltaX, deltaY) {
    window.workspaces.forEach(ws => {
        ws.x += deltaX;
        ws.y += deltaY;
    });
}

function scaleWorkspaces(centerX, centerY, newScale, oldScale) {
    window.workspaces.forEach(ws => {
        ws.x = (ws.x - centerX) * (newScale / oldScale) + centerX;
        ws.y = (ws.y - centerY) * (newScale / oldScale) + centerY;
        ws.width *= newScale / oldScale;
        ws.height *= newScale / oldScale;
    });
}

function updateWorkspaceSize(ws) {
    const allNodes = getAllChildNodes(ws);
    const childWorkspaces = getAllChildWorkspaces(ws);
    if (allNodes.length === 0 && childWorkspaces.length === 0) {
        // If no content, keep as is
        return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    allNodes.forEach(n => {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
    });
    childWorkspaces.forEach(cws => {
        minX = Math.min(minX, cws.x);
        maxX = Math.max(maxX, cws.x + cws.width);
        minY = Math.min(minY, cws.y);
        maxY = Math.max(maxY, cws.y + cws.height);
    });
    if (minX === Infinity) return; // No content
    const scale = window.scale || 1;
    ws.x = minX - 50 * scale;
    ws.y = minY - 50 * scale;
    ws.width = (maxX - minX) + 100 * scale;
    ws.height = (maxY - minY) + 100 * scale;
}

function drawClosedOverlays(ctx) {
    ctx.save();
    ctx.translate(window.panOffsetX, window.panOffsetY);
    ctx.scale(window.zoom, window.zoom);
    window.workspaces.forEach(ws => {
        if (ws.closed) {
            const radius = parseInt(getCSSVar('--workspace-radius'));
            const effectiveRadius = Math.min(radius, ws.width / 2, ws.height / 2);
            ctx.fillStyle = 'rgb(16, 46, 21)';
            ctx.strokeStyle = 'rgb(16, 46, 21)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ws.x + effectiveRadius, ws.y);
            ctx.lineTo(ws.x + ws.width - effectiveRadius, ws.y);
            ctx.quadraticCurveTo(ws.x + ws.width, ws.y, ws.x + ws.width, ws.y + effectiveRadius);
            ctx.lineTo(ws.x + ws.width, ws.y + ws.height - effectiveRadius);
            ctx.quadraticCurveTo(ws.x + ws.width, ws.y + ws.height, ws.x + ws.width - effectiveRadius, ws.y + ws.height);
            ctx.lineTo(ws.x + effectiveRadius, ws.y + ws.height);
            ctx.quadraticCurveTo(ws.x, ws.y + ws.height, ws.x, ws.y + ws.height - effectiveRadius);
            ctx.lineTo(ws.x, ws.y + effectiveRadius);
            ctx.quadraticCurveTo(ws.x, ws.y, ws.x + effectiveRadius, ws.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    });
    ctx.restore();
}

function isNodeInAnyWorkspace(ball) {
    return window.workspaces.some(ws => ws.nodeIds.includes(ball.id));
}