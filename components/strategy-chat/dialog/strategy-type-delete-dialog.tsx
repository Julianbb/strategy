'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface StrategyTypeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow?: StrategyType;
  onSuccess: () => void;
}

export function StrategyTypeDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: StrategyTypeDeleteDialogProps) {
  const handleDelete = async () => {
    if (!currentRow) return;

    try {
      const response = await fetch(`/api/strategy-types?id=${currentRow.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error deleting strategy type:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Strategy Type</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{currentRow?.name}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}