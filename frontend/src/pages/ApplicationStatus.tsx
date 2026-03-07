import React from 'react';
import { motion } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';
import { useAuth } from '../context/AuthContext';
interface ApplicationStatusProps {
  onStartEnrollment: () => void;
  onGoToRequirements: () => void;
}
export function ApplicationStatus({
  onStartEnrollment,
  onGoToRequirements
}: ApplicationStatusProps) {
  const { user } = useAuth();
  const { getStudentEnrollment, deleteEnrollment } = useEnrollment();
  const [isDeleting, setIsDeleting] = React.useState(false);
  // In a real app, we'd pass the user ID. Here we just get the latest enrollment.
  const enrollment = getStudentEnrollment(user?.name || '');
  if (!enrollment) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{
            scale: 0
          }}
          animate={{
            scale: 1
          }}
          className="w-32 h-32 bg-[#FBCFE8] rounded-full flex items-center justify-center mb-6">

          <span className="text-4xl font-bold text-gray-700">FORM</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          No Application Found
        </h2>
        <p className="text-gray-500 mb-8 max-w-md">
          You haven't submitted an enrollment application yet. Start your
          journey with St. Joseph Daycare today!
        </p>
        <button
          onClick={onStartEnrollment}
          className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-8 py-4 rounded-full font-bold text-gray-800 text-lg shadow-md hover:shadow-lg transition-all">

          Start Enrollment
        </button>
      </div>);

  }
  const hasUploadedRequirements = enrollment.requirements.length > 0;

  const handleDeleteEnrollment = async () => {
    const shouldDelete = window.confirm(
      'Are you sure you want to delete this enrollment record? This cannot be undone.'
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    const { error } = await deleteEnrollment(enrollment.id);
    setIsDeleting(false);

    if (error) {
      window.alert(error);
    }
  };

  const steps = [
  {
    label: 'Submitted',
    status: 'completed'
  },
  {
    label: 'Requirements',
    status: hasUploadedRequirements ? 'completed' : 'current'
  },
  {
    label: 'Under Review',
    status:
    enrollment.status === 'Pending' ?
    hasUploadedRequirements ?
    'current' :
    'upcoming' :
    'completed'
  },
  {
    label: 'Decision',
    status: enrollment.status === 'Pending' ? 'upcoming' : 'completed'
  }];

  const completedSteps = steps.filter((step) => step.status === 'completed').length;
  const progressPercentage = Math.round(completedSteps / steps.length * 100);

  return (
    <div className="p-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">
          Application Status
        </h1>
        <p className="text-gray-500 mt-1 text-base">
          Track the status of your enrollment application.
        </p>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-blue-100">

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold text-gray-800">
              {enrollment.childFirstName} {enrollment.childLastName}
            </h2>
            <p className="text-gray-500 font-semibold">{enrollment.program}</p>
            <p className="text-xs uppercase tracking-wide text-gray-400 font-bold">
              Submitted {new Date(enrollment.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <div
            className={`px-4 py-2 rounded-full font-bold text-sm ${enrollment.status === 'Approved' ? 'bg-[#BBF7D0] text-green-800' : enrollment.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>

            {enrollment.status.toUpperCase()}
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-blue-100 bg-[#F8FAFC] p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">Overall Progress</p>
            <p className="text-sm font-extrabold text-blue-700">{progressPercentage}%</p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-blue-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#1D4ED8]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Tracker */}
        <div className="relative flex justify-between items-start mb-8 px-2">
          {/* Line */}
          <div className="absolute left-0 right-0 top-5 h-1 bg-blue-100 -z-10" />

          {steps.map((step, index) =>
          <div
            key={index}
            className="flex flex-col items-center bg-white px-2 min-w-[90px]">

              <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-4 mb-2 text-xs font-extrabold ${step.status === 'completed' ? 'bg-[#60A5FA] border-[#60A5FA] text-white' : step.status === 'current' ? 'bg-white border-[#60A5FA] text-[#1D4ED8]' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>

                {step.status === 'completed' && 'OK'}
                {step.status === 'current' &&
              <div className="w-3 h-3 bg-[#60A5FA] rounded-full" />
              }
                {step.status === 'upcoming' && '•'}
              </div>
              <span
              className={`text-xs font-bold text-center ${step.status === 'upcoming' ? 'text-gray-400' : 'text-gray-700'}`}>

                {step.label}
              </span>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-[#F8FAFC] rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-800 mb-4">
            Application Checklist
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg bg-white border border-blue-100 px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-[#BBF7D0] flex items-center justify-center text-[10px] font-bold text-green-800">
                OK
              </div>
              <span className="text-gray-700 font-semibold">
                Application Form Submitted
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(enrollment.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white border border-blue-100 px-3 py-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${hasUploadedRequirements ? 'bg-[#BBF7D0] text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>

                {hasUploadedRequirements ? 'OK' : '...' }
              </div>
              <span className="text-gray-700 font-semibold">
                Requirements Uploaded
              </span>
              {!hasUploadedRequirements ?
              <button
                type="button"
                onClick={onGoToRequirements}
                className="ml-auto text-xs font-bold text-blue-700 hover:underline"
              >
                Submit Documents
              </button> :
              null}
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white border border-blue-100 px-3 py-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${enrollment.status !== 'Pending' ? 'bg-[#BBF7D0] text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>

                {enrollment.status !== 'Pending' ? 'OK' : '...'}
              </div>
              <span className="text-gray-700 font-semibold">Admin Review</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-red-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-red-500 font-semibold">
            Danger Zone: deleting removes this enrollment record permanently.
          </p>
          <button
            type="button"
            onClick={handleDeleteEnrollment}
            disabled={isDeleting}
            className="bg-red-100 hover:bg-red-200 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-bold text-red-700 transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete Enrollment'}
          </button>
        </div>
      </motion.div>
    </div>);

}