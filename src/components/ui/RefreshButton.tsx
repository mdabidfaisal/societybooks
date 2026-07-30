import { RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { useState } from 'react'

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void
}

export function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false)

  const handleClick = async () => {
    setSpinning(true)
    await onRefresh()
    setTimeout(() => setSpinning(false), 500)
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={spinning}>
      <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
    </Button>
  )
}
