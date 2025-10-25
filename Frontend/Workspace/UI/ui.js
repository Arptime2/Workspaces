let scale = 1;
window.scale = scale;
window.zooming = false;
window.zoomStartTime;
window.baseFactor;

function zoomIn() {
    adjustScale(1.05);
}

function zoomOut() {
    adjustScale(0.95);
}

function adjustScale(factor) {
    const newScale = scale * factor;
    if (newScale < 0.1 || newScale > 5) return;
    const canvas = document.getElementById('canvas');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    balls.forEach(ball => {
        ball.x = (ball.x - centerX) * (newScale / scale) + centerX;
        ball.y = (ball.y - centerY) * (newScale / scale) + centerY;
        ball.radius *= newScale / scale;
    });
    scaleWorkspaces(centerX, centerY, newScale, scale);
    scale = newScale;
    window.scale = scale;
    if (window.editInput) {
        window.editInput.style.font = `${12 * window.scale}px Arial`;
        window.editInput.style.width = `${100 * window.scale}px`;
        window.editInput.style.verticalAlign = 'baseline';
        window.editInput.style.padding = '0';
        window.editInput.style.margin = '0';
    }
}

function startZoom(initialFactor) {
    if (window.zooming) return;
    window.zooming = true;
    window.baseFactor = initialFactor;
    window.zoomStartTime = Date.now();
}

function stopZoom() {
    window.zooming = false;
}

document.addEventListener('DOMContentLoaded', () => {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'buttons';
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'zoom-btn';
    zoomInBtn.textContent = '+';
    zoomInBtn.onmousedown = () => startZoom(1.02);
    zoomInBtn.onmouseup = stopZoom;
    zoomInBtn.onmouseleave = stopZoom; // Stop if mouse leaves button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'zoom-btn';
    zoomOutBtn.textContent = '-';
    zoomOutBtn.onmousedown = () => startZoom(0.98);
    zoomOutBtn.onmouseup = stopZoom;
    zoomOutBtn.onmouseleave = stopZoom;
    buttonsDiv.appendChild(zoomInBtn);
    buttonsDiv.appendChild(zoomOutBtn);
    document.body.appendChild(buttonsDiv);
});