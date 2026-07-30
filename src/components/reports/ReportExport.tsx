import { exportToCSV } from '../../lib/export'
import { Button } from '../ui/Button'
import { Download } from 'lucide-react'

interface ReportExportProps {
  filename: string
  headers: string[]
  data: string[][]
}

export function ReportExport({ filename, headers, data }: ReportExportProps) {
  return (
    <Button size="sm" variant="secondary" onClick={() => exportToCSV(filename, headers, data)}>
      <Download className="h-4 w-4 mr-1" /> CSV
    </Button>
  )
}
