import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-6">{t('common.pageNotFound')}</p>
        <Button onClick={() => navigate('/dashboard')}>{t('common.goToDashboard')}</Button>
      </div>
    </div>
  )
}
