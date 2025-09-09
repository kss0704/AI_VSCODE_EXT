import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProviderService } from '../services/aiProviderService';

interface GeneratedFile {
    name: string;
    path: string;
    content: string;
    type: 'file' | 'folder';
    children?: GeneratedFile[];
}

export class ProjectGeneratorProvider implements vscode.TreeDataProvider<GeneratedFile> {
    private _onDidChangeTreeData: vscode.EventEmitter<GeneratedFile | undefined | null | void> = new vscode.EventEmitter<GeneratedFile | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<GeneratedFile | undefined | null | void> = this._onDidChangeTreeData.event;

    private generatedFiles: GeneratedFile[] = [];
    private context: vscode.ExtensionContext;
    private aiService: AIProviderService;

    constructor(context: vscode.ExtensionContext, aiService: AIProviderService) {
        this.context = context;
        this.aiService = aiService;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GeneratedFile): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.name, element.type === 'folder' ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
        
        if (element.type === 'file') {
            treeItem.command = {
                command: 'aiCodeAssistant.openGeneratedFile',
                title: 'Open File',
                arguments: [element]
            };
            treeItem.contextValue = 'generatedFile';
            treeItem.iconPath = new vscode.ThemeIcon('file');
        } else {
            treeItem.contextValue = 'generatedFolder';
            treeItem.iconPath = new vscode.ThemeIcon('folder');
        }

        return treeItem;
    }

    getChildren(element?: GeneratedFile): Thenable<GeneratedFile[]> {
        if (!element) {
            return Promise.resolve(this.generatedFiles);
        } else {
            return Promise.resolve(element.children || []);
        }
    }

    async generateProject(prompt: string): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating project structure...',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Analyzing requirements...' });

                const projectPrompt = this.buildProjectPrompt(prompt);
                
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 20, message: 'Generating file structure...' });

                const response = await this.aiService.generateResponse(projectPrompt, 'project-generation');
                
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 50, message: 'Parsing generated files...' });

                const files = this.parseGeneratedProject(response);
                
                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 80, message: 'Creating project structure...' });

                this.generatedFiles = files;
                this.refresh();

                // Set context to show the tree view
                vscode.commands.executeCommand('setContext', 'aiCodeAssistant.hasGeneratedFiles', true);

                progress.report({ increment: 100, message: 'Project generated successfully!' });
            });

            // Register file opening command
            this.registerFileCommands();

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating project: ${error}`);
        }
    }

    private buildProjectPrompt(userPrompt: string): string {
        return `Generate a complete project structure based on this description: "${userPrompt}"

Please provide the response in the following JSON format:
{
  "project": {
    "name": "project-name",
    "description": "Project description",
    "files": [
      {
        "path": "relative/path/to/file.ext",
        "content": "file content here",
        "type": "file"
      },
      {
        "path": "folder/",
        "type": "folder"
      }
    ]
  }
}

Requirements:
1. Include all necessary files for a complete, working project
2. Add package.json, requirements.txt, or equivalent dependency files
3. Include README.md with setup instructions
4. Add proper file structure and organization
5. Include example/starter code that actually works
6. Add configuration files (e.g., .gitignore, tsconfig.json, etc.)
7. Make sure all code is production-ready and follows best practices
8. Include error handling and proper documentation
9. Add tests where appropriate
10. Ensure the project can be run immediately after setup

