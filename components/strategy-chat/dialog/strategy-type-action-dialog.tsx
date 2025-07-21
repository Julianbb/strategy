'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface StrategyTypeActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow?: StrategyType;
  onSuccess: () => void;
  onDelete?: () => void;
}

export function StrategyTypeActionDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
  onDelete,
}: StrategyTypeActionDialogProps) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!currentRow;

  useEffect(() => {
    if (currentRow) {
      setFormData({ 
        name: currentRow.name, 
        description: currentRow.description || '' 
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [currentRow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/strategy-types', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: currentRow.id, ...formData } : formData),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
        setFormData({ name: '', description: '' });
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} strategy type:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Strategy Type' : 'Create New Strategy Type'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your strategy type details below.'
              : 'Add a new strategy type to organize your approaches.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter strategy type name"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter strategy type description (optional)"
              rows={3}
            />
          </div>
          
          <DialogFooter className={isEditing ? "justify-between" : ""}>
            {isEditing && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={onDelete}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}