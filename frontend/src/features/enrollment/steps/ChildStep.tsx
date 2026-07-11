import { FileTextIcon, ImageIcon, TriangleAlertIcon } from 'lucide-react';
import { Field, Input, Select, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { StepHeading } from './StepHeading';
import { normalizeDateOfBirthInput } from '../helpers';
import type { EnrollmentFormApi } from '../types';

export function ChildStep({ form }: { form: EnrollmentFormApi }) {
  const {
    formData,
    updateFormData,
    previewUrl,
    effectiveIdPicture,
    handleFileChange,
    allowedBirthdateRange,
    exactAgeLabel,
    regionOptions,
    provinceOptions,
    municipalityOptions,
    barangayOptions,
    isRegionSelected,
    isProvinceSelected,
    isMunicipalitySelected,
    isProvinceAutoFilled,
    hasProvinceLevel,
    isLoadingRegions,
    isLoadingProvinces,
    isLoadingMunicipalities,
    isLoadingBarangays,
    handleRegionChange,
    handleProvinceChange,
    handleMunicipalityChange,
    handleBarangayChange,
    addressLookupError,
    shouldAutoWaitlistForAddress,
  } = form;

  return (
    <div className="space-y-6">
      <StepHeading
        title="Learner information"
        description="Tell us about the child you're enrolling. Age and program placement are calculated from the birthday."
      />

      {/* ID picture */}
      <div className="flex flex-col items-center gap-2">
        <label
          className={cn(
            'group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors',
            previewUrl || effectiveIdPicture
              ? 'border-brand/40 bg-brand-tint'
              : 'border-line-strong bg-surface-sunk hover:border-brand/40 hover:bg-brand-tint/50',
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Uploaded ID preview" className="h-full w-full object-cover" />
          ) : effectiveIdPicture?.type === 'application/pdf' ? (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-brand-strong">
              <FileTextIcon className="h-6 w-6" />
              <span className="line-clamp-2 break-words text-2xs font-medium">{effectiveIdPicture.name}</span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-muted">
              <ImageIcon className="h-6 w-6" />
              <span className="text-2xs font-semibold">2x2 ID picture</span>
            </span>
          )}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Upload the learner's 2x2 ID picture"
          />
        </label>
        <p className="text-xs font-medium text-muted">
          ID picture <span className="text-danger">*</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="First name" required>
          {({ id }) => (
            <Input
              id={id}
              value={formData.childFirstName}
              onChange={(event) => updateFormData('childFirstName', event.target.value)}
              placeholder="Juan"
            />
          )}
        </Field>
        <Field label="Middle name">
          {({ id }) => (
            <Input
              id={id}
              value={formData.childMiddleName}
              onChange={(event) => updateFormData('childMiddleName', event.target.value)}
              placeholder="Santos"
            />
          )}
        </Field>
        <Field label="Last name" required>
          {({ id }) => (
            <Input
              id={id}
              value={formData.childLastName}
              onChange={(event) => updateFormData('childLastName', event.target.value)}
              placeholder="Dela Cruz"
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Sex" required>
          {({ id }) => (
            <div id={id} className="flex rounded-xl border border-line bg-surface-sunk p-1">
              {(['Male', 'Female'] as const).map((option) => {
                const active = formData.sex === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateFormData('sex', option)}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                      active ? 'bg-surface text-brand-strong shadow-sm' : 'text-muted hover:text-ink',
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </Field>
        <Field label="Birthday" required>
          {({ id }) => (
            <Input
              id={id}
              type="date"
              min={allowedBirthdateRange.min}
              max={allowedBirthdateRange.max}
              value={formData.dateOfBirth}
              onChange={(event) => updateFormData('dateOfBirth', normalizeDateOfBirthInput(event.target.value))}
            />
          )}
        </Field>
        <Field label="Age" hint={exactAgeLabel}>
          {({ id }) => (
            <Input
              id={id}
              type="text"
              readOnly
              value={formData.dateOfBirth && formData.age > 0 ? String(formData.age) : ''}
              placeholder="From birthday"
              className="bg-surface-sunk text-muted"
            />
          )}
        </Field>
      </div>

      <Field label="Child's PhilSys number">
        {({ id }) => (
          <Input
            id={id}
            value={formData.childPhilSysNumber}
            onChange={(event) => updateFormData('childPhilSysNumber', event.target.value)}
            placeholder="Enter the child's PhilSys number"
          />
        )}
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Street address" required className="md:col-span-2">
          {({ id }) => (
            <Input
              id={id}
              value={formData.streetAddress}
              onChange={(event) => updateFormData('streetAddress', event.target.value)}
              placeholder="House no., street, subdivision"
            />
          )}
        </Field>

        <Field label="Region" required>
          {({ id }) => (
            <Select
              id={id}
              value={formData.regionCode}
              onChange={(event) => handleRegionChange(event.target.value)}
              disabled={isLoadingRegions}
            >
              <option value="">{isLoadingRegions ? 'Loading regions…' : 'Select region'}</option>
              {regionOptions.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Province" required>
          {({ id }) =>
            isProvinceAutoFilled ? (
              <Input id={id} value={formData.province} readOnly className="bg-surface-sunk text-muted" placeholder="Province" />
            ) : (
              <Select
                id={id}
                value={formData.provinceCode}
                onChange={(event) => handleProvinceChange(event.target.value)}
                disabled={!isRegionSelected || isLoadingProvinces}
              >
                <option value="">
                  {!isRegionSelected
                    ? 'Select region first'
                    : isLoadingProvinces
                      ? 'Loading provinces…'
                      : 'Select province'}
                </option>
                {provinceOptions.map((province) => (
                  <option key={province.code} value={province.code}>
                    {province.name}
                  </option>
                ))}
              </Select>
            )
          }
        </Field>

        <Field label="City / municipality" required>
          {({ id }) => (
            <Select
              id={id}
              value={formData.municipalityCode}
              onChange={(event) => handleMunicipalityChange(event.target.value)}
              disabled={!isProvinceSelected || isLoadingMunicipalities}
            >
              <option value="">
                {!isRegionSelected
                  ? 'Select region first'
                  : hasProvinceLevel && !formData.provinceCode
                    ? 'Select province first'
                    : isLoadingMunicipalities
                      ? 'Loading cities and municipalities…'
                      : 'Select city / municipality'}
              </option>
              {municipalityOptions.map((municipality) => (
                <option key={municipality.code} value={municipality.code}>
                  {municipality.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Barangay" required>
          {({ id }) => (
            <Select
              id={id}
              value={formData.barangay}
              onChange={(event) => handleBarangayChange(event.target.value)}
              disabled={!isMunicipalitySelected || isLoadingBarangays}
            >
              <option value="">
                {!isMunicipalitySelected
                  ? 'Select city / municipality first'
                  : isLoadingBarangays
                    ? 'Loading barangays…'
                    : 'Select barangay'}
              </option>
              {barangayOptions.map((barangay) => (
                <option key={barangay.code} value={barangay.name}>
                  {barangay.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Full address" hint="Built automatically from the fields above" className="md:col-span-2">
          {({ id }) => (
            <Textarea id={id} value={formData.address} readOnly rows={2} className="resize-none bg-surface-sunk text-muted" placeholder="Address preview" />
          )}
        </Field>
      </div>

      {addressLookupError ? (
        <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {addressLookupError}
        </p>
      ) : null}

      {shouldAutoWaitlistForAddress ? (
        <p className="flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          Applicants outside Cainta, Rizal are automatically placed on the waitlist after submission.
        </p>
      ) : null}
    </div>
  );
}
