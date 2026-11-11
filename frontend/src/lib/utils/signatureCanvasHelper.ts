export function getPointerPos(e: PointerEvent, targetCanvas: HTMLCanvasElement | null) {
    if (!targetCanvas) return { x: 0, y: 0 };
    const rect = targetCanvas.getBoundingClientRect();
    const scaleX = targetCanvas.width / (rect.width || 1);
    const scaleY = targetCanvas.height / (rect.height || 1);
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

export function drawStroke(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    color = "#4f46e5",
    lineWidth = 5
) {
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
}
