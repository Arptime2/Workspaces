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
    // Update references in other workspaces
    const workspaceName = parsed.name;
    parsed.nodeIds.forEach(item => updateWorkspaceReferences(item.name, 'node', item.x, item.y, workspaceName));
    parsed.workspaceIds.forEach(item => updateWorkspaceReferences(item.name, 'workspace', item.x, item.y, workspaceName));
}

function saveNode(name, data) {
    console.log('Saving node:', name);
    const parsed = JSON.parse(data);
    const fileName = `${parsed.name}.json`;
    const filePath = path.join(NODES_PATH, fileName);
    fs.writeFileSync(filePath, data);
    // Update references in workspaces
    updateWorkspaceReferences(parsed.name, 'node', parsed.x, parsed.y);
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

function updateWorkspaceReferences(itemName, itemType, newX, newY, excludeWorkspaceName = null) {
    const files = fs.readdirSync(WORKSPACES_PATH);
    for (const file of files) {
        if (file.endsWith('.json')) {
            const workspaceName = file.slice(0, -5); // remove .json
            if (excludeWorkspaceName && workspaceName === excludeWorkspaceName) continue;
            const filePath = path.join(WORKSPACES_PATH, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let updated = false;
            if (itemType === 'node' && data.nodeIds) {
                data.nodeIds.forEach(item => {
                    if (item.name === itemName) {
                        item.x = newX;
                        item.y = newY;
                        updated = true;
                    }
                });
            } else if (itemType === 'workspace' && data.workspaceIds) {
                data.workspaceIds.forEach(item => {
                    if (item.name === itemName) {
                        item.x = newX;
                        item.y = newY;
                        updated = true;
                    }
                });
            }
            if (updated) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        }
    }
}

module.exports = { saveWorkspace, saveNode, loadWorkspace, loadNode, loadWorkspaceByName, loadNodeByName, updateWorkspaceReferences };