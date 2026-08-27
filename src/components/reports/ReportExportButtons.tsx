import { FileText, FileSpreadsheet } from 'lucide-react'
import { Button } from '../ui/Button'
import { useSamitiConfig } from '../../hooks/useSamitiConfig'
import { exportToExcel, printReport, type ReportData, type ReportTotal, type ReportSociety } from '../../lib/reportExport'
import { useTranslation } from 'react-i18next'

interface ReportExportButtonsProps {
  filename: string
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  totals?: ReportTotal[]
  orientation?: 'portrait' | 'landscape'
  samiti?: ReportSociety | null
}

export function ReportExportButtons({ filename, title, subtitle, headers, rows, totals, orientation, samiti: samitiOverride }: ReportExportButtonsProps) {
  const { settings } = useSamitiConfig()
  const { t } = useTranslation()

  const samiti: ReportSociety | null = samitiOverride ?? (settings
    ? {
        name: settings.samiti_name as string,
        code: settings.samiti_code as string,
        address: settings.address as string | undefined,
        phone: settings.phone as string | undefined,
      }
    : { name: t('layout.appName') })

  const data: ReportData = { filename, title, subtitle, headers, rows, totals, orientation }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={() => printReport(data, samiti)}>
        <FileText className="h-4 w-4 mr-1" /> {t('reports.downloadPdf')}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => exportToExcel(filename, title, headers, rows)}>
        <FileSpreadsheet className="h-4 w-4 mr-1" /> {t('reports.downloadExcel')}
      </Button>
    </div>
  )
}
