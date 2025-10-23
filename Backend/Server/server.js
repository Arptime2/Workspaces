const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleMessage, handlePoll, handleSendMessage } = require('./Communication/communication');

// Set up backend message handling
global.onMessageFromFrontend = (message) => {
    console.log('Processing message from frontend:', message);
    // Example: send a message to frontend (disabled for test)
    // global.sendToFrontend('Processed: ' + message);
};

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/message') {
        handleMessage(req, res);
        return;
    }
    if (req.method === 'GET' && req.url === '/poll') {
        handlePoll(req, res);
        return;
    }
    if (req.method === 'POST' && req.url === '/sendMessage') {
        handleSendMessage(req, res);
        return;
    }
    let filePath;
    if (req.url.startsWith('/Communication')) {
        filePath = path.join(__dirname, '../../Frontend', req.url);
    } else {
        filePath = path.join(__dirname, '../../Frontend/Workspace', req.url === '/' ? 'index.html' : req.url);
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, {'Content-Type': getContentType(filePath)});
        res.end(data);
    });
});

function getContentType(filePath) {
    const ext = path.extname(filePath);
    switch (ext) {
        case '.html': return 'text/html';
        case '.css': return 'text/css';
        case '.js': return 'text/javascript';
        default: return 'text/plain';
    }
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
