const fs = require('fs');
const path = require('path');

const CONTEXT_PATH = path.join(__dirname, '../../Data/Context/context.json');

async function detectCurrentModel() {
    try {
        const response = await fetch('http://localhost:1234/v1/models');
        if (!response.ok) throw new Error('Failed to fetch models');
        const data = await response.json();
        // Assuming data.data is array of models, return first or current
        return data.data && data.data.length > 0 ? data.data[0].id : null;
    } catch (error) {
        console.error('Error detecting model:', error);
        return null;
    }
}

function clearContext() {
    fs.writeFileSync(CONTEXT_PATH, JSON.stringify([], null, 2));
}

function setSystemPrompt(prompt) {
    let context = [];
    if (fs.existsSync(CONTEXT_PATH)) {
        context = JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf8'));
    }
    if (context.length > 0 && context[0].role === 'system') {
        context[0].content = prompt;
    } else {
        context.unshift({ role: 'system', content: prompt, labels: [] });
    }
    fs.writeFileSync(CONTEXT_PATH, JSON.stringify(context, null, 2));
}

function getFilteredContext(contextLabels, contextCount) {
    if (!fs.existsSync(CONTEXT_PATH)) return [];
    let context = JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf8'));
    if (contextLabels !== 'ALL') {
        const labelsArray = Array.isArray(contextLabels) ? contextLabels : [contextLabels];
        context = context.filter(msg => msg.labels && msg.labels.some(label => labelsArray.includes(label)));
    }
    if (contextCount > 0) {
        context = context.slice(-contextCount);
    }
    return context;
}

async function sendRequestWithLabels(prompt, labels, tokenCount, contextLabels, contextCount) {
    const model = await detectCurrentModel();
    if (!model) throw new Error('No model detected');

    let context = getFilteredContext(contextLabels, contextCount);
    const messages = [...context, { role: 'user', content: prompt, labels: Array.isArray(labels) ? labels : [] }];

    const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenCount
        })
    });

    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    const assistantContent = data.choices[0].message.content;

    // Save to context
    let fullContext = [];
    if (fs.existsSync(CONTEXT_PATH)) {
        fullContext = JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf8'));
    }
    fullContext.push({ role: 'user', content: prompt, labels: Array.isArray(labels) ? labels : [] });
    fullContext.push({ role: 'assistant', content: assistantContent, labels: Array.isArray(labels) ? labels : [] });
    fs.writeFileSync(CONTEXT_PATH, JSON.stringify(fullContext, null, 2));

    return assistantContent;
}

async function sendRequestWithoutLabels(prompt, tokenCount, contextLabels, contextCount) {
    const model = await detectCurrentModel();
    if (!model) throw new Error('No model detected');

    let context = getFilteredContext(contextLabels, contextCount);
    const messages = [...context, { role: 'user', content: prompt, labels: [] }];

    const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: tokenCount
        })
    });

    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    return data.choices[0].message.content;
}

module.exports = {
    detectCurrentModel,
    clearContext,
    setSystemPrompt,
    sendRequestWithLabels,
    sendRequestWithoutLabels
};