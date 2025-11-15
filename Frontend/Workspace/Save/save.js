function createNewNode(x = 100, y = 100, radius = 20, id, name = 'New Node', description = 'A newly created node', color = 'lightblue', labels = [], outgoing = [], systemPrompt = '', prompt = '', tokenCount = 0, contextLabels = [], contextCount = 0, nodeType = 'default') {
    const actualId = id && !window.balls.find(b => b.id === id) ? id : window.nextId++;
    console.log('Creating node at', x, y, 'id:', actualId);
    const newNode = new Node(x, y, radius, actualId);
    newNode.name = name;
    newNode.description = description;
    newNode.color = color;
    newNode.labels = labels;
    newNode.outgoing = outgoing;
    newNode.systemPrompt = systemPrompt;
    newNode.prompt = prompt;
    newNode.tokenCount = tokenCount;
    newNode.contextLabels = contextLabels;
    newNode.contextCount = contextCount;
    newNode.nodeType = nodeType;
    window.balls.push(newNode);
    console.log('Node created and pushed, balls length:', window.balls.length);
    return actualId;
}

function createNewWorkspace(x = 100, y = 100, width = 100, height = 100, id, name = 'New Workspace', description = 'A newly created workspace', nodeIds = [], workspaceIds = []) {
    const actualId = id && !window.workspaces.find(w => w.id === id) ? id : window.nextWorkspaceId++;
    console.log('Creating workspace at', x, y, 'id:', actualId, 'nodeIds:', nodeIds, 'workspaceIds:', workspaceIds);
    const newWorkspace = new Workspace(x, y, width, height, actualId, name, description, nodeIds, workspaceIds);
    newWorkspace.closed = false;
    window.workspaces.push(newWorkspace);
    console.log('Workspace created and pushed, workspaces length:', window.workspaces.length);
    return actualId;
}

function saveWorkspace(workspaceName) {
    const workspace = window.workspaces.find(ws => ws.name === workspaceName);
    if (!workspace) {
        console.error('Workspace not found:', workspaceName);
        return;
    }
    const data = {
        x: workspace.x,
        y: workspace.y,
        width: workspace.width,
        height: workspace.height,
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        nodeIds: workspace.nodeIds.map(id => { const ball = window.balls.find(b => b.id === id); return ball ? { id: ball.id, name: ball.name, x: ball.x, y: ball.y } : null; }).filter(Boolean),
        workspaceIds: workspace.workspaceIds.map(id => { const ws = window.workspaces.find(w => w.id === id); return ws ? { id: ws.id, name: ws.name, x: ws.x, y: ws.y } : null; }).filter(Boolean),
        closed: workspace.closed
    };
    const jsonString = JSON.stringify(data, null, 2);
    window.sendToBackend('save_workspace:' + JSON.stringify({ name: workspaceName, data: jsonString }));
}

function saveNode(nodeName) {
    const node = window.balls.find(ball => ball.name === nodeName);
    if (!node) {
        console.error('Node not found:', nodeName);
        return;
    }
    const data = {
        x: node.x,
        y: node.y,
        radius: node.radius,
        id: node.id,
        name: node.name,
        description: node.description,
        color: node.color,
        labels: node.labels,
        outgoing: node.outgoing,
        systemPrompt: node.systemPrompt,
        prompt: node.prompt,
        tokenCount: node.tokenCount,
        contextLabels: node.contextLabels,
        contextCount: node.contextCount,
        nodeType: node.nodeType
    };
    const jsonString = JSON.stringify(data, null, 2);
    window.sendToBackend('save_node:' + JSON.stringify({ name: nodeName, data: jsonString }));
}

window.pendingLoads = new Map();

function loadNode(nameOrId) {
    console.log('Loading node:', nameOrId);
    return new Promise((resolve) => {
        window.pendingLoads.set(String(nameOrId), resolve);
        window.sendToBackend('load_node:' + nameOrId);
        console.log('Sent load_node request for:', nameOrId);
    });
}