Generate a comprehensive, executable project structure:`;
    }

    private parseGeneratedProject(response: string): GeneratedFile[] {
        try {
            // Extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const projectData = JSON.parse(jsonMatch[0]);
            const files = projectData.project?.files || [];

            return this.buildFileTree(files);
        } catch (error) {
            // Fallback: parse as plain text with file markers
            return this.parseAsPlainText(response);
        }
    }

    private buildFileTree(files: any[]): GeneratedFile[] {
        const tree: GeneratedFile[] = [];
        const folderMap = new Map<string, GeneratedFile>();

        // Sort files so folders come first
        files.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.path.localeCompare(b.path);
        });

        for (const file of files) {
            const pathParts = file.path.split('/').filter(p => p);
            
            if (file.type === 'folder') {
                const folderFile: GeneratedFile = {
                    name: pathParts[pathParts.length - 1] || file.path,
                    path: file.path,
                    content: '',
                    type: 'folder',
                    children: []
                };
                
                folderMap.set(file.path, folderFile);
                
                if (pathParts.length === 1) {
                    tree.push(folderFile);
                }
            } else {
                const fileName = pathParts[pathParts.length - 1];
                const dirPath = pathParts.slice(0, -1).join('/') + '/';
                
                const fileItem: GeneratedFile = {
                    name: fileName,
                    path: file.path,
                    content: file.content || '',
                    type: 'file'
                };

                if (pathParts.length === 1) {
                    tree.push(fileItem);
                } else {
                    const parentFolder = folderMap.get(dirPath);
                    if (parentFolder) {
                        parentFolder.children = parentFolder.children || [];
                        parentFolder.children.push(fileItem);
                    } else {
                        // Create missing parent folders
                        const parentName = pathParts[pathParts.length - 2];
                        const parentFile: GeneratedFile = {
                            name: parentName,
                            path: dirPath,
                            content: '',
                            type: 'folder',
                            children: [fileItem]
                        };
                        folderMap.set(dirPath, parentFile);
                        tree.push(parentFile);
                    }
                }
            }
        }

        return tree;
    }

    private parseAsPlainText(response: string): GeneratedFile[] {
        const files: GeneratedFile[] = [];
        const lines = response.split('\n');
        let currentFile: GeneratedFile | null = null;
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect file markers
            if (line.startsWith('**') && line.endsWith('**')) {
                // Save previous file if exists
                if (currentFile && codeBlockContent.length > 0) {
                    currentFile.content = codeBlockContent.join('\n');
                    files.push(currentFile);
                }

                // Start new file
                const fileName = line.replace(/\*\*/g, '').trim();
                currentFile = {
                    name: path.basename(fileName),
                    path: fileName,
                    content: '',
                    type: 'file'
                };
                codeBlockContent = [];
                inCodeBlock = false;
            } else if (line.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                if (!inCodeBlock && currentFile && codeBlockContent.length > 0) {
                    currentFile.content = codeBlockContent.join('\n');
                    files.push(currentFile);
                    currentFile = null;
                    codeBlockContent = [];
                }
            } else if (inCodeBlock && currentFile) {
                codeBlockContent.push(lines[i]);
            }
        }

        // Save last file
        if (currentFile && codeBlockContent.length > 0) {
            currentFile.content = codeBlockContent.join('\n');
            files.push(currentFile);
        }

        return this.buildFileTree(files.map(f => ({ ...f, type: 'file' })));
    }

    private registerFileCommands() {
        // Register open file command
        const openFileCommand = vscode.commands.registerCommand(
            'aiCodeAssistant.openGeneratedFile',
            async (file: GeneratedFile) => {
                try {
                    const document = await vscode.workspace.openTextDocument({
                        content: file.content,
                        language: this.getLanguageFromPath(file.path)
                    });
                    await vscode.window.showTextDocument(document);
                } catch (error) {
                    vscode.window.showErrorMessage(`Error opening file: ${error}`);
                }
            }
        );

        // Register save project command
        const saveProjectCommand = vscode.commands.registerCommand(
            'aiCodeAssistant.saveProject',
            async () => {
                if (this.generatedFiles.length === 0) {
                    vscode.window.showWarningMessage('No generated files to save');
                    return;
                }

                const folderUri = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select Project Folder'
                });

                if (!folderUri || folderUri.length === 0) {
                    return;
                }

                const projectPath = folderUri[0].fsPath;
                await this.saveFilesToDisk(this.generatedFiles, projectPath);
                
                vscode.window.showInformationMessage(
                    `Project saved to ${projectPath}`,
                    'Open Folder'
                ).then(selection => {
                    if (selection === 'Open Folder') {
                        vscode.commands.executeCommand('vscode.openFolder', folderUri[0]);
                    }
                });
            }
        );

        this.context.subscriptions.push(openFileCommand, saveProjectCommand);
    }

    private async saveFilesToDisk(files: GeneratedFile[], basePath: string) {
        for (const file of files) {
            const fullPath = path.join(basePath, file.path);
            
            if (file.type === 'folder') {
                if (!fs.existsSync(fullPath)) {
                    fs.mkdirSync(fullPath, { recursive: true });
                }
                if (file.children) {
                    await this.saveFilesToDisk(file.children, basePath);
                }
            } else {
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(fullPath, file.content, 'utf8');
            }
        }
    }

    private getLanguageFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascriptreact',
            '.tsx': 'typescriptreact',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.sql': 'sql',
            '.sh': 'shellscript',
            '.bat': 'bat',
            '.ps1': 'powershell'
        };

        return languageMap[ext] || 'plaintext';
    }
}
