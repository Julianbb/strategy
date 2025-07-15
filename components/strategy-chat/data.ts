import { Play, Pause, Square, CheckCircle } from 'lucide-react'

export const strategyStatusTypes = [
  {
    value: 'active',
    label: 'Active',
    icon: Play,
  },
  {
    value: 'paused',
    label: 'Paused',
    icon: Pause,
  },
  {
    value: 'stopped',
    label: 'Stopped',
    icon: Square,
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: CheckCircle,
  },
]

export const strategyTypes = [
  {
    value: 'spot',
    label: 'Spot',
  },
  {
    value: 'futures',
    label: 'Futures',
  },
  {
    value: 'options',
    label: 'Options',
  },
]

export const baseCurrencies = [
  {
    value: 'USD',
    label: 'USD',
  },
  {
    value: 'EUR',
    label: 'EUR',
  },
  {
    value: 'BTC',
    label: 'BTC',
  },
  {
    value: 'ETH',
    label: 'ETH',
  },
]

export const statusColorMap = new Map([
  ['active', 'text-green-600 bg-green-50 border-green-200'],
  ['paused', 'text-yellow-600 bg-yellow-50 border-yellow-200'],
  ['stopped', 'text-red-600 bg-red-50 border-red-200'],
  ['completed', 'text-blue-600 bg-blue-50 border-blue-200'],
])