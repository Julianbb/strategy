
"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { useModelSettings } from "@/hooks/use-model-settings";
import { AI_COMPANIES, getModelsByCapability, getModelName } from "@/lib/global_data/list_models_ai";
import { toast } from "@/components/toast";

import ContentSection from "@/components/settings/content-section"

export default function SettingsAccount() {
  const sidebar = useStore(useSidebar, (x) => x);
  const modelSettings = useStore(useModelSettings, (x) => x);
  const [apiKeys, setApiKeys] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    // Fetch API key status on component mount
    fetch('/api/check-api-keys')
      .then(res => res.json())
      .then(data => setApiKeys(data))
      .catch(console.error);
  }, []);

  if (!sidebar || !modelSettings) return null;
  
  const { settings, setSettings } = sidebar;
  const { settings: modelSettingsData, setSettings: setModelSettings } = modelSettings;

  const handleCompanyToggle = async (companyId: string, checked: boolean) => {
    if (checked && !apiKeys[companyId]) {
      toast({ 
        type: 'error', 
        description: `You have not configured the ${AI_COMPANIES.find(c => c.id === companyId)?.name} API key` 
      });
      return;
    }
    const updatedCompanies = checked 
      ? [...modelSettingsData.selectedCompanies, companyId]
      : modelSettingsData.selectedCompanies.filter(id => id !== companyId);
    setModelSettings({ selectedCompanies: updatedCompanies });
  };

  const handleModelChange = (modelType: 'sttModel' | 'translationModel' | 'conversationModel', value: string) => {
    setModelSettings({ [modelType]: value });
    const modelName = getModelName(value);
    const displayName = modelType === 'sttModel' ? 'Speech-to-Text' : 
                       modelType === 'translationModel' ? 'Translation' : 'Conversation';
    toast({ type: 'success', description: `${displayName} Model has changed to ${modelName}` });
  };

  const getSttModels = () => {
    return getModelsByCapability('stt', modelSettingsData.selectedCompanies);
  };

  const getChatModels = () => {
    return getModelsByCapability('chat', modelSettingsData.selectedCompanies);
  };

  const getTranslationModels = () => {
    return getModelsByCapability('translation', modelSettingsData.selectedCompanies);
  };


  return (
    <ContentSection
      title='Account'
      desc='Update your account settings. Set your preferred language and
          timezone.'
    >
      <TooltipProvider>
          <div className="space-y-8 mt-6 pl-4">
            {/* Sidebar Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sidebar Settings</h3>
              <div className="flex gap-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-hover-open"
                        onCheckedChange={(x) => setSettings({ isHoverOpen: x })}
                        checked={settings.isHoverOpen}
                      />
                      <Label htmlFor="is-hover-open">Hover Open</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>When hovering on the sidebar in mini state, it will open</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="disable-sidebar"
                        onCheckedChange={(x) => setSettings({ disabled: x })}
                        checked={settings.disabled}
                      />
                      <Label htmlFor="disable-sidebar">Disable Sidebar</Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hide sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
  
            {/* Model Settings */}
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-medium">Model Settings</h3>
              
              {/* Company Selection */}
              <div className="space-y-2">
                <Label>AI Providers</Label>
                <div className="flex gap-4">
                  {AI_COMPANIES.map((company) => (
                    <div key={company.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`company-${company.id}`}
                        checked={modelSettingsData.selectedCompanies.includes(company.id)}
                        onCheckedChange={(checked) => handleCompanyToggle(company.id, checked as boolean)}
                      />
                      <Label htmlFor={`company-${company.id}`}>{company.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="stt-model">Speech-to-Text Model</Label>
                  <Select
                    value={modelSettingsData.sttModel}
                    onValueChange={(value) => handleModelChange('sttModel', value)}
                  >
                    <SelectTrigger id="stt-model">
                      <SelectValue placeholder="Select STT model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSttModels().map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="translation-model">Translation Model</Label>
                  <Select
                    value={modelSettingsData.translationModel}
                    onValueChange={(value) => handleModelChange('translationModel', value)}
                  >
                    <SelectTrigger id="translation-model">
                      <SelectValue placeholder="Select translation model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTranslationModels().map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="conversation-model">Conversation Model</Label>
                  <Select
                    value={modelSettingsData.conversationModel}
                    onValueChange={(value) => handleModelChange('conversationModel', value)}
                  >
                    <SelectTrigger id="conversation-model">
                      <SelectValue placeholder="Select conversation model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getChatModels().map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TooltipProvider>
    </ContentSection>
  )
}