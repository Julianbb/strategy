export interface AIModel {
  id: string;
  name: string;
  company: 'openai' | 'xai' | 'anthropic';
  capabilities: ('stt' | 'chat' | 'translation')[];
}

export interface CompanyModels {
  openai: AIModel[];
  xai: AIModel[];
  anthropic: AIModel[];
}

export const AI_COMPANIES = [
  { id: 'openai', name: 'OpenAI' },
  { id: 'xai', name: 'xAI' },
  { id: 'anthropic', name: 'Anthropic' }
] as const;

export const AI_MODELS: CompanyModels = {
  openai: [
    { id: 'whisper-1', name: 'Whisper-1', company: 'openai', capabilities: ['stt'] },
    { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe', company: 'openai', capabilities: ['stt'] },
    { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe', company: 'openai', capabilities: ['stt'] },
    { id: 'gpt-4o', name: 'GPT-4o', company: 'openai', capabilities: ['chat', 'translation'] },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', company: 'openai', capabilities: ['chat', 'translation'] },
    { id: 'gpt-4', name: 'GPT-4', company: 'openai', capabilities: ['chat', 'translation'] },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', company: 'openai', capabilities: ['chat', 'translation'] }
  ],
  xai: [
    { id: 'grok-1', name: 'Grok-1', company: 'xai', capabilities: ['chat', 'translation'] },
    { id: 'grok-1.5', name: 'Grok-1.5', company: 'xai', capabilities: ['chat', 'translation'] },
    { id: 'grok-2', name: 'Grok-2', company: 'xai', capabilities: ['chat', 'translation'] }
  ],
  anthropic: [
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Legacy)', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', company: 'anthropic', capabilities: ['chat', 'translation'] },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', company: 'anthropic', capabilities: ['chat', 'translation'] }
  ]
};

export function getModelsByCompany(company: keyof CompanyModels): AIModel[] {
  return AI_MODELS[company] || [];
}

export function getModelsByCapability(capability: 'stt' | 'chat' | 'translation', selectedCompanies: string[]): AIModel[] {
  const models = [];
  for (const companyId of selectedCompanies) {
    const companyModels = getModelsByCompany(companyId as keyof CompanyModels);
    models.push(...companyModels.filter(model => model.capabilities.includes(capability)));
  }
  return models;
}

export function getAllModels(): AIModel[] {
  return [...AI_MODELS.openai, ...AI_MODELS.xai, ...AI_MODELS.anthropic];
}

export function getModelName(modelId: string): string {
  const allModels = getAllModels();
  const model = allModels.find(m => m.id === modelId);
  return model?.name || modelId;
}