function loadWorkspace(workspaceName, recursive = false) {
    console.log('Loading workspace:', workspaceName, recursive ? 'recursively' : '');
    return new Promise((resolve) => {
        window.pendingLoads.set(workspaceName, resolve);
        window.sendToBackend('load_workspace:' + JSON.stringify({name: workspaceName, recursive}));
        console.log('Sent load_workspace request for:', workspaceName, 'recursive:', recursive);
    });
}

async function loadWorkspaceNewVersion(workspaceName, x = 100, y = 100) {
    window.repositionTarget = { name: workspaceName, x, y };
    await loadWorkspace(workspaceName, true);
}

window.handleLoadedMessage = async function(message) {
    console.log('handleLoadedMessage called with:', message);
    if (message.startsWith('loaded_node:')) {
        const payload = JSON.parse(message.slice('loaded_node:'.length));
        console.log('Loaded node data for:', payload.id);
        const data = JSON.parse(payload.data);
        if (window.replacingNode && data.name === window.replacingNode.newName) {
            // Replace the old node with the loaded one
            const oldNode = window.replacingNode.oldNode;
            // Delete old node
            window.balls = window.balls.filter(ball => ball !== oldNode);
            // Remove connections to old node
            window.balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => id !== oldNode.id);
            });
            // Update workspaces
            window.workspaces.forEach(ws => {
                if (ws.nodeIds.includes(oldNode.id)) {
                    ws.nodeIds = ws.nodeIds.filter(id => id !== oldNode.id);
                    updateWorkspaceSize(ws);
                }
            });
            // Place loaded node at old position
            data.x = oldNode.x;
            data.y = oldNode.y;
            // Create the node
            const actualId = createNewNode(data.x, data.y, data.radius, data.id, data.name, data.description, data.color, data.labels, data.outgoing, data.systemPrompt, data.prompt, data.tokenCount, data.contextLabels, data.contextCount, data.nodeType);
            // Update workspaces for new node
            window.workspaces.forEach(ws => {
                if (isNodeInWorkspace(window.balls.find(b => b.id === actualId), ws) && !isNodeInAnyWorkspace(window.balls.find(b => b.id === actualId))) {
                    ws.nodeIds.push(actualId);
                    updateWorkspaceSize(ws);
                }
            });
            window.replacingNode = null;
            if (window.renameTimeout) {
                clearTimeout(window.renameTimeout);
                window.renameTimeout = null;
            }
            return;
        }
        if (window.currentOffset) {
            data.x += window.currentOffset.offsetX;
            data.y += window.currentOffset.offsetY;
        }
        // Removed panOffset additions for fixed coordinates
        data.outgoing = data.outgoing; // already ids
        const actualId = createNewNode(data.x, data.y, data.radius, data.id, data.name, data.description, data.color, data.labels, data.outgoing, data.systemPrompt, data.prompt, data.tokenCount, data.contextLabels, data.contextCount, data.nodeType);
        const keys = [data.name, String(payload.id)];
        keys.forEach(key => {
            const resolve = window.pendingLoads.get(key);
            if (resolve) {
                resolve(actualId);
            }
        });
    } else if (message.startsWith('loaded_workspace:')) {
        const payload = JSON.parse(message.slice('loaded_workspace:'.length));
        console.log('Loaded workspace data for:', payload.id);
        const data = JSON.parse(payload.data);
        console.log('Received loaded_workspace for:', data.name, 'recursive:', payload.recursive);
        if (window.replacingWorkspace && data.name === window.replacingWorkspace.newName) {
            // Replace the old workspace with the loaded one
            const oldWorkspace = window.replacingWorkspace.oldWorkspace;
            // Set reposition target to center the new workspace in the old workspace's area, in screen coordinates
            const centeredWorldX = oldWorkspace.x + (oldWorkspace.width - data.width) / 2;
            const centeredWorldY = oldWorkspace.y + (oldWorkspace.height - data.height) / 2;
            window.repositionTarget = { name: data.name, x: centeredWorldX - window.panOffsetX, y: centeredWorldY - window.panOffsetY };
            // Delete old workspace and all children
            const toDelete = getAllChildWorkspaces(oldWorkspace);
            toDelete.push(oldWorkspace);
            window.workspaces = window.workspaces.filter(ws => !toDelete.includes(ws));
            // Delete nodes in them
            const nodesToDelete = [];
            toDelete.forEach(ws => {
                ws.nodeIds.forEach(id => {
                    if (!nodesToDelete.includes(id)) nodesToDelete.push(id);
                });
            });
            window.balls = window.balls.filter(ball => !nodesToDelete.includes(ball.id));
            // Remove connections to deleted nodes
            window.balls.forEach(ball => {
                ball.outgoing = ball.outgoing.filter(id => !nodesToDelete.includes(id));
            });
            // Update remaining workspaces
            window.workspaces.forEach(ws => {
                ws.nodeIds = ws.nodeIds.filter(id => !nodesToDelete.includes(id));
                ws.workspaceIds = ws.workspaceIds.filter(id => !toDelete.some(del => del.id === id));
                updateWorkspaceSize(ws);
            });
            window.replacingWorkspace = null;
            if (window.renameTimeout) {
                clearTimeout(window.renameTimeout);
                window.renameTimeout = null;
            }
        }
        if (window.repositionTarget && data.name === window.repositionTarget.name) {
            const offsetX = window.repositionTarget.x - data.x;
            const offsetY = window.repositionTarget.y - data.y;
            window.currentOffset = { offsetX, offsetY };
            data.x = window.repositionTarget.x;
            data.y = window.repositionTarget.y;
            window.repositionTarget = null;
        } else if (window.currentOffset) {
            data.x += window.currentOffset.offsetX;
            data.y += window.currentOffset.offsetY;
        }
        // Removed panOffset additions for fixed coordinates
        if (payload.recursive) {
            console.log('About to load nodes:', data.nodeIds);
            const loadedNodeIds = await Promise.all(data.nodeIds.map(async (item) => {
                const id = await loadNode(item.name);
                const ball = window.balls.find(b => b.id === id);
                if (ball) {
                    ball.x = item.x + (window.currentOffset?.offsetX || 0);
                    ball.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            console.log('Loaded node ids:', loadedNodeIds);
            console.log('About to load workspaces:', data.workspaceIds);
            const loadedWorkspaceIds = await Promise.all(data.workspaceIds.map(async (item) => {
                const id = await loadWorkspace(item.name, true);
                const ws = window.workspaces.find(w => w.id === id);
                if (ws) {
                    ws.x = item.x + (window.currentOffset?.offsetX || 0);
                    ws.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            console.log('Loaded workspace ids:', loadedWorkspaceIds);
            // Removed panOffset additions for fixed coordinates
            data.nodeIds = loadedNodeIds;
            data.workspaceIds = loadedWorkspaceIds;
            console.log('Creating workspace with nodeIds:', data.nodeIds, 'workspaceIds:', data.workspaceIds);
            const actualId = createNewWorkspace(data.x, data.y, data.width, data.height, data.id, data.name, data.description, data.nodeIds, data.workspaceIds);
            console.log('Workspace created, id:', actualId);
            const ws = window.workspaces[window.workspaces.length - 1];
            updateWorkspaceSize(ws);
            const keys = [data.name];
            keys.forEach(key => {
                const resolve = window.pendingLoads.get(key);
                if (resolve) {
                    resolve(actualId);
                }
            });
        } else {
            // Removed panOffset additions for fixed coordinates
            const loadedNodeIds = await Promise.all(data.nodeIds.map(async (item) => {
                const id = await loadNode(item.name);
                const ball = window.balls.find(b => b.id === id);
                if (ball) {
                    ball.x = item.x + (window.currentOffset?.offsetX || 0);
                    ball.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return id;
            }));
            data.nodeIds = loadedNodeIds;
            data.workspaceIds = data.workspaceIds.map(item => {
                const ws = window.workspaces.find(w => w.name === item.name);
                if (ws) {
                    ws.x = item.x + (window.currentOffset?.offsetX || 0);
                    ws.y = item.y + (window.currentOffset?.offsetY || 0);
                }
                return ws?.id;
            }).filter(Boolean);
            const actualId = createNewWorkspace(data.x, data.y, data.width, data.height, data.id, data.name, data.description, data.nodeIds, data.workspaceIds);
            const ws = window.workspaces[window.workspaces.length - 1];
            updateWorkspaceSize(ws);
            const keys = [data.name];
            keys.forEach(key => {
                const resolve = window.pendingLoads.get(key);
                if (resolve) {
                    resolve(actualId);
                }
            });
        }
    }
};



function saveWorkspaceById(id) {
    const workspace = window.workspaces.find(ws => ws.id === id);
    if (workspace) {
        saveWorkspace(workspace.name);
    } else {
        console.error('Workspace not found for save:', id);
    }
}

function recreateWorkspaceFromData(data, x, y) {
    const parsed = JSON.parse(data);
    // Create workspace at specified position
    const wsId = createNewWorkspace(x, y, parsed.width, parsed.height, parsed.id, parsed.name, parsed.description, [], []);
    const ws = window.workspaces.find(w => w.id === wsId);
    // Create nodes
    parsed.nodeIds.forEach(item => {
        const nodeData = window.saveFiles.nodes.find(n => JSON.parse(n.data).id === item.id);
        if (nodeData) {
            const nodeParsed = JSON.parse(nodeData.data);
            const nodeX = x + (item.x - parsed.x);
            const nodeY = y + (item.y - parsed.y);
            const nodeId = createNewNode(nodeX, nodeY, nodeParsed.radius, nodeParsed.id, nodeParsed.name, nodeParsed.description, nodeParsed.color, nodeParsed.labels, nodeParsed.outgoing, nodeParsed.systemPrompt, nodeParsed.prompt, nodeParsed.tokenCount, nodeParsed.contextLabels, nodeParsed.contextCount, nodeParsed.nodeType);
            ws.nodeIds.push(nodeId);
        }
    });
    // Create sub-workspaces recursively
    parsed.workspaceIds.forEach(item => {
        const subData = window.saveFiles.workspaces.find(w => JSON.parse(w.data).id === item.id);
        if (subData) {
            const subX = x + (item.x - parsed.x);
            const subY = y + (item.y - parsed.y);
            const subId = recreateWorkspaceFromData(subData.data, subX, subY);
            ws.workspaceIds.push(subId);
        }
    });
    updateWorkspaceSize(ws);
    return wsId;
}

// Every 2 seconds, reload all topmost parent workspaces
setInterval(() => {
    console.log('Starting reload of topmost workspaces');
    const topmost = window.workspaces.filter(ws => !window.workspaces.some(other => other.workspaceIds.includes(ws.id)));
    topmost.forEach(ws => {
        const saveData = window.saveFiles.workspaces.find(w => {
            const parsed = JSON.parse(w.data);
            return parsed.id === ws.id;
        });
        if (saveData) {
            console.log('Reloading workspace:', ws.name, 'id:', ws.id);
            // Get all child workspaces and nodes to delete
            const allChildWs = getAllChildWorkspaces(ws);
            allChildWs.push(ws); // include self
            const allChildNodes = getAllChildNodes(ws);
            // Remove from arrays
            window.workspaces = window.workspaces.filter(w => !allChildWs.includes(w));
            window.balls = window.balls.filter(b => !allChildNodes.includes(b));
            // Recreate instantly
            recreateWorkspaceFromData(saveData.data, ws.x, ws.y);
            console.log('Reloaded workspace:', ws.name);
        } else {
            console.log('No save data found for workspace:', ws.name, 'id:', ws.id);
        }
    });
    console.log('Reload cycle complete');
}, 2000);