// Frontend auto-save logic
let saveTimeout;

function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveWorkspaces();
    }, 1000); // Debounce save by 1 second
}

function saveWorkspaces() {
    const data = {
        workspaces: window.workspaces.map(ws => ({...ws})),
        balls: window.balls.map(ball => ({...ball})),
        scale: window.scale,
        panOffsetX: window.panOffsetX,
        panOffsetY: window.panOffsetY
    };
    // Convert to virtual positions
    data.workspaces.forEach(ws => {
        ws.x = (ws.x - data.panOffsetX) / data.scale;
        ws.y = (ws.y - data.panOffsetY) / data.scale;
        ws.width /= data.scale;
        ws.height /= data.scale;
    });
    data.balls.forEach(ball => {
        ball.x = (ball.x - data.panOffsetX) / data.scale;
        ball.y = (ball.y - data.panOffsetY) / data.scale;
        ball.radius /= data.scale;
    });
    window.sendToBackend(JSON.stringify({type: 'save', data}));
}

function reconstructWorkspace(ws, data) {
    const isVirtual = !!data.scale; // New format has scale, old doesn't
    console.log('Starting reconstruct, isVirtual:', isVirtual, 'current balls/workspaces:', window.balls.length, window.workspaces.length, 'window scale/pan:', window.scale, window.panOffsetX, window.panOffsetY);
    // Update workspace properties, but keep id and name
    const keepProps = ['id', 'name'];
    Object.keys(data.workspace).forEach(key => {
        if (!keepProps.includes(key)) {
            if (isVirtual) {
                ws[key] = data.workspace[key] * window.scale + (key === 'x' ? window.panOffsetX : key === 'y' ? window.panOffsetY : 0);
                if (key === 'width' || key === 'height') ws[key] *= window.scale;
            } else {
                ws[key] = data.workspace[key]; // Absolute positions
            }
        }
    });
    console.log('WS position set to:', ws.x, ws.y, 'size:', ws.width, ws.height);

    // Remove current child nodes
    const oldBalls = window.balls.length;
    window.balls = window.balls.filter(ball => !ws.nodeIds.includes(ball.id));
    console.log('Removed old nodes:', oldBalls - window.balls.length);

    // Remove current sub-workspaces recursively
    const currentSubs = getAllChildWorkspaces(ws);
    console.log('Current subs to remove:', currentSubs.map(s => s.id));
    const oldWs = window.workspaces.length;
    window.workspaces = window.workspaces.filter(w => !currentSubs.includes(w) && w !== ws);
    console.log('Removed old workspaces:', oldWs - window.workspaces.length);
    // Also remove their nodes
    currentSubs.forEach(sub => {
        const before = window.balls.length;
        window.balls = window.balls.filter(ball => !sub.nodeIds.includes(ball.id));
        console.log('Removed nodes from sub ws:', before - window.balls.length);
    });

    // Clear ids
    ws.nodeIds = [];
    ws.workspaceIds = [];

    // Maps for old to new ids
    const workspaceIdMap = new Map();
    const nodeIdMap = new Map();

    // Add sub-workspaces with new ids
    data.subWorkspaces.forEach((wsData, i) => {
        const newId = window.nextWorkspaceId++;
        console.log('Adding sub-ws', i, 'old id', wsData.id, 'new id', newId);
        let newWs;
        if (isVirtual) {
            newWs = new Workspace(
                wsData.x * window.scale + window.panOffsetX,
                wsData.y * window.scale + window.panOffsetY,
                wsData.width * window.scale,
                wsData.height * window.scale,
                newId, wsData.name, wsData.description, [], []
            );
        } else {
            newWs = new Workspace(wsData.x, wsData.y, wsData.width, wsData.height, newId, wsData.name, wsData.description, [], []);
        }
        window.workspaces.push(newWs);
        workspaceIdMap.set(wsData.id, newId);
    });
    console.log('Added sub-workspaces, map:', Array.from(workspaceIdMap.entries()));

    // Update workspaceIds for all added workspaces
    data.subWorkspaces.forEach(wsData => {
        const newId = workspaceIdMap.get(wsData.id);
        const newWs = window.workspaces.find(w => w.id === newId);
        newWs.workspaceIds = wsData.workspaceIds.map(oldId => workspaceIdMap.get(oldId)).filter(id => id !== undefined);
        console.log('Updated sub-ws', newId, 'workspaceIds:', newWs.workspaceIds);
    });

    // Update main ws workspaceIds
    ws.workspaceIds = data.workspace.workspaceIds.map(oldId => workspaceIdMap.get(oldId)).filter(id => id !== undefined);
    console.log('Updated main WS workspaceIds:', ws.workspaceIds);

    // Add nodes with new ids
    data.nodes.forEach((nodeData, i) => {
        const newId = window.nextId++;
        console.log('Adding node', i, 'old id', nodeData.id, 'new id', newId, 'pos:', nodeData.x, nodeData.y);
        let newNode;
        if (isVirtual) {
            newNode = new Node(
                nodeData.x * window.scale + window.panOffsetX,
                nodeData.y * window.scale + window.panOffsetY,
                nodeData.radius * window.scale,
                newId
            );
        } else {
            newNode = new Node(nodeData.x, nodeData.y, nodeData.radius, newId);
        }
        Object.assign(newNode, nodeData);
        newNode.id = newId;
        window.balls.push(newNode);
        nodeIdMap.set(nodeData.id, newId);
        if (i === 0) console.log('First node added at:', newNode.x, newNode.y, 'radius:', newNode.radius);
    });
    console.log('Added nodes, map:', Array.from(nodeIdMap.entries()));

    // Update nodeIds for main ws
    ws.nodeIds = data.workspace.nodeIds.map(oldId => nodeIdMap.get(oldId)).filter(id => id !== undefined);
    console.log('Updated main WS nodeIds:', ws.nodeIds);

    // Update nodeIds for sub workspaces
    data.subWorkspaces.forEach(wsData => {
        const newId = workspaceIdMap.get(wsData.id);
        const newWs = window.workspaces.find(w => w.id === newId);
        newWs.nodeIds = wsData.nodeIds.map(oldId => nodeIdMap.get(oldId)).filter(id => id !== undefined);
        console.log('Updated sub-ws', newId, 'nodeIds:', newWs.nodeIds);
    });

    // Update outgoing connections for all nodes
    window.balls.forEach(ball => {
        if (ball.outgoing && ball.outgoing.length > 0) {
            const oldOutgoing = [...ball.outgoing];
            ball.outgoing = ball.outgoing.map(oldId => nodeIdMap.get(oldId)).filter(id => id !== undefined);
            console.log('Updated outgoing for node', ball.id, 'from', oldOutgoing, 'to', ball.outgoing);
        }
    });

    // Update sizes
    updateWorkspaceSize(ws);
    ws.workspaceIds.forEach(id => {
        const sub = window.workspaces.find(w => w.id === id);
        if (sub) updateWorkspaceSize(sub);
    });
    console.log('Updated sizes');
    console.log('Final state: balls.length =', window.balls.length, 'workspaces.length =', window.workspaces.length);
    console.log('Final WS:', {id: ws.id, name: ws.name, nodeIds: ws.nodeIds, workspaceIds: ws.workspaceIds});
}

window.autoSave = autoSave; // Make it global

// Handle backend messages
window.onMessageFromBackend = (message) => {
    console.log('Save.js onMessageFromBackend called with:', message);
    if (typeof message === 'string') {
        try {
            const msg = JSON.parse(message);
            console.log('Parsed message:', msg);
            if (msg.type === 'workspace_data') {
                console.log('About to reconstruct, reconstructingItem:', !!window.reconstructingItem, 'data keys:', msg.data ? Object.keys(msg.data) : 'no data');
                if (msg.data && window.reconstructingItem) {
                    try {
                        reconstructWorkspace(window.reconstructingItem, msg.data);
                        window.reconstructingItem = null;
                        autoSave();
                        console.log('Reconstruction completed successfully');
                    } catch (e) {
                        console.error('Reconstruct failed:', e);
                    }
                } else {
                    console.log('Skipping reconstruct: data present?', !!msg.data, 'reconstructingItem present?', !!window.reconstructingItem);
                }
            }
        } catch (e) {
            console.log('Failed to parse message as JSON:', e);
        }
    } else {
        console.log('Message is not a string');
    }
};