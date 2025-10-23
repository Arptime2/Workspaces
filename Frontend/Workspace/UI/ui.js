let scale = 1;
window.scale = scale;
let zooming = false;
let zoomInterval;
let zoomStartTime;
let baseFactor;

function startZoom(initialFactor) {
    if (zooming) return;
    zooming = true;
    baseFactor = initialFactor;
    zoomStartTime = Date.now();
    zoomInterval = setInterval(() => {
        const elapsed = (Date.now() - zoomStartTime) / 1000;
        const accel = initialFactor > 1 ? 0.05 : -0.05; // Positive for in, negative for out
        const currentFactor = baseFactor + elapsed * accel;
        adjustScale(currentFactor);
    }, 50);
}

function stopZoom() {
    if (zooming) {
        zooming = false;
        clearInterval(zoomInterval);
    }
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
    scale = newScale;
    window.scale = scale;
}

document.addEventListener('DOMContentLoaded', () => {
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'buttons';
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'zoom-btn';
    zoomInBtn.textContent = '+';
    zoomInBtn.onmousedown = () => startZoom(1.05);
    zoomInBtn.onmouseup = stopZoom;
    zoomInBtn.onmouseleave = stopZoom; // Stop if mouse leaves button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'zoom-btn';
    zoomOutBtn.textContent = '-';
    zoomOutBtn.onmousedown = () => startZoom(0.95);
    zoomOutBtn.onmouseup = stopZoom;
    zoomOutBtn.onmouseleave = stopZoom;
    buttonsDiv.appendChild(zoomInBtn);
    buttonsDiv.appendChild(zoomOutBtn);
    document.body.appendChild(buttonsDiv);
});