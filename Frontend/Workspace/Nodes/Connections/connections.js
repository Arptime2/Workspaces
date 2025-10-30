let firstNode = null;
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
        if (firstNode.outgoing.includes(secondNode.id)) {
            // Delete existing connection
            firstNode.outgoing = firstNode.outgoing.filter(id => id !== secondNode.id);
        } else {
            // Add new connection
            firstNode.outgoing.push(secondNode.id);
        }
    }
    firstNode = null;
    isConnecting = false;
    document.body.classList.remove('connecting');
}

function drawConnections(ctx) {
    window.balls.forEach(node => {
        node.outgoing.forEach(otherId => {
            const other = window.balls.find(b => b.id === otherId);
            if (other) {
                const angle = Math.atan2(other.y - node.y, other.x - node.x);
                const startX = node.x + node.radius * Math.cos(angle);
                const startY = node.y + node.radius * Math.sin(angle);
                const endX = other.x - other.radius * Math.cos(angle);
                const endY = other.y - other.radius * Math.sin(angle);
                drawLine(ctx, startX, startY, endX, endY, 'white', false);
                drawArrow(ctx, startX, startY, endX, endY);
            }
        });
    });
}

function drawSelectionLine(ctx) {
    if (isConnecting && firstNode) {
        const allConnections = getAllConnections();
        const closeSameDirection = allConnections.some(conn => conn.from === firstNode.id && isCloseToLine(currentMouseX, currentMouseY, window.balls.find(b => b.id === conn.from), window.balls.find(b => b.id === conn.to)));
        const color = closeSameDirection ? 'red' : 'white';
        drawLine(ctx, firstNode.x, firstNode.y, currentMouseX, currentMouseY, color, true);
    }
}

function drawLine(ctx, x1, y1, x2, y2, color, dotted) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 * (window.scale || 1);
    if (dotted) {
        ctx.setLineDash([5, 5]);
    } else {
        ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function getCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function drawArrow(ctx, x1, y1, x2, y2) {
    const headlen = 25 * (window.scale || 1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 6 * (window.scale || 1);
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

function getAllConnections() {
    let all = [];
    window.balls.forEach(node => {
        node.outgoing.forEach(id => {
            all.push({ from: node.id, to: id });
        });
    });
    return all;
}

document.addEventListener('mousemove', (e) => {
    currentMouseX = e.clientX;
    currentMouseY = e.clientY;
});