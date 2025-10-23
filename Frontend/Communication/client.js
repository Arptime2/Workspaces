// HTTP-based communication with backend

// API for easy communication
window.sendToBackend = async (message) => {
    await fetch('/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });
};

// Poll for messages from backend
setInterval(async () => {
    try {
        const response = await fetch('/poll');
        const data = await response.json();
        data.messages.forEach(msg => {
            if (window.onMessageFromBackend) {
                window.onMessageFromBackend(msg);
            }
        });
    } catch (error) {
        // Ignore polling errors
    }
}, 1000); // Poll every second

// User sets this callback
window.onMessageFromBackend = null;
