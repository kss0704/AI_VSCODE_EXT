# AI_VSCODE_EXT
# AI VSCode Extension

A powerful VS Code extension that provides AI-powered code completion, generation, and assistance with multiple AI providers support.

## Features

🚀 **Inline Code Completion** - Smart, context-aware code suggestions as you type

💬 **AI Chat Panel** - Interactive chat interface for code discussions and help

📁 **Project Generation** - Generate complete project structures from natural language descriptions

🔧 **Comment-to-Code** - Generate code from comments automatically

🎯 **Multiple AI Providers** - Support for Groq, Perplexity, HuggingFace, Ollama, Together AI, and Replicate

⚡ **Fast & Efficient** - Optimized for speed with intelligent caching

## Supported AI Providers

### Groq
- **Models**: Llama 3 70B, Llama 3 8B, Mixtral 8x7B, Gemma 7B IT
- **Speed**: Ultra-fast inference
- **Best for**: Real-time code completion

### Perplexity
- **Models**: Llama 3.1 Sonar (Large/Small), Llama 3.1 Instruct models
- **Features**: Web-connected models for up-to-date information
- **Best for**: Research and documentation

### HuggingFace
- **Models**: DialoGPT, CodeBERT, and thousands of community models
- **Features**: Extensive model library
- **Best for**: Specialized tasks and experimentation

### Ollama
- **Models**: Code Llama, Llama 2, Mistral, Phi
- **Features**: Local inference, privacy-focused
- **Best for**: Offline development and privacy

### Together AI
- **Models**: Llama 2 family, various open-source models
- **Features**: High-performance cloud inference
- **Best for**: Production applications

### Replicate
- **Models**: Various state-of-the-art models
- **Features**: Easy model deployment and scaling
- **Best for**: Experimental and cutting-edge models

## Installation

1. **Install from VS Code Marketplace** (when published):
   ```
   ext install your-publisher-name.ai-code-assistant
   ```

2. **Install from VSIX** (development):
   ```bash
   code --install-extension ai-code-assistant-1.0.0.vsix
   ```

3. **Build from Source**:
   ```bash
   git clone <repository-url>
   cd ai-code-assistant
   npm install
   npm run compile
   npm run package
   ```

## Setup

### 1. Configure API Keys

Open VS Code settings (`Ctrl/Cmd + ,`) and search for "AI Code Assistant":

**Groq** (Recommended - Free tier available):
```json
{
  "aiCodeAssistant.provider": "groq",
  "aiCodeAssistant.groq.apiKey": "your-groq-api-key",
  "aiCodeAssistant.groq.model": "llama3-70b-8192"
}
```

**Perplexity**:
```json
{
  "aiCodeAssistant.provider": "perplexity",
  "aiCodeAssistant.perplexity.apiKey": "your-perplexity-api-key",
  "aiCodeAssistant.perplexity.model": "llama-3.1-sonar-large-128k-online"
}
```

**Ollama** (Local - No API key needed):
```json
{
  "aiCodeAssistant.provider": "ollama",
  "aiCodeAssistant.ollama.baseUrl": "http://localhost:11434",
  "aiCodeAssistant.ollama.model": "codellama"
}
```

### 2. Get API Keys

- **Groq**: Visit [console.groq.com](https://console.groq.com)
- **Perplexity**: Visit [perplexity.ai](https://perplexity.ai)
- **HuggingFace**: Visit [huggingface.co](https://huggingface.co)
- **Together AI**: Visit [together.ai](https://together.ai)
- **Replicate**: Visit [replicate.com](https://replicate.com)
- **Ollama**: Install locally from [ollama.ai](https://ollama.ai)

## Usage

### Inline Code Completion

Simply start typing code, and the extension will provide intelligent suggestions:

```javascript
// Type: function calculateTotal
function calculateTotal(items) {
  // AI will suggest the complete implementation
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Comment-to-Code Generation

Write descriptive comments and get code generated automatically:

```python
# Create a function to validate email addresses using regex
def validate_email(email):
    # AI generates the complete implementation
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
```

### Project Generation

1. Press `Ctrl/Cmd + Shift + G` or run command "Generate Project Structure"
2. Describe your project: "Create a MERN stack todo app with authentication"
3. View generated files in the sidebar
4. Save to disk when ready

### AI Chat Panel

1. Press `Ctrl/Cmd + Shift + A` or run command "Show AI Chat"
2. Ask questions about code, debugging, optimization, etc.
3. Switch between AI providers and models as needed

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `AI Assistant: Generate Project Structure` | `Ctrl/Cmd + Shift + G` | Generate complete project from description |
| `AI Assistant: Show AI Chat` | `Ctrl/Cmd + Shift + A` | Open chat panel |
| `AI Assistant: Explain Code` | Right-click menu | Explain selected code |
| `AI Assistant: Optimize Code` | Right-click menu | Optimize selected code |
| `AI Assistant: Generate Tests` | Right-click menu | Generate unit tests |
| `AI Assistant: Toggle Inline Completion` | Command palette | Enable/disable inline suggestions |

## Configuration

### General Settings

```json
{
  "aiCodeAssistant.enableInlineCompletion": true,
  "aiCodeAssistant.maxTokens": 2048,
  "aiCodeAssistant.temperature": 0.1
}
```

### Provider-Specific Settings

Each provider has its own configuration section. Example for Groq:

```json
{
  "aiCodeAssistant.groq.apiKey": "your-api-key",
  "aiCodeAssistant.groq.model": "llama3-70b-8192"
}
```

## Performance Tips

1. **Choose the Right Provider**:
   - **Groq**: Best for speed and real-time completion
   - **Ollama**: Best for privacy and offline use
   - **Perplexity**: Best for research and documentation

2. **Optimize Settings**:
   - Lower `temperature` (0.1-0.3) for more consistent code
   - Adjust `maxTokens` based on your needs
   - Use caching for frequently used patterns

3. **Use Appropriate Models**:
   - Larger models (70B) for complex tasks
   - Smaller models (8B) for simple completions

## Troubleshooting

### Common Issues

**"API key not configured"**
- Ensure you've set the API key in VS Code settings
- Verify the key is correct and has proper permissions

**"No completions appearing"**
- Check if inline completion is enabled
- Verify your internet connection
- Try switching to a different provider

**"Slow response times"**
- Try switching to Groq for faster inference
- Reduce `maxTokens` setting
- Check your internet connection

### Debug Mode

Enable debug logging by adding to your settings:
```json
{
  "aiCodeAssistant.debug": true
}
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit changes: `git commit -am 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## Development

### Setup Development Environment

```bash
git clone <repository-url>
cd ai-code-assistant
npm install
```

### Build and Test

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test

# Package extension
npm run package
```

### Debug Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test your changes in the new window

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-repo/discussions)

## Changelog

### v1.0.0
- Initial release
- Multiple AI provider support
- Inline code completion
- Project generation
- Chat interface
- Comment-to-code generation

---

**Enjoy coding with AI assistance! 🚀**
