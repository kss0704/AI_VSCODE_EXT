import * as vscode from 'vscode';
import { AIProviderService } from '../services/aiProviderService';

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private aiService: AIProviderService;
    private debounceTimer?: NodeJS.Timeout;
    private cache = new Map<string, string>();

    constructor(aiService: AIProviderService) {
        this.aiService = aiService;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[]> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        if (!config.get('enableInlineCompletion', true)) {
            return [];
        }

        // Debounce to avoid too many API calls
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        return new Promise((resolve) => {
            this.debounceTimer = setTimeout(async () => {
                try {
                    const completion = await this.generateCompletion(document, position, token);
                    if (completion && !token.isCancellationRequested) {
                        resolve([new vscode.InlineCompletionItem(completion)]);
                    } else {
                        resolve([]);
                    }
                } catch (error) {
                    console.error('Inline completion error:', error);
                    resolve([]);
                }
            }, 300); // 300ms debounce
        });
    }

    private async generateCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<string | null> {
        // Get context around the cursor
        const line = document.lineAt(position.line);
        const linePrefix = line.text.substring(0, position.character);
        const lineSuffix = line.text.substring(position.character);

        // Skip if we're in the middle of a word
        if (linePrefix.match(/\w$/) && lineSuffix.match(/^\w/)) {
            return null;
        }

        // Get surrounding context (up to 50 lines before and after)
        const startLine = Math.max(0, position.line - 50);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        
        const contextBefore = document.getText(new vscode.Range(
            new vscode.Position(startLine, 0),
            position
        ));

        const contextAfter = document.getText(new vscode.Range(
            position,
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        ));

        // Create cache key
        const cacheKey = `${document.languageId}:${contextBefore.slice(-500)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Don't complete if line is empty or only whitespace
        if (linePrefix.trim().length === 0 && lineSuffix.trim().length === 0) {
            return null;
        }

        try {
            const prompt = this.buildCompletionPrompt(
                document.languageId,
                contextBefore,
                contextAfter,
                linePrefix,
                lineSuffix
            );

            if (token.isCancellationRequested) {
                return null;
            }

            const completion = await this.aiService.generateResponse(prompt, 'inline-completion');
            
            if (completion && completion.trim().length > 0) {
                // Clean up the completion
                const cleanedCompletion = this.cleanCompletion(completion, linePrefix);
                
                // Cache the result
                this.cache.set(cacheKey, cleanedCompletion);
                
                // Limit cache size
                if (this.cache.size > 100) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                
                return cleanedCompletion;
            }
        } catch (error) {
            console.error('Error generating completion:', error);
        }

        return null;
    }

    private buildCompletionPrompt(
        language: string,
        contextBefore: string,
        contextAfter: string,
        linePrefix: string,
        lineSuffix: string
    ): string {
        return `Complete the following ${language} code. Only provide the completion, no explanations or additional text.

Context before:
${contextBefore}

Context after:
${contextAfter}

Complete this line: ${linePrefix}|${lineSuffix}

Completion:`;
    }

    private cleanCompletion(completion: string, linePrefix: string): string {
        // Remove any markdown code blocks
        completion = completion.replace(/```[\s\S]*?```/g, '');
        completion = completion.replace(/```/g, '');
        
        // Remove explanations or comments that might have been added
        const lines = completion.split('\n');
        const codeLines = [];
        
        for (const line of lines) {
            // Skip lines that look like explanations
            if (line.trim().startsWith('//') && line.toLowerCase().includes('explanation')) {
                continue;
            }
            if (line.trim().startsWith('#') && line.toLowerCase().includes('explanation')) {
                continue;
            }
            if (line.trim().startsWith('/*') && line.toLowerCase().includes('explanation')) {
                continue;
            }
            codeLines.push(line);
        }
        
        completion = codeLines.join('\n');
        
        // Remove leading/trailing whitespace but preserve indentation
        completion = completion.trimEnd();
        
        // If the completion starts with the same text as linePrefix, remove the duplicate
        const linePrefixTrimmed = linePrefix.trim();
        if (linePrefixTrimmed && completion.trim().startsWith(linePrefixTrimmed)) {
            completion = completion.trim().substring(linePrefixTrimmed.length);
        }
        
        // Ensure we don't return empty completion
        if (!completion.trim()) {
            return '';
        }
        
        return completion;
    }
}
