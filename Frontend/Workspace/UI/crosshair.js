window.drawCrosshair = (ctx) => {
    const screenX = window.crosshairVirtualX - window.panOffsetX;
    const screenY = window.crosshairVirtualY - window.panOffsetY;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX - 10, screenY);
    ctx.lineTo(screenX + 10, screenY);
    ctx.moveTo(screenX, screenY - 10);
    ctx.lineTo(screenX, screenY + 10);
    ctx.stroke();
};