'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useStrategyTypes } from './strategy-types-context';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export function StrategyTypesSection() {
  const { strategyTypes, loading, setOpen, setCurrentRow, open } = useStrategyTypes();

  const handleStrategyTypeClick = (strategyType: StrategyType) => {
    if (open) return;
    
    setCurrentRow(strategyType);
    setOpen('create-strategy');
  };

  const handleCreate = () => {
    setCurrentRow(undefined);
    setOpen('create');
  };

  const handleEdit = (strategyType: StrategyType) => {
    setCurrentRow(strategyType);
    setOpen('create');
  };

  const handleDelete = (strategyType: StrategyType) => {
    setCurrentRow(strategyType);
    setOpen('delete');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2"
        >
          <Plus className="size-4" />
          Add Strategy Type
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategyTypes.map((strategyType) => (
          <Card 
            key={strategyType.id} 
            className="cursor-pointer hover:shadow-md transition-shadow flex flex-col h-full"
            onClick={() => handleStrategyTypeClick(strategyType)}
          >
            <CardHeader className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {strategyType.name}
                  </CardTitle>
                  {strategyType.description && (
                    <CardDescription className="mt-2">
                      {strategyType.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(strategyType);
                    }}
                  >
                    <Edit className="size-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(strategyType);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Created: {new Date(strategyType.createdAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {strategyTypes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No strategy types found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}