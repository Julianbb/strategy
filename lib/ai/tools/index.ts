
import { createTradeWithSession, CreateTradeProps, deleteTradeWithSession, DeleteTradeProps, updateTradeWithSession, UpdateTradeProps } from "./table-trades";



export const toolFactories = {
  
    createTradeWithSession: {
      name: 'createTradeWithSession',
      factory: (deps: CreateTradeProps) => createTradeWithSession(deps),
    },
    deleteTradeWithSession:{
      name:'deleteTradeWithSession',
      factory: (deps: DeleteTradeProps) => deleteTradeWithSession(deps),
    },
    updateTradeWithSession:{
      name:'updateTradeWithSession',
      factory: (deps: UpdateTradeProps) => updateTradeWithSession(deps),
    }
  };