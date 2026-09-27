import React from 'react';
import { User, Phone, Mail, MapPin, Calendar, Users, Heart } from 'lucide-react';
import { PhotoUpload } from './PhotoUpload';

export interface PersonalInfoData {
  fullName: string;
  guardianName: string;
  guardianContactNumber: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  maritalStatus: 'Single' | 'Married' | 'Other' | '';
  mobileNumber: string;
  email: string;
  address: string;
  photoUrl?: string;
}

interface Step1PersonalInfoProps {
  data: PersonalInfoData;
  onChange: (field: keyof PersonalInfoData, value: string) => void;
  errors: Partial<Record<keyof PersonalInfoData, string>>;
}

export const Step1PersonalInfo: React.FC<Step1PersonalInfoProps> = ({
  data,
  onChange,
  errors,
}) => {
  return (
    <div id="step-1-personal-info" className="space-y-6 animate-fadeIn">
      {/* Section Header */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-[#0066A6]" />
          Personal Information
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Please enter your personal and contact details accurately as per your passport or citizenship.
        </p>
      </div>

      {/* Grid of Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Full Name */}
        <div>
          <label htmlFor="field-fullName" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="field-fullName"
              placeholder="e.g. Aarav Sharma"
              value={data.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.fullName
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.fullName && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.fullName}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="field-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              id="field-email"
              placeholder="name@example.com"
              value={data.email}
              onChange={(e) => onChange('email', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.email
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email}</p>}
        </div>

        {/* Mobile Number */}
        <div>
          <label htmlFor="field-mobileNumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Mobile Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              id="field-mobileNumber"
              placeholder="+977 98XXXXXXXX"
              value={data.mobileNumber}
              onChange={(e) => onChange('mobileNumber', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.mobileNumber
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.mobileNumber && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.mobileNumber}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="field-dateOfBirth" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Date of Birth <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="date"
              id="field-dateOfBirth"
              value={data.dateOfBirth}
              onChange={(e) => onChange('dateOfBirth', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 transition-all ${
                errors.dateOfBirth
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.dateOfBirth && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.dateOfBirth}</p>}
        </div>

        {/* Guardian's Name */}
        <div>
          <label htmlFor="field-guardianName" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Guardian's Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              id="field-guardianName"
              placeholder="e.g. Father or Mother name"
              value={data.guardianName}
              onChange={(e) => onChange('guardianName', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.guardianName
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.guardianName && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.guardianName}</p>}
        </div>

        {/* Guardian's Contact Number */}
        <div>
          <label htmlFor="field-guardianContactNumber" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Guardian's Contact Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              id="field-guardianContactNumber"
              placeholder="+977 98XXXXXXXX"
              value={data.guardianContactNumber}
              onChange={(e) => onChange('guardianContactNumber', e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                errors.guardianContactNumber
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
              }`}
            />
          </div>
          {errors.guardianContactNumber && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.guardianContactNumber}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Gender <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Male', 'Female', 'Other'] as const).map((genderOption) => (
              <label
                key={genderOption}
                id={`gender-option-${genderOption.toLowerCase()}`}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 border rounded-lg cursor-pointer text-sm font-medium transition-all ${
                  data.gender === genderOption
                    ? 'border-[#0066A6] bg-[#EBF4FA] text-[#0066A6] ring-1 ring-[#0066A6]'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={genderOption}
                  checked={data.gender === genderOption}
                  onChange={() => onChange('gender', genderOption)}
                  className="sr-only"
                />
                <span>{genderOption}</span>
              </label>
            ))}
          </div>
          {errors.gender && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.gender}</p>}
        </div>

        {/* Marital Status */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Marital Status <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['Single', 'Married', 'Other'] as const).map((statusOption) => (
              <label
                key={statusOption}
                id={`marital-option-${statusOption.toLowerCase()}`}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 border rounded-lg cursor-pointer text-sm font-medium transition-all ${
                  data.maritalStatus === statusOption
                    ? 'border-[#0066A6] bg-[#EBF4FA] text-[#0066A6] ring-1 ring-[#0066A6]'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="maritalStatus"
                  value={statusOption}
                  checked={data.maritalStatus === statusOption}
                  onChange={() => onChange('maritalStatus', statusOption)}
                  className="sr-only"
                />
                <span>{statusOption}</span>
              </label>
            ))}
          </div>
          {errors.maritalStatus && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{errors.maritalStatus}</p>
          )}
        </div>

        {/* Address (Span full width) */}
        <div className="md:col-span-2">
          <label htmlFor="field-address" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Address (Permanent / Current) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="field-address"
            placeholder="e.g. Ward No. 4, Putalisadak, Kathmandu, Nepal"
            value={data.address}
            onChange={(e) => onChange('address', e.target.value)}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
              errors.address
                ? 'border-rose-400 focus:ring-rose-200'
                : 'border-slate-300 focus:border-[#0066A6] focus:ring-blue-100'
            }`}
          />
          {errors.address && <p className="mt-1 text-xs text-rose-500 font-medium">{errors.address}</p>}
        </div>

        {/* Photo Upload (Span full width) */}
        <div className="md:col-span-2 pt-2">
          <PhotoUpload
            value={data.photoUrl}
            onChange={(url) => onChange('photoUrl', url)}
            onRemove={() => onChange('photoUrl', '')}
          />
        </div>
      </div>
    </div>
  );
};
