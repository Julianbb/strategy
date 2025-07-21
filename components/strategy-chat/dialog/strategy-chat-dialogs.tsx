import { StrategyChatActionDialog } from './strategy-chat-action-dialog'
import { StrategyChatDeleteDialog } from './strategy-chat-delete-dialog'
import { StrategyChatNavigateDialog } from './strategy-chat-navigate-dialog'
import { StrategyTypeActionDialog } from './strategy-type-action-dialog'
import { StrategyTypeDeleteDialog } from './strategy-type-delete-dialog'
import { useStrategyChat } from './strategy-chat-context'

export function StrategyChatDialogs() {
  const { 
    open, 
    setOpen, 
    currentStrategyType, 
    setCurrentStrategyType, 
    fetchStrategyTypes 
  } = useStrategyChat()

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(null)
      setTimeout(() => setCurrentStrategyType(undefined), 500)
    }
  }

  const handleSuccess = () => {
    fetchStrategyTypes()
  }

  const handleDelete = () => {
    if (currentStrategyType) {
      setCurrentStrategyType(currentStrategyType)
      setOpen('strategy-type-delete')
    }
  }

  return (
    <>
      <StrategyChatActionDialog />
      <StrategyChatDeleteDialog />
      <StrategyChatNavigateDialog />
      
      <StrategyTypeActionDialog
        key={`strategy-type-create-${currentStrategyType?.id || 'new'}`}
        open={open === 'strategy-type-create' || open === 'strategy-type-edit'}
        onOpenChange={handleOpenChange}
        currentRow={open === 'strategy-type-edit' ? currentStrategyType : undefined}
        onSuccess={handleSuccess}
        onDelete={open === 'strategy-type-edit' ? handleDelete : undefined}
      />

      <StrategyTypeDeleteDialog
        key={`strategy-type-delete-${currentStrategyType?.id || 'none'}`}
        open={open === 'strategy-type-delete'}
        onOpenChange={handleOpenChange}
        currentRow={currentStrategyType}
        onSuccess={handleSuccess}
      />
    </>
  )
}