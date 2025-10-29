const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleMessage, handlePoll, handleSendMessage } = require('./Communication/communication');
const { spawnShell } = require('../Terminal/terminal');
const { saveWorkspace, saveNode } = require('../Save/save');

function parseMessage(message, prefix) {
    return message.slice(prefix.length);
}

function initializeShell() {
    global.shellProcess = spawnShell();
    const sendOutput = (data) => global.sendToFrontend('output:' + data.toString());
    global.shellProcess.stdout.on('data', sendOutput);
    global.shellProcess.stderr.on('data', sendOutput);
    global.shellProcess.on('close', () => {
        global.sendToFrontend('command_done');
        global.shellProcess = null;
    });
}

// Set up backend message handling
global.onMessageFromFrontend = (message) => {
    if (message.startsWith('execute:')) {
        const command = parseMessage(message, 'execute:') + '\n';
        if (!global.shellProcess) initializeShell();
        global.shellProcess.stdin.write(command);
    } else if (message.startsWith('input:')) {
        const input = parseMessage(message, 'input:') + '\n';
        if (global.shellProcess) global.shellProcess.stdin.write(input);
    } else if (message.startsWith('save_workspace:')) {
        const payload = JSON.parse(message.slice('save_workspace:'.length));
        saveWorkspace(payload.name, payload.data);
    } else if (message.startsWith('save_node:')) {
        const payload = JSON.parse(message.slice('save_node:'.length));
        saveNode(payload.name, payload.data);
    }
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

server.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://0.0.0.0:3000');
});
