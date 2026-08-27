import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useMembers } from '../../hooks/useMembers'
import { useUIStore } from '../../store/uiStore'
import { useTranslation } from 'react-i18next'
import type { MemberData } from '../../hooks/useMembers'

interface MemberFormProps {
  editMember?: MemberData
}

export function MemberForm({ editMember }: MemberFormProps) {
  const { createMember, updateMember } = useMembers()
  const closeModal = useUIStore((s) => s.closeModal)
  const { t } = useTranslation()

  const memberSchema = z.object({
    name: z.string().min(1, t('membership.nameRequired')),
    name_bn: z.string().optional(),
    guardian_name: z.string().optional(),
    mother_name: z.string().optional(),
    spouse_name: z.string().optional(),
    date_of_birth: z.string().optional(),
    gender: z.string().optional(),
    blood_group: z.string().optional(),
    marital_status: z.string().optional(),
    nid: z.string().optional(),

    college_name: z.string().optional(),
    college_code: z.string().optional(),
    designation: z.string().optional(),
    department: z.string().optional(),
    employee_id: z.string().optional(),
    mpo_index_number: z.string().optional(),
    mpo_enrolled_date: z.string().optional(),
    govt_service_date: z.string().optional(),
    present_college_joining_date: z.string().optional(),
    retirement_date: z.string().optional(),
    employment_status: z.string().optional(),

    phone: z.string().optional(),
    email: z.string().optional(),
    present_address: z.string().optional(),
    permanent_address: z.string().optional(),

    nominee_name: z.string().optional(),
    nominee_relation: z.string().optional(),
    nominee_nid: z.string().optional(),
    nominee_phone: z.string().optional(),
    nominee_address: z.string().optional(),

    bank_name: z.string().optional(),
    bank_account_number: z.string().optional(),
    branch_name: z.string().optional(),
    routing_number: z.string().optional(),

    qualification: z.string().optional(),
    remarks: z.string().optional(),
  })

  type MemberFormData = z.infer<typeof memberSchema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: editMember ? {
      name: editMember.name,
      name_bn: editMember.name_bn || '',
      guardian_name: editMember.guardian_name || '',
      mother_name: editMember.mother_name || '',
      spouse_name: editMember.spouse_name || '',
      date_of_birth: editMember.date_of_birth || '',
      gender: editMember.gender || '',
      blood_group: editMember.blood_group || '',
      marital_status: editMember.marital_status || '',
      nid: editMember.nid || '',
      college_name: editMember.college_name || '',
      college_code: editMember.college_code || '',
      designation: editMember.designation || '',
      department: editMember.department || '',
      employee_id: editMember.employee_id || '',
      mpo_index_number: editMember.mpo_index_number || '',
      mpo_enrolled_date: editMember.mpo_enrolled_date || '',
      govt_service_date: editMember.govt_service_date || '',
      present_college_joining_date: editMember.present_college_joining_date || '',
      retirement_date: editMember.retirement_date || '',
      employment_status: editMember.employment_status || '',
      phone: editMember.phone || '',
      email: editMember.email || '',
      present_address: editMember.present_address || '',
      permanent_address: editMember.permanent_address || '',
      nominee_name: editMember.nominee_name || '',
      nominee_relation: editMember.nominee_relation || '',
      nominee_nid: editMember.nominee_nid || '',
      nominee_phone: editMember.nominee_phone || '',
      nominee_address: editMember.nominee_address || '',
      bank_name: editMember.bank_name || '',
      bank_account_number: editMember.bank_account_number || '',
      branch_name: editMember.branch_name || '',
      routing_number: editMember.routing_number || '',
      qualification: editMember.qualification || '',
      remarks: editMember.remarks || '',
    } : undefined,
  })

  const onSubmit = async (data: MemberFormData) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    ) as Partial<MemberFormData>

    if (editMember) {
      await updateMember(editMember.id, cleaned as Partial<MemberData>)
    } else {
      await createMember(cleaned as Partial<MemberData>)
    }
    closeModal()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.personalInfo')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="name" label={t('membership.nameEnglish')} {...register('name')} error={errors.name?.message} />
          <Input id="name_bn" label={t('membership.nameBangla')} {...register('name_bn')} />
          <Input id="guardian_name" label={t('membership.fatherHusbandName')} {...register('guardian_name')} />
          <Input id="mother_name" label={t('membership.motherName')} {...register('mother_name')} />
          <Input id="spouse_name" label={t('membership.spouseName')} {...register('spouse_name')} />
          <Input id="date_of_birth" label={t('membership.dateOfBirth')} type="date" {...register('date_of_birth')} />
          <div>
            <label className="font-medium text-sm text-gray-700">{t('membership.gender')}</label>
            <select {...register('gender')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500">
              <option value="">{t('membership.selectOption')}</option>
              <option value="male">{t('membership.male')}</option>
              <option value="female">{t('membership.female')}</option>
              <option value="other">{t('membership.other')}</option>
            </select>
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700">{t('membership.bloodGroup')}</label>
            <select {...register('blood_group')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500">
              <option value="">{t('membership.selectOption')}</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="font-medium text-sm text-gray-700">{t('membership.maritalStatus')}</label>
            <select {...register('marital_status')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500">
              <option value="">{t('membership.selectOption')}</option>
              <option value="unmarried">{t('membership.maritalSingle')}</option>
              <option value="married">{t('membership.maritalMarried')}</option>
              <option value="widowed">{t('membership.maritalWidowed')}</option>
              <option value="divorced">{t('membership.maritalDivorced')}</option>
            </select>
          </div>
          <Input id="nid" label={t('membership.nidNumber')} {...register('nid')} />
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.collegeEmploymentInfo')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="college_name" label={t('membership.collegeName')} {...register('college_name')} />
          <Input id="college_code" label={t('membership.collegeEiinCode')} {...register('college_code')} />
          <Input id="designation" label={t('membership.designation')} {...register('designation')} />
          <Input id="department" label={t('membership.department')} {...register('department')} />
          <Input id="employee_id" label={t('membership.employeeId')} {...register('employee_id')} />
          <Input id="mpo_index_number" label={t('membership.mpoIndexNumber')} {...register('mpo_index_number')} />
          <Input id="mpo_enrolled_date" label={t('membership.mpoEnrolledDate')} type="date" {...register('mpo_enrolled_date')} />
          <Input id="govt_service_date" label={t('membership.govtServiceDate')} type="date" {...register('govt_service_date')} />
          <Input id="present_college_joining_date" label={t('membership.presentCollegeJoiningDate')} type="date" {...register('present_college_joining_date')} />
          <Input id="retirement_date" label={t('membership.retirementDate')} type="date" {...register('retirement_date')} />
          <div>
            <label className="font-medium text-sm text-gray-700">{t('membership.employmentStatus')}</label>
            <select {...register('employment_status')} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500">
              <option value="">{t('membership.selectOption')}</option>
              <option value="permanent">{t('membership.employmentPermanent')}</option>
              <option value="deputation">{t('membership.employmentDeputation')}</option>
              <option value="contract">{t('membership.employmentContract')}</option>
              <option value="other">{t('membership.other')}</option>
            </select>
          </div>
          <Input id="qualification" label={t('membership.highestQualification')} {...register('qualification')} />
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.contactAddress')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="phone" label={t('membership.phonePrimary')} {...register('phone')} />
          <Input id="email" label={t('auth.email')} type="email" {...register('email')} />
          <div className="md:col-span-2">
            <Input id="present_address" label={t('membership.presentAddress')} {...register('present_address')} />
          </div>
          <div className="md:col-span-2">
            <Input id="permanent_address" label={t('membership.permanentAddress')} {...register('permanent_address')} />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.nomineeBeneficiary')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="nominee_name" label={t('membership.nomineeName')} {...register('nominee_name')} />
          <Input id="nominee_relation" label={t('membership.relation')} {...register('nominee_relation')} />
          <Input id="nominee_nid" label={t('membership.nomineeNid')} {...register('nominee_nid')} />
          <Input id="nominee_phone" label={t('membership.nomineePhone')} {...register('nominee_phone')} />
          <div className="md:col-span-2">
            <Input id="nominee_address" label={t('membership.nomineeAddress')} {...register('nominee_address')} />
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.bankInformation')}</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input id="bank_name" label={t('membership.bankName')} {...register('bank_name')} />
          <Input id="bank_account_number" label={t('membership.bankAccountNumber')} {...register('bank_account_number')} />
          <Input id="branch_name" label={t('membership.branchName')} {...register('branch_name')} />
          <Input id="routing_number" label={t('membership.routingNumber')} {...register('routing_number')} />
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">{t('membership.additional')}</legend>
        <div className="grid grid-cols-1 gap-4">
          <Input id="remarks" label={t('membership.remarksNotes')} {...register('remarks')} />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white pb-2">
        <Button type="button" variant="secondary" onClick={closeModal}>{t('common.cancel')}</Button>
        <Button type="submit" loading={isSubmitting}>{editMember ? t('membership.updateMember') : t('membership.createMember')}</Button>
      </div>
    </form>
  )
}
