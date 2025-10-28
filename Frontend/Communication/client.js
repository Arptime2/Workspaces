// Client-side communication with backend
let messageQueue = [];
let pollInterval;

window.sendToBackend = async (message) => {
    try {
        const response = await fetch('/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
    } catch (error) {
        console.error('Error sending to backend:', error);
    }
};

window.onMessageFromBackend = (message) => {
    console.log('Original onMessageFromBackend called with:', message);
    // Default handler, can be overridden
};

const pollMessages = async () => {
    console.log('Polling for messages...');
    try {
        const response = await fetch('/poll');
        const data = await response.json();
        console.log('Poll response:', data);
        if (data.messages && data.messages.length > 0) {
            console.log('Received messages from backend:', data.messages);
            data.messages.forEach(msg => {
                if (window.onMessageFromBackend) {
                    window.onMessageFromBackend(msg);
                }
            });
        }
    } catch (error) {
        console.error('Error polling messages:', error);
    }
};

const startPolling = () => {
    pollInterval = setInterval(pollMessages, 1000);
};

const stopPolling = () => {
    if (pollInterval) {
        clearInterval(pollInterval);
    }
};

// Start polling on load
startPolling();