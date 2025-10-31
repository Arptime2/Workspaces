const fs = require('fs');
const path = require('path');

const WORKSPACES_PATH = path.join(__dirname, '../../Data/Workspaces');
const NODES_PATH = path.join(__dirname, '../../Data/Nodes');

function saveWorkspace(name, data) {
    console.log('Saving workspace:', name);
    const parsed = JSON.parse(data);
    const fileName = `workspaces_${parsed.id}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function saveNode(name, data) {
    console.log('Saving node:', name);
    const parsed = JSON.parse(data);
    const fileName = `nodes_${parsed.id}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function loadNode(id) {
    console.log('Loading node:', id);
    const fileName = `nodes_${id}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Node file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_node:' + JSON.stringify({ id, data }));
    } else {
        console.log('Node file not found');
    }
}

function loadNodeByName(name) {
    console.log('Loading node by name:', name);
    const files = fs.readdirSync(NODES_PATH);
    for (const file of files) {
        if (file.startsWith('nodes_') && file.endsWith('.json')) {
            const filePath = path.join(NODES_PATH, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed.name === name) {
                global.sendToFrontend('loaded_node:' + JSON.stringify({ id: parsed.id, data }));
                return;
            }
        }
    }
    console.log('Node file not found for name:', name);
}

function loadWorkspace(id, recursive = false) {
    console.log('Loading workspace:', id, recursive ? 'recursively' : '');
    const fileName = `workspaces_${id}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Workspace file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_workspace:' + JSON.stringify({ id, data, recursive }));
    } else {
        console.log('Workspace file not found');
    }
}

function loadWorkspaceByName(name, recursive = false) {
    console.log('Loading workspace by name:', name, recursive ? 'recursively' : '');
    const files = fs.readdirSync(WORKSPACES_PATH);
    for (const file of files) {
        if (file.startsWith('workspaces_') && file.endsWith('.json')) {
            const filePath = path.join(WORKSPACES_PATH, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed.name === name) {
                global.sendToFrontend('loaded_workspace:' + JSON.stringify({ id: parsed.id, data, recursive }));
                return;
            }
        }
    }
    console.log('Workspace file not found for name:', name);
}

module.exports = { saveWorkspace, saveNode, loadWorkspace, loadNode, loadWorkspaceByName, loadNodeByName };