import * as vscode from 'vscode';
import { AIProviderService } from '../services/aiProviderService';

export class ChatPanelProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private context: vscode.ExtensionContext;
    private aiService: AIProviderService;
    private chatHistory: Array<{ role: 'user' | 'assistant', content: string }> = [];

    constructor(context: vscode.ExtensionContext, aiService: AIProviderService) {
        this.context = context;
        this.aiService = aiService;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );
    }

    private async handleMessage(message: any) {
        switch (message.type) {
            case 'sendMessage':
                await this.handleChatMessage(message.text);
                break;
            case 'changeProvider':
                await this.handleProviderChange(message.provider);
                break;
            case 'changeModel':
                await this.handleModelChange(message.model);
                break;
            case 'clearChat':
                this.clearChat();
                break;
            case 'getModels':
                this.sendAvailableModels();
                break;
        }
    }

    private async handleChatMessage(text: string) {
        if (!text.trim()) return;

        // Add user message to history
        this.chatHistory.push({ role: 'user', content: text });
        
        // Update UI with user message
        this._view?.webview.postMessage({
            type: 'userMessage',
            content: text
        });

        try {
            // Show thinking indicator
            this._view?.webview.postMessage({
                type: 'thinking',
                thinking: true
            });

            // Generate AI response
            const response = await this.aiService.generateResponse(text, 'chat');
            
            // Add AI response to history
            this.chatHistory.push({ role: 'assistant', content: response });

            // Hide thinking indicator and show response
            this._view?.webview.postMessage({
                type: 'thinking',
                thinking: false
            });

            this._view?.webview.postMessage({
                type: 'assistantMessage',
                content: response
            });

        } catch (error) {
            this._view?.webview.postMessage({
                type: 'thinking',
                thinking: false
            });

            this._view?.webview.postMessage({
                type: 'error',
                content: `Error: ${error}`
            });
        }
    }

    private async handleProviderChange(provider: string) {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        await config.update('provider', provider, vscode.ConfigurationTarget.Global);
        this.sendAvailableModels();
    }

    private async handleModelChange(model: string) {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const provider = config.get<string>('provider', 'groq');
        await config.update(`${provider}.model`, model, vscode.ConfigurationTarget.Global);
    }

    private clearChat() {
        this.chatHistory = [];
        this._view?.webview.postMessage({
            type: 'clearChat'
        });
    }

    private sendAvailableModels() {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const provider = config.get<string>('provider', 'groq');
        const models = this.aiService.getAvailableModels(provider);
        const currentModel = config.get<string>(`${provider}.model`);

        this._view?.webview.postMessage({
            type: 'updateModels',
            provider: provider,
            models: models,
            currentModel: currentModel
        });
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const provider = config.get<string>('provider', 'groq');

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Chat</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: white;
                    background-color: black;
                    margin: 0;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 20px);
                }

                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }

                .provider-selector, .model-selector {
                    margin-bottom: 5px;
                }

                select {
                    background-color: black;
                    color: white;
                    border: 1px solid var(--vscode-dropdown-border);
                    padding: 5px;
                    width: 100%;
                    margin-top: 5px;
                }

                .chat-container {
                    flex: 1;
                    overflow-y: auto;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                    padding: 10px;
                    margin-bottom: 10px;
                    display: flex;
                    flex-direction: column;
                }

                .message {
                    margin-bottom: 15px;
                    padding: 10px;
                    border-radius: 8px;
                    max-width: 85%;
                    word-wrap: break-word;
                }

                .user-message {
                    align-self: flex-end;
                    background-color: black;
                    color: white;
                }

                .assistant-message {
                    align-self: flex-start;
                    background-color: black;
                    border: 1px solid var(--vscode-panel-border);
                }

                .thinking {
                    align-self: flex-start;
                    background-color: black;
                    border: 1px solid var(--vscode-panel-border);
                    font-style: italic;
                    opacity: 0.7;
                }

                .error-message {
                    align-self: center;
                    background-color: white;
                    color: red;
                    text-align: center;
                }

                .input-container {
                    display: flex;
                    gap: 5px;
                }

                textarea {
                    flex: 1;
                    background-color: black;
                    color: white;
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    padding: 8px;
                    resize: vertical;
                    min-height: 60px;
                    max-height: 120px;
                    font-family: var(--vscode-font-family);
                }

                button {
                    background-color: black;
                    color: white;
                    border: none;
                    padding: 8px 15px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: var(--vscode-font-size);
                }

                button:hover {
                    background-color: black;
                }

                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .clear-button {
                    background-color: black;
                    color: white;
                    margin-top: 5px;
                    width: 100%;
                }

                pre {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                    margin: 10px 0;
                }

                code {
                    background-color: white;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: var(--vscode-editor-font-family);
                }

                .typing-dots {
                    display: inline-block;
                    animation: typing 1.5s infinite;
                }

                @keyframes typing {
                    0%, 60%, 100% { opacity: 1; }
                    30% { opacity: 0.3; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="provider-selector">
                    <label for="providerSelect">Provider:</label>
                    <select id="providerSelect">
                        <option value="groq" ${provider === 'groq' ? 'selected' : ''}>Groq</option>
                        <option value="perplexity" ${provider === 'perplexity' ? 'selected' : ''}>Perplexity</option>
                        <option value="huggingface" ${provider === 'huggingface' ? 'selected' : ''}>HuggingFace</option>
                        <option value="ollama" ${provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                        <option value="togetherai" ${provider === 'togetherai' ? 'selected' : ''}>Together AI</option>
                        <option value="replicate" ${provider === 'replicate' ? 'selected' : ''}>Replicate</option>
                    </select>
                </div>
                <div class="model-selector">
                    <label for="modelSelect">Model:</label>
                    <select id="modelSelect">
                    </select>
                </div>
            </div>

            <div class="chat-container" id="chatContainer">
                <div class="message assistant-message">
                    Welcome to AI Code Assistant! I can help you with code completion, generation, debugging, and more. What would you like to work on?
                </div>
            </div>

            <div class="input-container">
                <textarea id="messageInput" placeholder="Ask me anything about code..." rows="3"></textarea>
                <button id="sendButton">Send</button>
            </div>
            <button id="clearButton" class="clear-button">Clear Chat</button>

            <script>
                const vscode = acquireVsCodeApi();
                const chatContainer = document.getElementById('chatContainer');
                const messageInput = document.getElementById('messageInput');
                const sendButton = document.getElementById('sendButton');
                const clearButton = document.getElementById('clearButton');
                const providerSelect = document.getElementById('providerSelect');
                const modelSelect = document.getElementById('modelSelect');

                let isThinking = false;

                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (text && !isThinking) {
                        vscode.postMessage({
                            type: 'sendMessage',
                            text: text
                        });
                        messageInput.value = '';
                        messageInput.style.height = '60px';
                    }
                }

                sendButton.addEventListener('click', sendMessage);

                messageInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                    }
                });

                messageInput.addEventListener('input', () => {
                    messageInput.style.height = 'auto';
                    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
                });

                clearButton.addEventListener('click', () => {
                    vscode.postMessage({
                        type: 'clearChat'
                    });
                });

                providerSelect.addEventListener('change', () => {
                    vscode.postMessage({
                        type: 'changeProvider',
                        provider: providerSelect.value
                    });
                });

                modelSelect.addEventListener('change', () => {
                    vscode.postMessage({
                        type: 'changeModel',
                        model: modelSelect.value
                    });
                });

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'userMessage':
                            addMessage(message.content, 'user');
                            break;
                        case 'assistantMessage':
                            addMessage(message.content, 'assistant');
                            break;
                        case 'thinking':
                            handleThinking(message.thinking);
                            break;
                        case 'error':
                            addMessage(message.content, 'error');
                            break;
                        case 'clearChat':
                            clearChat();
                            break;
                        case 'updateModels':
                            updateModels(message.models, message.currentModel);
                            break;
                    }
                });

                function addMessage(content, type) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = \`message \${type}-message\`;
                    
                    // Format code blocks
                    content = content.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
                    content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                    
                    messageDiv.innerHTML = content.replace(/\\n/g, '<br>');
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }

                function handleThinking(thinking) {
                    isThinking = thinking;
                    sendButton.disabled = thinking;
                    
                    if (thinking) {
                        const thinkingDiv = document.createElement('div');
                        thinkingDiv.className = 'message thinking';
                        thinkingDiv.id = 'thinking-indicator';
                        thinkingDiv.innerHTML = 'Thinking<span class="typing-dots">...</span>';
                        chatContainer.appendChild(thinkingDiv);
                    } else {
                        const thinkingDiv = document.getElementById('thinking-indicator');
                        if (thinkingDiv) {
                            thinkingDiv.remove();
                        }
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }

                function clearChat() {
                    chatContainer.innerHTML = '<div class="message assistant-message">Chat cleared. How can I help you?</div>';
                }

                function updateModels(models, currentModel) {
                    modelSelect.innerHTML = '';
                    models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.name;
                        option.title = model.description || '';
                        option.selected = model.id === currentModel;
                        modelSelect.appendChild(option);
                    });
                }

                // Request initial models
                vscode.postMessage({
                    type: 'getModels'
                });
            </script>
        </body>
        </html>`;
    }
}
