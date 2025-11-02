const fs = require('fs');
const path = require('path');

const WORKSPACES_PATH = path.join(__dirname, '../../Data/Workspaces');
const NODES_PATH = path.join(__dirname, '../../Data/Nodes');

function saveWorkspace(name, data) {
    console.log('Saving workspace:', name);
    const parsed = JSON.parse(data);
    const fileName = `${parsed.name}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function saveNode(name, data) {
    console.log('Saving node:', name);
    const parsed = JSON.parse(data);
    const fileName = `${parsed.name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    fs.writeFileSync(filePath, data);
}

function loadNode(name) {
    console.log('Loading node:', name);
    const fileName = `${name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Node file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_node:' + JSON.stringify({ id: name, data }));
    } else {
        console.log('Node file not found');
    }
}

function loadNodeByName(name) {
    console.log('Loading node by name:', name);
    loadNode(name);
}

function loadWorkspace(name, recursive = false) {
    console.log('Loading workspace:', name, recursive ? 'recursively' : '');
    const fileName = `${name}.json`;
    const filePath = path.join(WORKSPACES_PATH, fileName);
    if (fs.existsSync(filePath)) {
        console.log('Workspace file found, sending data');
        const data = fs.readFileSync(filePath, 'utf8');
        global.sendToFrontend('loaded_workspace:' + JSON.stringify({ id: name, data, recursive }));
    } else {
        console.log('Workspace file not found');
    }
}

function loadWorkspaceByName(name, recursive = false) {
    console.log('Loading workspace by name:', name, recursive ? 'recursively' : '');
    loadWorkspace(name, recursive);
}

module.exports = { saveWorkspace, saveNode, loadWorkspace, loadNode, loadWorkspaceByName, loadNodeByName };