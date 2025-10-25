class Workspace {
    constructor(x, y, width, height, id, name, description, nodeIds) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.id = id;
        this.name = name || 'Workspace ' + id;
        this.description = description || '';
        this.nodeIds = nodeIds || [];
    }
}

let workspaces = [];
let nextWorkspaceId = 0;
let draggedWorkspace = null;
let draggedNodes = [];
let workspaceStartX, workspaceStartY, workspaceEndX, workspaceEndY;

function drawWorkspaces(ctx) {
    workspaces.forEach(ws => {
        drawRoundedRect(ctx, ws.x, ws.y, ws.width, ws.height);
    });
    if (window.isDefiningWorkspace) {
        const x = Math.min(workspaceStartX, workspaceEndX);
        const y = Math.min(workspaceStartY, workspaceEndY);
        const w = Math.abs(workspaceEndX - workspaceStartX);
        const h = Math.abs(workspaceEndY - workspaceStartY);
        drawRoundedRect(ctx, x, y, w, h);
    }
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
    ctx.stroke();
}

function handleWorkspaceMouseDown(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    for (let ws of workspaces) {
        if (mouseX >= ws.x && mouseX <= ws.x + ws.width && mouseY >= ws.y && mouseY <= ws.y + ws.height) {
            return ws;
        }
    }
    return null;
}

function isNodeInWorkspace(ball, ws) {
    return ball.x >= ws.x && ball.x <= ws.x + ws.width && ball.y >= ws.y && ball.y <= ws.y + ws.height;
}

function handleWorkspaceMouseMove(deltaX, deltaY) {
    if (draggedWorkspace) {
        draggedWorkspace.x += deltaX;
        draggedWorkspace.y += deltaY;
        // Move only the initially contained nodes
        draggedNodes.forEach(ball => {
            ball.x += deltaX;
            ball.y += deltaY;
        });
    }
}

function panWorkspaces(deltaX, deltaY) {
    workspaces.forEach(ws => {
        ws.x += deltaX;
        ws.y += deltaY;
    });
}

function scaleWorkspaces(centerX, centerY, newScale, oldScale) {
    workspaces.forEach(ws => {
        ws.x = (ws.x - centerX) * (newScale / oldScale) + centerX;
        ws.y = (ws.y - centerY) * (newScale / oldScale) + centerY;
        ws.width *= newScale / oldScale;
        ws.height *= newScale / oldScale;
    });
}

function updateWorkspaceSize(ws) {
    const nodes = balls.filter(ball => ws.nodeIds.includes(ball.id));
    if (nodes.length === 0) {
        // If no nodes, set minimal size or remove, but for now keep as is
        return;
    }
    const minX = Math.min(...nodes.map(n => n.x)) - 50;
    const maxX = Math.max(...nodes.map(n => n.x)) + 50;
    const minY = Math.min(...nodes.map(n => n.y)) - 50;
    const maxY = Math.max(...nodes.map(n => n.y)) + 50;
    ws.x = minX;
    ws.y = minY;
    ws.width = maxX - minX;
    ws.height = maxY - minY;
}