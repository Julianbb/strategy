'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CreateStrategyDialog } from '@/components/create-strategy-dialog';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export function StrategyTypesSection() {
  const [strategyTypes, setStrategyTypes] = useState<StrategyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [createStrategyOpen, setCreateStrategyOpen] = useState(false);
  const [selectedStrategyType, setSelectedStrategyType] = useState<StrategyType | null>(null);

  useEffect(() => {
    fetchStrategyTypes();
  }, []);

  const fetchStrategyTypes = async () => {
    try {
      const response = await fetch('/api/strategy-types');
      if (response.ok) {
        const data = await response.json();
        setStrategyTypes(data);
      }
    } catch (error) {
      console.error('Error fetching strategy types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const response = await fetch('/api/strategy-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchStrategyTypes();
        setFormData({ name: '', description: '' });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating strategy type:', error);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !formData.name.trim()) return;

    try {
      const response = await fetch('/api/strategy-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...formData }),
      });

      if (response.ok) {
        await fetchStrategyTypes();
        setFormData({ name: '', description: '' });
        setEditingId(null);
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating strategy type:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/strategy-types?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchStrategyTypes();
      }
    } catch (error) {
      console.error('Error deleting strategy type:', error);
    }
  };

  const startEdit = (strategyType: StrategyType) => {
    setEditingId(strategyType.id);
    setFormData({ name: strategyType.name, description: strategyType.description || '' });
    setIsDialogOpen(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setIsDialogOpen(false);
    setEditingId(null);
  };

  const handleStrategyTypeClick = (strategyType: StrategyType) => {
    // Don't proceed if any dialog is open
    if (deleteDialogOpen || isDialogOpen || createStrategyOpen) return;
    
    setSelectedStrategyType(strategyType);
    setCreateStrategyOpen(true);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Strategy Types</h2>
        <Button
          onClick={startCreate}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Strategy Type
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Strategy Type' : 'Create New Strategy Type'}
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? 'Update your strategy type details below.'
                : 'Add a new strategy type to organize your approaches.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit">
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                      startEdit(strategyType);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog 
                    open={deleteDialogOpen === strategyType.id}
                    onOpenChange={(open) => setDeleteDialogOpen(open ? strategyType.id : null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Strategy Type</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{strategyType.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(strategyType.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

      <CreateStrategyDialog
        open={createStrategyOpen}
        onOpenChange={setCreateStrategyOpen}
        strategyType={selectedStrategyType}
      />
    </div>
  );
}