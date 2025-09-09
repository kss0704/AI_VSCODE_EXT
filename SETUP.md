# AI Code Assistant - Setup Instructions

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repository-url>
cd ai-code-assistant
npm install
```

### 2. Build the Extension

```bash
npm run compile
```

### 3. Package the Extension

```bash
npm run package
```

This creates `ai-code-assistant-1.0.0.vsix` file.

### 4. Install in VS Code

```bash
code --install-extension ai-code-assistant-1.0.0.vsix
```

Or manually:
1. Open VS Code
2. Press `Ctrl/Cmd + Shift + P`
3. Type "Extensions: Install from VSIX"
4. Select the `.vsix` file

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- VS Code
- TypeScript (installed via npm)

### Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes (for development)
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Package extension
npm run package
```

### Debug the Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your extension in the new VS Code window

### Project Structure

```
ai-code-assistant/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── services/
│   │   └── aiProviderService.ts  # AI providers integration
│   └── providers/
│       ├── inlineCompletionProvider.ts    # Inline completions
│       ├── chatPanelProvider.ts           # Chat interface
│       ├── projectGeneratorProvider.ts    # Project generation
│       └── commentCompletionProvider.ts   # Comment-to-code
├── .vscode/
│   ├── launch.json               # Debug configuration
│   └── tasks.json                # Build tasks
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
├── .eslintrc.json               # ESLint config
├── .vscodeignore                # Files to exclude from package
├── .gitignore                   # Git ignore rules
└── README.md                    # Documentation
```

## Configuration

### API Keys Setup

After installation, configure your preferred AI provider:

1. Open VS Code Settings (`Ctrl/Cmd + ,`)
2. Search for "AI Code Assistant"
3. Set your API key and model preferences

### Example Configuration

```json
{
  "aiCodeAssistant.provider": "groq",
  "aiCodeAssistant.groq.apiKey": "your-groq-api-key-here",
  "aiCodeAssistant.groq.model": "llama3-70b-8192",
  "aiCodeAssistant.enableInlineCompletion": true,
  "aiCodeAssistant.maxTokens": 2048,
  "aiCodeAssistant.temperature": 0.1
}
```

## Getting API Keys

### Groq (Recommended)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up/Sign in
3. Create API key
4. Free tier available with good limits

### Perplexity
1. Go to [perplexity.ai](https://perplexity.ai)
2. Sign up for API access
3. Generate API key

### Ollama (Local)
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Run: `ollama pull codellama`
3. Start Ollama server: `ollama serve`
4. No API key needed - runs locally

### Other Providers
- **HuggingFace**: [huggingface.co](https://huggingface.co) → Settings → Access Tokens
- **Together AI**: [together.ai](https://together.ai) → API Keys
- **Replicate**: [replicate.com](https://replicate.com) → Account → API Tokens

## Troubleshooting

### Build Issues

```bash
# Clean build
rm -rf out/
rm -rf node_modules/
npm install
npm run compile
```

### Extension Not Working

1. Check VS Code output panel for errors
2. Verify API keys are set correctly
3. Try reloading VS Code (`Ctrl/Cmd + Shift + P` → "Reload Window")

### API Errors

1. Verify API key is correct
2. Check rate limits for your provider
3. Try switching to a different provider
4. Check internet connection

## Publishing (Optional)

### To VS Code Marketplace

1. Install vsce: `npm install -g vsce`
2. Create publisher account at [marketplace.visualstudio.com](https://marketplace.visualstudio.com)
3. Login: `vsce login <publisher-name>`
4. Publish: `vsce publish`

### To Open VSX (VS Codium)

1. Install ovsx: `npm install -g ovsx`
2. Create account at [open-vsx.org](https://open-vsx.org)
3. Get access token
4. Publish: `ovsx publish ai-code-assistant-1.0.0.vsix -p <token>`

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test
4. Run tests: `npm test`
5. Submit pull request

## Support

- Open issues on GitHub
- Check existing issues before creating new ones
- Provide error logs and configuration details

---

**Happy coding with AI assistance! 🚀**
