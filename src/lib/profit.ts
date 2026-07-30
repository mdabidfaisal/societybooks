export interface EMIResult {
  installment_no: number
  principal_amount: number
  profit_amount: number
  total_amount: number
  due_date: Date
}

export function flatRateEMI(
  principal: number,
  rate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): EMIResult[] {
  const totalProfit = principal * (rate / 100) * (tenureMonths / 12)
  const totalAmount = principal + totalProfit
  const emiAmount = totalAmount / tenureMonths
  const principalPerInstallment = principal / tenureMonths
  const profitPerInstallment = totalProfit / tenureMonths

  return Array.from({ length: tenureMonths }, (_, i) => {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i + 1)
    return {
      installment_no: i + 1,
      principal_amount: Math.round(principalPerInstallment * 100) / 100,
      profit_amount: Math.round(profitPerInstallment * 100) / 100,
      total_amount: Math.round(emiAmount * 100) / 100,
      due_date: dueDate,
    }
  })
}

export function reducingBalanceEMI(
  principal: number,
  rate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): EMIResult[] {
  const monthlyRate = rate / 12 / 100
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / (Math.pow(1 + monthlyRate, tenureMonths) - 1)

  let remainingPrincipal = principal
  const schedule: EMIResult[] = []

  for (let i = 0; i < tenureMonths; i++) {
    const profitAmount = remainingPrincipal * monthlyRate
    const principalAmount = emi - profitAmount
    remainingPrincipal -= principalAmount

    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i + 1)

    schedule.push({
      installment_no: i + 1,
      principal_amount: Math.round(principalAmount * 100) / 100,
      profit_amount: Math.round(profitAmount * 100) / 100,
      total_amount: Math.round(emi * 100) / 100,
      due_date: dueDate,
    })
  }

  return schedule
}

export function calculateEMISchedule(
  principal: number,
  rate: number,
  tenureMonths: number,
  method: 'flat' | 'reducing_balance',
  startDate?: Date
): EMIResult[] {
  if (method === 'flat') {
    return flatRateEMI(principal, rate, tenureMonths, startDate)
  }
  return reducingBalanceEMI(principal, rate, tenureMonths, startDate)
}
