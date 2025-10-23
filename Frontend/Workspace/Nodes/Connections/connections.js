let firstNode = null;
let connections = [];
let isConnecting = false;
let currentMouseX = 0;
let currentMouseY = 0;

function handleConnectionClick(ball) {
    if (isConnecting) {
        finishConnection(ball);
    } else {
        startConnection(ball);
    }
}

function startConnection(node) {
    firstNode = node;
    isConnecting = true;
    document.body.classList.add('connecting');
}

function finishConnection(secondNode) {
    if (secondNode === firstNode) {
        // Cancel
    } else {
        const existingConnection = connections.find(conn => conn.from === firstNode.id && conn.to === secondNode.id);
        if (existingConnection) {
            // Delete existing connection in same direction
            connections = connections.filter(conn => conn !== existingConnection);
        } else {
            // Add new connection
            connections.push({ from: firstNode.id, to: secondNode.id });
        }
    }
    firstNode = null;
    isConnecting = false;
    document.body.classList.remove('connecting');
}

function drawConnections(ctx) {
    connections.forEach(conn => {
        const from = balls.find(b => b.id === conn.from);
        const to = balls.find(b => b.id === conn.to);
        if (from && to) {
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const startX = from.x + from.radius * Math.cos(angle);
            const startY = from.y + from.radius * Math.sin(angle);
            const endX = to.x - to.radius * Math.cos(angle);
            const endY = to.y - to.radius * Math.sin(angle);
            drawLine(ctx, startX, startY, endX, endY, '--connection-line-color', false);
            drawArrow(ctx, startX, startY, endX, endY);
        }
    });
}

function drawSelectionLine(ctx) {
    if (isConnecting && firstNode) {
        const closeSameDirection = connections.some(conn => conn.from === firstNode.id && isCloseToLine(currentMouseX, currentMouseY, balls.find(b => b.id === conn.from), balls.find(b => b.id === conn.to)));
        const colorVar = closeSameDirection ? '--connection-delete-color' : '--connection-dotted-color';
        drawLine(ctx, firstNode.x, firstNode.y, currentMouseX, currentMouseY, colorVar, true);
    }
}

function getCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function drawLine(ctx, x1, y1, x2, y2, color, dotted) {
    ctx.strokeStyle = getCSSVar(color);
    ctx.lineWidth = parseInt(getCSSVar('--connection-line-width')) * (window.scale || 1);
    if (dotted) {
        const dash = parseInt(getCSSVar('--connection-dash-length'));
        ctx.setLineDash([dash, dash]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const headlen = parseInt(getCSSVar('--connection-arrow-size')) * (window.scale || 1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = getCSSVar('--connection-arrow-color');
    ctx.lineWidth = parseInt(getCSSVar('--connection-line-width')) * (window.scale || 1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function isCloseToLine(px, py, from, to) {
    if (!from || !to) return false;
    const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y;
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 10; // Threshold
}

document.addEventListener('mousemove', (e) => {
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;
});