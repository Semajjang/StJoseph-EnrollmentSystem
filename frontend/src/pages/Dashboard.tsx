// ...existing code...
import { motion } from 'framer-motion';
export function Dashboard() {
  const classroomStats = [
  {
    label: 'Infant Room',
    count: 8,
    capacity: 10,
    tag: 'IN',
    color: 'bg-pink-50 border-pink-100',
    barColor: 'bg-pink-400',
    tagColor: 'bg-pink-100 text-pink-700'
  },
  {
    label: 'Toddler Room',
    count: 12,
    capacity: 15,
    tag: 'TD',
    color: 'bg-blue-50 border-blue-100',
    barColor: 'bg-blue-400',
    tagColor: 'bg-blue-100 text-blue-700'
  },
  {
    label: 'Pre-K Room',
    count: 18,
    capacity: 20,
    tag: 'PK',
    color: 'bg-violet-50 border-violet-100',
    barColor: 'bg-violet-400',
    tagColor: 'bg-violet-100 text-violet-700'
  },
  {
    label: 'After School',
    count: 14,
    capacity: 25,
    tag: 'AS',
    color: 'bg-emerald-50 border-emerald-100',
    barColor: 'bg-emerald-400',
    tagColor: 'bg-emerald-100 text-emerald-700'
  }];

  const recentEnrollments = [
  {
    name: 'Emma Thompson',
    program: 'Toddler Room',
    date: 'Today'
  },
  {
    name: 'Liam Johnson',
    program: 'Pre-K Room',
    date: 'Yesterday'
  },
  {
    name: 'Sophia Davis',
    program: 'Infant Room',
    date: '2 days ago'
  }];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview of St. Joseph Daycare enrollment status.
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible">

        {classroomStats.map((stat) =>
        <motion.div
          key={stat.label}
          variants={itemVariants}
          className={`bg-white rounded-xl border p-5 ${stat.color}`}>

            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${stat.tagColor}`}>
                {stat.tag}
              </span>
              <span className="text-xs text-slate-400">{stat.count}/{stat.capacity}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600 mb-1">{stat.label}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{stat.count}</span>
              <span className="text-sm text-slate-400">enrolled</span>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${stat.barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${(stat.count / stat.capacity) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.2 }} />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl border border-slate-200 p-6">

          <h2 className="font-semibold text-slate-800 text-base mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-start gap-1 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-colors group">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 group-hover:text-blue-500">Enroll</span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">New Enrollment</span>
            </button>
            <button className="flex flex-col items-start gap-1 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-pink-50 hover:border-pink-200 transition-colors group">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 group-hover:text-pink-500">Wait</span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">View Waitlist</span>
            </button>
            <button className="flex flex-col items-start gap-1 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 transition-colors group">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 group-hover:text-violet-500">Rpt</span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Reports</span>
            </button>
            <button className="flex flex-col items-start gap-1 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors group">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400 group-hover:text-emerald-500">Call</span>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Contact Parents</span>
            </button>
          </div>
        </motion.div>

        {/* Recent Enrollments */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-xl border border-slate-200 p-6">

          <h2 className="font-semibold text-slate-800 text-base mb-4">Recent Enrollments</h2>
          <div className="space-y-3">
            {recentEnrollments.map((enrollment, index) =>
            <div
              key={index}
              className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                    {enrollment.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{enrollment.name}</p>
                    <p className="text-xs text-slate-500">{enrollment.program}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{enrollment.date}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Notice Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-900">Spring Registration Open</p>
          <p className="text-xs text-blue-600 mt-0.5">Early bird discount ends March 15th</p>
        </div>
        <button className="shrink-0 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors">
          Learn More
        </button>
      </motion.div>
    </div>);
}