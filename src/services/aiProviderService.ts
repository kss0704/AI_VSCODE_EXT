import * as vscode from 'vscode';
import axios from 'axios';
import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
}

export class AIProviderService implements vscode.Disposable {
    private context: vscode.ExtensionContext;
    private groqClient?: Groq;
    private hfClient?: HfInference;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeClients();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('aiCodeAssistant')) {
                this.initializeClients();
            }
        });
    }

    private initializeClients() {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        
        // Initialize Groq client
        const groqApiKey = config.get<string>('groq.apiKey');
        if (groqApiKey) {
            this.groqClient = new Groq({ apiKey: groqApiKey });
        }

        // Initialize HuggingFace client
        const hfApiKey = config.get<string>('huggingface.apiKey');
        if (hfApiKey) {
            this.hfClient = new HfInference(hfApiKey);
        }
    }

    async generateResponse(prompt: string, type: string = 'general'): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const provider = config.get<string>('provider', 'groq');
        const maxTokens = config.get<number>('maxTokens', 2048);
        const temperature = config.get<number>('temperature', 0.1);

        try {
            switch (provider) {
                case 'groq':
                    return await this.generateGroqResponse(prompt, maxTokens, temperature);
                case 'perplexity':
                    return await this.generatePerplexityResponse(prompt, maxTokens, temperature);
                case 'huggingface':
                    return await this.generateHuggingFaceResponse(prompt, maxTokens, temperature);
                case 'ollama':
                    return await this.generateOllamaResponse(prompt, maxTokens, temperature);
                case 'togetherai':
                    return await this.generateTogetherAIResponse(prompt, maxTokens, temperature);
                case 'replicate':
                    return await this.generateReplicateResponse(prompt, maxTokens, temperature);
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
        } catch (error) {
            console.error('AI Provider Error:', error);
            throw error;
        }
    }

    async generateCodeCompletion(code: string, language: string): Promise<string> {
        const prompt = `Complete the following ${language} code:\n\n${code}`;
        return await this.generateResponse(prompt, 'code-completion');
    }

    async generateFromComment(comment: string, language: string): Promise<string> {
        const prompt = `Generate ${language} code based on this comment: ${comment}`;
        return await this.generateResponse(prompt, 'comment-to-code');
    }

    private async generateGroqResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        if (!this.groqClient) {
            throw new Error('Groq API key not configured');
        }

        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const model = config.get<string>('groq.model', 'llama-3.3-70b-versatile');

        const completion = await this.groqClient.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: model,
            max_tokens: maxTokens,
            temperature: temperature,
        });

        return completion.choices[0]?.message?.content || '';
    }

    private async generatePerplexityResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const apiKey = config.get<string>('perplexity.apiKey');
        const model = config.get<string>('perplexity.model', 'llama-3.1-sonar-large-128k-online');

        if (!apiKey) {
            throw new Error('Perplexity API key not configured');
        }

        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature: temperature,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.choices[0]?.message?.content || '';
    }

    private async generateHuggingFaceResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        if (!this.hfClient) {
            throw new Error('HuggingFace API key not configured');
        }

        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const model = config.get<string>('huggingface.model', 'microsoft/DialoGPT-large');

        const response = await this.hfClient.textGeneration({
            model: model,
            inputs: prompt,
            parameters: {
                max_new_tokens: maxTokens,
                temperature: temperature,
                return_full_text: false,
            },
        });

        return response.generated_text || '';
    }

    private async generateOllamaResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const baseUrl = config.get<string>('ollama.baseUrl', 'http://localhost:11434');
        const model = config.get<string>('ollama.model', 'codellama');

        const response = await axios.post(`${baseUrl}/api/generate`, {
            model: model,
            prompt: prompt,
            options: {
                num_predict: maxTokens,
                temperature: temperature,
            },
            stream: false,
        });

        return response.data.response || '';
    }

    private async generateTogetherAIResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const apiKey = config.get<string>('togetherai.apiKey');
        const model = config.get<string>('togetherai.model', 'meta-llama/Llama-2-70b-chat-hf');

        if (!apiKey) {
            throw new Error('Together AI API key not configured');
        }

        const response = await axios.post('https://api.together.xyz/inference', {
            model: model,
            prompt: prompt,
            max_tokens: maxTokens,
            temperature: temperature,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data.output?.choices[0]?.text || '';
    }

    private async generateReplicateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string> {
        const config = vscode.workspace.getConfiguration('aiCodeAssistant');
        const apiKey = config.get<string>('replicate.apiKey');
        const model = config.get<string>('replicate.model', 'meta/llama-2-70b-chat');

        if (!apiKey) {
            throw new Error('Replicate API key not configured');
        }

        const response = await axios.post('https://api.replicate.com/v1/predictions', {
            version: model,
            input: {
                prompt: prompt,
                max_new_tokens: maxTokens,
                temperature: temperature,
            },
        }, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Replicate is async, so we need to poll for results
        const predictionId = response.data.id;
        let result = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (!result && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const statusResponse = await axios.get(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: {
                    'Authorization': `Token ${apiKey}`,
                },
            });

            if (statusResponse.data.status === 'succeeded') {
                result = statusResponse.data.output?.join('') || '';
            } else if (statusResponse.data.status === 'failed') {
                throw new Error('Replicate prediction failed');
            }
            attempts++;
        }

        return result || '';
    }

    getAvailableModels(provider?: string): ModelInfo[] {
        const currentProvider = provider || vscode.workspace.getConfiguration('aiCodeAssistant').get<string>('provider', 'groq');
        
        const models: { [key: string]: ModelInfo[] } = {
            groq: [
                { id: 'llama-3.3-70b-versatile', name: 'Llama 3 70B', description: 'Large context window model' },
                { id: 'llama-3.1-8b-instant', name: 'Llama 3 8B', description: 'Fast and efficient model' },
                { id: 'mistral-saba-24b', name: 'Mistral 24B', description: 'Mixture of experts model' },
                { id: 'gemma2-9b-it', name: 'Gemma 9B IT', description: 'Instruction-tuned model' },
            ],
            perplexity: [
                { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large', description: 'Online model with web access' },
                { id: 'llama-3.1-sonar-small-128k-online', name: 'Llama 3.1 Sonar Small', description: 'Efficient online model' },
                { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', description: 'Instruction-following model' },
                { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', description: 'Fast instruction model' },
            ],
            huggingface: [
                { id: 'microsoft/DialoGPT-large', name: 'DialoGPT Large', description: 'Conversational AI model' },
                { id: 'microsoft/CodeBERT-base', name: 'CodeBERT Base', description: 'Code understanding model' },
                { id: 'microsoft/codebert-base-mlm', name: 'CodeBERT MLM', description: 'Masked language model for code' },
            ],
            ollama: [
                { id: 'codellama', name: 'Code Llama', description: 'Code generation specialist' },
                { id: 'llama2', name: 'Llama 2', description: 'General purpose model' },
                { id: 'mistral', name: 'Mistral', description: 'Efficient language model' },
                { id: 'phi', name: 'Phi', description: 'Microsoft small model' },
            ],
            togetherai: [
                { id: 'meta-llama/Llama-2-70b-chat-hf', name: 'Llama 2 70B Chat', description: 'Large chat model' },
                { id: 'meta-llama/Llama-2-13b-chat-hf', name: 'Llama 2 13B Chat', description: 'Medium chat model' },
                { id: 'meta-llama/Llama-2-7b-chat-hf', name: 'Llama 2 7B Chat', description: 'Small chat model' },
            ],
            replicate: [
                { id: 'meta/llama-2-70b-chat', name: 'Llama 2 70B Chat', description: 'Large chat model' },
                { id: 'meta/llama-2-13b-chat', name: 'Llama 2 13B Chat', description: 'Medium chat model' },
                { id: 'meta/llama-2-7b-chat', name: 'Llama 2 7B Chat', description: 'Small chat model' },
            ],
        };

        return models[currentProvider] || [];
    }

    dispose() {
        // Clean up resources if needed
    }
}
