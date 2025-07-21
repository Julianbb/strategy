'use client';

import { Badge } from '@/components/ui/badge';
import { useStrategyChat } from './dialog/strategy-chat-context';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export function StrategyTypeBadges() {
  const { 
    strategyTypes, 
    strategyTypesLoading, 
    setOpen, 
    setCurrentStrategyType 
  } = useStrategyChat();

  const handleCreateType = () => {
    setCurrentStrategyType(undefined);
    setOpen('strategy-type-create');
  };

  const handleBadgeClick = (strategyType: StrategyType) => {
    setCurrentStrategyType(strategyType);
    setOpen('strategy-type-edit');
  };

  if (strategyTypesLoading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-center">
      {strategyTypes.map((strategyType) => (
        <Badge
          key={strategyType.id}
          variant="default"
          className="cursor-pointer hover:bg-primary/80 px-2 py-1 h-6 text-xs"
          onClick={() => handleBadgeClick(strategyType)}
        >
          {strategyType.name}
        </Badge>
      ))}
      
      {strategyTypes.length === 0 && (
        <span className="text-sm text-muted-foreground">No strategy types defined</span>
      )}
    </div>
  );
}