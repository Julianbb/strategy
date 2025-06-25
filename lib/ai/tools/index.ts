import { createDocument, CreateDocumentProps} from "./create-document";
import { getWeather,bmiCalculator } from "./get-weather";
import { requestSuggestions,RequestSuggestionsProps } from "./request-suggestions";
import { getUserbyEmail, createUserbyEmailandPassword } from "./table-user";
import { updateDocument,UpdateDocumentProps } from "./update-document";
import { createTradeWithSession, CreateTradeProps } from "./table-trades";



export const toolFactories = {
    createDocument: {
      name: 'createDocument',
      factory: (deps: CreateDocumentProps) => createDocument(deps),
    },
    getWeather: {
      name: 'getWeather',
      factory: () => getWeather,
    },
    bmiCalculator:{
        name: 'bmiCalculator',
        factory: () => bmiCalculator,
    },
    requestSuggestions: {
      name: 'requestSuggestions',
      factory: (deps: RequestSuggestionsProps) => requestSuggestions(deps),
    },
    getUserbyEmail: {
      name: 'getUserbyEmail',
      factory: () => getUserbyEmail,
    },
    createUserbyEmailandPassword: {
      name: 'createUserbyEmailandPassword',
      factory: () => createUserbyEmailandPassword,
    },
    updateDocument: {
      name: 'updateDocument',
      factory: (deps: UpdateDocumentProps) => updateDocument(deps),
    },
    createTradeWithSession: {
      name: 'createTradeWithSession',
      factory: (deps: CreateTradeProps) => createTradeWithSession(deps),
    },
  };