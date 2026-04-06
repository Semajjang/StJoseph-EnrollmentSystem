import { motion } from 'framer-motion';
interface ApplicationStatusProps {
  onStartEnrollment: () => void;
}
export function ApplicationStatus({
  onStartEnrollment
}: ApplicationStatusProps) {
  // Enrollment lookup removed. Show placeholder.
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-32 h-32 bg-[#FBCFE8] rounded-full flex items-center justify-center mb-6">
        <span className="text-4xl font-bold text-slate-700">FORM</span>
      </motion.div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        No Application Found
      </h2>
      <p className="text-slate-500 mb-8 max-w-md">
        You haven't submitted an enrollment application yet. Start your
        journey with St. Joseph Daycare today!
      </p>
      <button
        onClick={onStartEnrollment}
        className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-8 py-4 rounded-full font-bold text-slate-900 text-lg shadow-md hover:shadow-lg transition-all">
        Start Enrollment
      </button>
    </div>
  );
}