// ...existing code...
import { motion } from 'framer-motion';
import { useEnrollment } from '../context/EnrollmentContext';

interface ChildProfileProps {
  onStartEnrollment: () => void;
}

export function ChildProfile({ onStartEnrollment }: ChildProfileProps) {
  const { enrollments } = useEnrollment();

  if (enrollments.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-32 h-32 bg-[#DBEAFE] rounded-full flex items-center justify-center mb-6"
        >
          <span className="text-4xl font-bold text-blue-700">CH</span>
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Child Record Yet</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Submit an enrollment first so you can view your child details here.
        </p>
        <button
          onClick={onStartEnrollment}
          className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-8 py-4 rounded-full font-bold text-gray-800 text-lg shadow-md hover:shadow-lg transition-all"
        >
          Start Enrollment
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Your Children</h1>
        <p className="text-gray-500 mt-1 text-base">
          Enrollment details currently available in the portal for each child.
        </p>
      </div>

      <div className="space-y-4">
        {enrollments.map((enrollment) => {
          const rawSectionLabel = enrollment.section && enrollment.section.trim() ? enrollment.section.trim() : '';
          const sectionMatch = rawSectionLabel.match(/^(.*?)(?:\s*\(([^()]+)\))?$/);
          const sectionName = sectionMatch?.[1]?.trim() || '';
          const sectionScheduleRange = sectionMatch?.[2]?.trim() || '';
          const sectionLabel = sectionName || 'Not assigned yet';
          const rawSchedule = typeof enrollment.formData?.schedule === 'string' ?
            enrollment.formData.schedule :
            '';
          const normalizedSchedule = rawSchedule.trim().toUpperCase();
          const inferredFromSection = sectionScheduleRange.toUpperCase();
          const schedule =
            normalizedSchedule === 'AM' || normalizedSchedule === 'PM' ?
              normalizedSchedule :
              inferredFromSection.includes('AM') ?
                'AM' :
                inferredFromSection.includes('PM') ?
                  'PM' :
                  null;
          const scheduleTimeLabel =
            sectionScheduleRange ?
              sectionScheduleRange :
            schedule === 'AM' ?
              '10:00 AM - 12:00 PM' :
              schedule === 'PM' ?
                '1:00 PM - 3:00 PM' :
                'Not assigned yet';

          return (
            <motion.div
              key={enrollment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100"
            >
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
                  className={`px-4 py-2 rounded-full font-bold text-sm ${enrollment.status === 'Approved' ? 'bg-[#BBF7D0] text-green-800' : enrollment.status === 'Rejected' ? 'bg-red-100 text-red-800' : enrollment.status === 'Waitlisted' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}
                >
                  {enrollment.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-blue-100 bg-[#F8FAFC] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Current Section</p>
                  <p className="text-2xl font-extrabold text-gray-800">{sectionLabel}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-[#F8FAFC] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">Schedule</p>
                  <p className="text-2xl font-extrabold text-gray-800">{schedule || 'Not assigned yet'}</p>
                  <p className="text-sm font-semibold text-gray-500 mt-1">{scheduleTimeLabel}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
