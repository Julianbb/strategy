import { StrategyChatActionDialog } from './strategy-chat-action-dialog'
import { StrategyChatDeleteDialog } from './strategy-chat-delete-dialog'
import { StrategyChatNavigateDialog } from './strategy-chat-navigate-dialog'

export function StrategyChatDialogs() {

  return (
    <>
      <StrategyChatActionDialog />
      <StrategyChatDeleteDialog />
      <StrategyChatNavigateDialog />
    </>
  )
}