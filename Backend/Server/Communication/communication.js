// HTTP-based communication with simple API
let messageQueue = [];

// Handle POST /message from frontend
function handleMessage(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const message = data.message;
            // Call user-defined callback
            if (global.onMessageFromFrontend) {
                global.onMessageFromFrontend(message);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ response: 'Received' }));
        } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

// Handle GET /poll from frontend
function handlePoll(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: messageQueue }));
    messageQueue = []; // Clear after sending
}

// Handle POST /sendMessage to send message to frontend
function handleSendMessage(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            console.log('Backend sending to frontend:', data.message);
            global.sendToFrontend(data.message);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Message sent to frontend');
        } catch (error) {
            res.writeHead(400);
            res.end('Invalid JSON');
        }
    });
}

// API for easy communication
global.sendToFrontend = (message) => {
    messageQueue.push(message);
};

// User sets this callback
global.onMessageFromFrontend = null;

module.exports = { handleMessage, handlePoll, handleSendMessage };
