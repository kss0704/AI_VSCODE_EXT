import * as vscode from 'vscode';
import { AIProviderService } from './services/aiProviderService';
import { InlineCompletionProvider } from './providers/inlineCompletionProvider';
import { ChatPanelProvider } from './providers/chatPanelProvider';
import { ProjectGeneratorProvider } from './providers/projectGeneratorProvider';
import { CommentCompletionProvider } from './providers/commentCompletionProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Assistant is now active!');

    // Initialize services
    const aiService = new AIProviderService(context);
    
    // Register providers
    const inlineProvider = new InlineCompletionProvider(aiService);
    const chatProvider = new ChatPanelProvider(context, aiService);
    const projectProvider = new ProjectGeneratorProvider(context, aiService);
    const commentProvider = new CommentCompletionProvider(aiService);

    // Register inline completion provider
    const inlineCompletionDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { pattern: '**' },
        inlineProvider
    );

    // Register comment completion provider
    const commentCompletionDisposable = vscode.languages.registerCompletionItemProvider(
        { pattern: '**' },
        commentProvider,
        '/', '*'
    );

    // Register webview panel
    const chatPanelDisposable = vscode.window.registerWebviewViewProvider(
        'aiCodeAssistant.chatPanel',
        chatProvider
    );

    // Register tree data provider for generated files
    const treeDataProvider = vscode.window.registerTreeDataProvider(
        'aiCodeAssistant.projectFiles',
        projectProvider
    );

    // Register commands
    const generateProjectCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.generateProject',
        async () => {
            const prompt = await vscode.window.showInputBox({
                prompt: 'Describe the project you want to generate',
                placeHolder: 'e.g., Create a MERN stack todo application with authentication'
            });

            if (prompt) {
                await projectProvider.generateProject(prompt);
            }
        }
    );

    const explainCodeCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.explainCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                vscode.window.showErrorMessage('No code selected');
                return;
            }

            try {
                const explanation = await aiService.generateResponse(
                    `Explain this code:\n\n${selectedText}`,
                    'code-explanation'
                );

                // Show explanation in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: explanation,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Error explaining code: ${error}`);
            }
        }
    );

    const optimizeCodeCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.optimizeCode',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                vscode.window.showErrorMessage('No code selected');
                return;
            }

            try {
                const optimizedCode = await aiService.generateResponse(
                    `Optimize this code for better performance and readability:\n\n${selectedText}`,
                    'code-optimization'
                );

                // Replace selected text with optimized version
                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, optimizedCode);
                });
            } catch (error) {
                vscode.window.showErrorMessage(`Error optimizing code: ${error}`);
            }
        }
    );

    const generateTestsCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.generateTests',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor found');
                return;
            }

            const document = editor.document;
            const code = document.getText();
            const language = document.languageId;

            try {
                const tests = await aiService.generateResponse(
                    `Generate comprehensive unit tests for this ${language} code:\n\n${code}`,
                    'test-generation'
                );

                // Create test file
                const testFileName = document.fileName.replace(/\.(js|ts|py|java)$/, '.test.$1');
                const testDoc = await vscode.workspace.openTextDocument({
                    content: tests,
                    language: language
                });
                await vscode.window.showTextDocument(testDoc);
            } catch (error) {
                vscode.window.showErrorMessage(`Error generating tests: ${error}`);
            }
        }
    );

    const toggleInlineCompletionCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.toggleInlineCompletion',
        () => {
            const config = vscode.workspace.getConfiguration('aiCodeAssistant');
            const currentValue = config.get('enableInlineCompletion', true);
            config.update('enableInlineCompletion', !currentValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `Inline completion ${!currentValue ? 'enabled' : 'disabled'}`
            );
        }
    );

    const showChatPanelCommand = vscode.commands.registerCommand(
        'aiCodeAssistant.showChatPanel',
        () => {
            vscode.commands.executeCommand('workbench.view.extension.aiCodeAssistant');
        }
    );

    // Add all disposables to context
    context.subscriptions.push(
        inlineCompletionDisposable,
        commentCompletionDisposable,
        chatPanelDisposable,
        treeDataProvider,
        generateProjectCommand,
        explainCodeCommand,
        optimizeCodeCommand,
        generateTestsCommand,
        toggleInlineCompletionCommand,
        showChatPanelCommand,
        aiService
    );

    // Set context for conditional UI elements
    vscode.commands.executeCommand('setContext', 'aiCodeAssistant.activated', true);
}

export function deactivate() {
    console.log('AI Code Assistant deactivated');
}
