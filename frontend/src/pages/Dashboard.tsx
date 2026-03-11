// ...existing code...
import { motion } from 'framer-motion';
export function Dashboard() {
  const classroomStats = [
  {
    label: 'Infant Room',
    count: 8,
    capacity: 10,
    emoji: 'IN',
    color: '#FBCFE8'
  },
  {
    label: 'Toddler Room',
    count: 12,
    capacity: 15,
    emoji: 'TD',
    color: '#BAE6FD'
  },
  {
    label: 'Pre-K Room',
    count: 18,
    capacity: 20,
    emoji: 'PK',
    color: '#E9D5FF'
  },
  {
    label: 'After School',
    count: 14,
    capacity: 25,
    emoji: 'AS',
    color: '#BBF7D0'
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
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0
    }
  };
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">
          Welcome Back
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening at St. Joseph Daycare today.
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible">

        {classroomStats.map((stat) =>
        <motion.div
          key={stat.label}
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-md p-6 relative overflow-hidden">

            <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30 -mr-8 -mt-8"
            style={{
              backgroundColor: stat.color
            }} />

            <div className="relative">
              <span className="text-4xl mb-4 block">{stat.emoji}</span>
              <h3 className="font-bold text-gray-700 text-sm mb-2">
                {stat.label}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-gray-800">
                  {stat.count}
                </span>
                <span className="text-gray-400 font-medium">
                  / {stat.capacity}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: stat.color
                }}
                initial={{
                  width: 0
                }}
                animate={{
                  width: `${stat.count / stat.capacity * 100}%`
                }}
                transition={{
                  duration: 0.8,
                  delay: 0.3
                }} />

              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.4
          }}
          className="bg-white rounded-2xl shadow-md p-6">

          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#BAE6FD] hover:bg-[#7DD3FC] transition-colors">
              <span className="text-2xl">New</span>
              <span className="font-semibold text-gray-700 text-sm">
                New Enrollment
              </span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#FBCFE8] hover:bg-[#F9A8D4] transition-colors">
              <span className="text-2xl">List</span>
              <span className="font-semibold text-gray-700 text-sm">
                View Waitlist
              </span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#E9D5FF] hover:bg-[#D8B4FE] transition-colors">
              <span className="text-2xl">Rpt</span>
              <span className="font-semibold text-gray-700 text-sm">
                Reports
              </span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[#BBF7D0] hover:bg-[#86EFAC] transition-colors">
              <span className="text-2xl">Call</span>
              <span className="font-semibold text-gray-700 text-sm">
                Contact Parents
              </span>
            </button>
          </div>
        </motion.div>

        {/* Recent Enrollments */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.5
          }}
          className="bg-white rounded-2xl shadow-md p-6">

          <h2 className="font-bold text-gray-800 text-lg mb-4">
            Recent Enrollments
          </h2>
          <div className="space-y-4">
            {recentEnrollments.map((enrollment, index) =>
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl bg-[#FFFBEB]">

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FBCFE8] flex items-center justify-center">
                    <span>ST</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {enrollment.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {enrollment.program}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-white px-3 py-1 rounded-full">
                  {enrollment.date}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Announcement Banner */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{
          delay: 0.6
        }}
        className="mt-6 bg-gradient-to-r from-[#BAE6FD] to-[#FBCFE8] rounded-2xl p-6 flex items-center justify-between">

        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-bold text-gray-800">
              Spring Registration Open!
            </h3>
            <p className="text-gray-600 text-sm">
              Early bird discount ends March 15th
            </p>
          </div>
        </div>
        <button className="bg-white px-6 py-2 rounded-full font-bold text-gray-700 shadow-sm hover:shadow-md transition-shadow">
          Learn More
        </button>
      </motion.div>
    </div>);

}