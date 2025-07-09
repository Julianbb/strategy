
"use client";


import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

import ContentSection from "@/components/settings/content-section"

export default function SettingsAccount() {

  const sidebar = useStore(useSidebar, (x) => x);
  const modelSettings = useStore(useModelSettings, (x) => x);
  if (!sidebar || !modelSettings) return null;
  const { settings, setSettings } = sidebar;
  const { settings: modelSettingsData, setSettings: setModelSettings } = modelSettings;


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
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="stt-model">Speech-to-Text Model</Label>
                  <Select
                    value={modelSettingsData.sttModel}
                    onValueChange={(value) => setModelSettings({ sttModel: value })}
                  >
                    <SelectTrigger id="stt-model">
                      <SelectValue placeholder="Select STT model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whisper-1">Whisper-1</SelectItem>
                      <SelectItem value="gpt-4o-transcribe">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini-transcribe">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="translation-model">Translation Model</Label>
                  <Select
                    value={modelSettingsData.translationModel}
                    onValueChange={(value) => setModelSettings({ translationModel: value })}
                  >
                    <SelectTrigger id="translation-model">
                      <SelectValue placeholder="Select translation model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
  
                <div className="space-y-2">
                  <Label htmlFor="conversation-model">Conversation Model</Label>
                  <Select
                    value={modelSettingsData.conversationModel}
                    onValueChange={(value) => setModelSettings({ conversationModel: value })}
                  >
                    <SelectTrigger id="conversation-model">
                      <SelectValue placeholder="Select conversation model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
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