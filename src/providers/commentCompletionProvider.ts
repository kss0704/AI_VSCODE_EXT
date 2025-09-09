import * as vscode from 'vscode';
import { AIProviderService } from '../services/aiProviderService';

export class CommentCompletionProvider implements vscode.CompletionItemProvider {
    private aiService: AIProviderService;
    private readonly triggerPatterns = new Map<string, RegExp>([
        ['javascript', /\/\/\s*(.+)$/],
        ['typescript', /\/\/\s*(.+)$/],
        ['python', /#\s*(.+)$/],
        ['java', /\/\/\s*(.+)$/],
        ['csharp', /\/\/\s*(.+)$/],
        ['cpp', /\/\/\s*(.+)$/],
        ['c', /\/\/\s*(.+)$/],
        ['go', /\/\/\s*(.+)$/],
        ['rust', /\/\/\s*(.+)$/],
        ['php', /\/\/\s*(.+)$/],
        ['ruby', /#\s*(.+)$/],
        ['html', /<!--\s*(.+)\s*-->$/],
        ['css', /\/\*\s*(.+)\s*\*\/$/],
    ]);

    constructor(aiService: AIProviderService) {
        this.aiService = aiService;
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        const line = document.lineAt(position.line);
        const lineText = line.text;
        const language = document.languageId;

        // Check if current line contains a comment pattern
        const pattern = this.triggerPatterns.get(language);
        if (!pattern) {
            return [];
        }

        const match = lineText.match(pattern);
        if (!match) {
            return [];
        }

        const comment = match[1].trim();
        
        // Only proceed if comment is substantial enough
        if (comment.length < 3) {
            return [];
        }

        // Check if comment looks like a code generation request
        const codeGenKeywords = [
            'function', 'class', 'method', 'create', 'generate', 'implement',
            'TODO', 'FIXME', 'NOTE', 'BUG', 'HACK', 'XXX', 'algorithm',
            'loop', 'condition', 'check', 'validate', 'parse', 'format',
            'calculate', 'compute', 'process', 'handle', 'manage', 'sort'
        ];

        const hasCodeGenKeyword = codeGenKeywords.some(keyword => 
            comment.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasCodeGenKeyword) {
            return [];
        }

        try {
            const completionItem = new vscode.CompletionItem(
                'Generate code from comment',
                vscode.CompletionItemKind.Snippet
            );

            completionItem.detail = `AI-generated code for: ${comment}`;
            completionItem.documentation = new vscode.MarkdownString(
                `Generates ${language} code based on the comment: "${comment}"`
            );

            // Set up the completion to replace the entire line and generate code
            completionItem.command = {
                command: 'aiCodeAssistant.generateFromComment',
                title: 'Generate Code',
                arguments: [document.uri, position.line, comment, language]
            };

            return [completionItem];
        } catch (error) {
            console.error('Comment completion error:', error);
            return [];
        }
    }

    // Register the command to handle code generation
    static registerCommand(context: vscode.ExtensionContext, aiService: AIProviderService) {
        const command = vscode.commands.registerCommand(
            'aiCodeAssistant.generateFromComment',
            async (uri: vscode.Uri, lineNumber: number, comment: string, language: string) => {
                const document = await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);

                try {
                    // Show progress
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Generating code from comment...',
                        cancellable: true
                    }, async (progress, token) => {
                        const generatedCode = await aiService.generateFromComment(comment, language);
                        
                        if (token.isCancellationRequested) {
                            return;
                        }

                        // Replace the comment line with generated code
                        const line = document.lineAt(lineNumber);
                        const lineRange = line.range;
                        
                        // Format the generated code with proper indentation
                        const indentation = line.text.match(/^\s*/)?.[0] || '';
                        const formattedCode = generatedCode
                            .split('\n')
                            .map((codeLine, index) => {
                                if (index === 0) {
                                    return indentation + codeLine;
                                }
                                return indentation + codeLine;
                            })
                            .join('\n');

                        await editor.edit(editBuilder => {
                            editBuilder.replace(lineRange, formattedCode);
                        });

                        // Format the document
                        await vscode.commands.executeCommand('editor.action.formatDocument');
                    });
                } catch (error) {
                    vscode.window.showErrorMessage(`Error generating code: ${error}`);
                }
            }
        );

        context.subscriptions.push(command);
    }
}
