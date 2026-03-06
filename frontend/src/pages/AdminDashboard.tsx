import React, { createElement, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { EnrollmentData, useEnrollment } from '../context/EnrollmentContext';
import { DownloadIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
export function AdminDashboard() {
  const { enrollments, updateStatus, deleteEnrollment } = useEnrollment();
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentData | null>(
    null
  );
  const [loadingRequirementId, setLoadingRequirementId] = useState<string | null>(
    null
  );
  const [loadingIdPicturePath, setLoadingIdPicturePath] = useState<string | null>(
    null
  );
  const reviewableEnrollments = enrollments.filter(
    (enrollment) => enrollment.requirements.length > 0
  );
  const approvedStudentsCount = reviewableEnrollments.filter(
    (enrollment) => enrollment.status === 'Approved'
  ).length;

  const selectedStudentEntries = useMemo(() => {
    if (!selectedStudent?.formData) {
      return [] as [string, unknown][];
    }

    return Object.entries(selectedStudent.formData) as [string, unknown][];
  }, [selectedStudent]);

  const selectedStudentIdPicture = useMemo(() => {
    if (!selectedStudent?.formData || typeof selectedStudent.formData !== 'object') {
      return null as null | {
        fileName: string;
        storagePath?: string;
        publicUrl?: string;
      };
    }

    const formData = selectedStudent.formData as Record<string, unknown>;
    const rawValue =
      formData.idPicture ||
      formData.id_picture ||
      formData.learnerIdPicture ||
      null;

    if (!rawValue) {
      return null;
    }

    if (typeof rawValue === 'string') {
      return {
        fileName: 'Uploaded ID Photo',
        publicUrl: rawValue
      };
    }

    if (typeof rawValue === 'object') {
      const pictureValue = rawValue as {
        fileName?: unknown;
        storagePath?: unknown;
        publicUrl?: unknown;
        url?: unknown;
      };

      const storagePath =
        typeof pictureValue.storagePath === 'string' ? pictureValue.storagePath : undefined;
      const publicUrl =
        typeof pictureValue.publicUrl === 'string' ? pictureValue.publicUrl :
        typeof pictureValue.url === 'string' ? pictureValue.url :
        undefined;

      if (!storagePath && !publicUrl) {
        return null;
      }

      return {
        fileName:
          typeof pictureValue.fileName === 'string' ?
          pictureValue.fileName :
          'Uploaded ID Photo',
        storagePath,
        publicUrl
      };
    }

    return null;
  }, [selectedStudent]);

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'N/A';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const openRequirementFile = async (
  requirement: {
    id: string;
    storagePath?: string;
    publicUrl?: string;
  }) =>
  {
    if (requirement.storagePath) {
      setLoadingRequirementId(requirement.id);

      const { data, error } = await supabase.storage
        .from('requirements')
        .createSignedUrl(requirement.storagePath, 60 * 10);

      setLoadingRequirementId(null);

      if (!error && data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }

    if (requirement.publicUrl) {
      window.open(requirement.publicUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const openEnrollmentIdPicture = async (storagePath: string) => {
    setLoadingIdPicturePath(storagePath);

    const { data, error } = await supabase.storage
      .from('enrollment-files')
      .createSignedUrl(storagePath, 60 * 10);

    setLoadingIdPicturePath(null);

    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDeleteEnrollment = async (enrollment: EnrollmentData) => {
    const shouldDelete = window.confirm(
      `Delete enrollment record for ${enrollment.childFirstName} ${enrollment.childLastName}? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    const { error } = await deleteEnrollment(enrollment.id);
    if (error) {
      window.alert(error);
      return;
    }

    setSelectedStudent(null);
  };

  const handleDownloadCSV = () => {
    const headers = [
    'Last Name',
    'First Name',
    'Program',
    'Role',
    'Status',
    'Date Enrolled'];

    const rows = reviewableEnrollments.map((e) => [
    e.childLastName,
    e.childFirstName,
    e.program,
    e.role,
    e.status,
    new Date(e.submittedAt).toLocaleDateString()]
    );
    const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))].
    join('\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'masterlist.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="p-8 pb-24">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">
            Classroom Overview
          </h1>
          <p className="text-gray-500 mt-1">Manage students and enrollments.</p>
        </div>
        <button
          onClick={handleDownloadCSV}
          className="bg-[#BAE6FD] hover:bg-[#7DD3FC] px-6 py-3 rounded-xl font-bold text-gray-800 flex items-center gap-2 transition-colors shadow-sm">

          <DownloadIcon className="w-5 h-5" />
          Download Masterlist
        </button>
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-gradient-to-r from-[#FBCFE8] to-[#F9A8D4] rounded-3xl p-8 mb-10 text-white shadow-lg relative overflow-hidden">

        <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold mb-2 text-gray-800">
            Sampaguita Classroom
          </h2>
          <p className="text-gray-800 font-medium opacity-80 text-lg mb-8">
            Pre-Kindergarten 1
          </p>

          <div className="flex items-end gap-3">
            <motion.span
              initial={{
                opacity: 0,
                scale: 0.5
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                delay: 0.2
              }}
              className="text-7xl font-extrabold text-gray-800">

              {approvedStudentsCount}
            </motion.span>
            <span className="text-xl font-bold text-gray-800 mb-2 opacity-70">
              Total Approved Students
            </span>
          </div>
        </div>
      </motion.div>

      {/* Masterlist Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-lg">Masterlist</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Last Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  First Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviewableEnrollments.length === 0 ?
              <tr>
                  <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500">

                    No applications are under review yet.
                  </td>
                </tr> :

              reviewableEnrollments.map((student, index) =>
              <motion.tr
                key={student.id}
                initial={{
                  opacity: 0,
                  x: -20
                }}
                animate={{
                  opacity: 1,
                  x: 0
                }}
                transition={{
                  delay: index * 0.05
                }}
                onClick={() => setSelectedStudent(student)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedStudent(student);
                  }
                }}
                tabIndex={0}
                role="button"
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#FFFBEB]'} cursor-pointer hover:bg-[#F0F9FF] focus:outline-none focus:ring-2 focus:ring-sky-200`}>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {student.childLastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {student.childFirstName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {student.program}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <div className="relative w-fit">
                          <select
                            value={student.status}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                            updateStatus(
                              student.id,
                              event.target.value as 'Pending' | 'Approved' | 'Rejected'
                            )
                            }
                            className={`px-3 py-1 pr-7 text-xs font-bold rounded-full border-none appearance-none w-fit cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-200 ${student.status === 'Approved' ? 'bg-[#BBF7D0] text-green-800' : student.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                          >
                            <option value="Pending" className="bg-yellow-50 text-yellow-800" style={{ backgroundColor: '#FEF9C3', color: '#854D0E' }}>
                              Pending
                            </option>
                            <option value="Approved" className="bg-green-50 text-green-800" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                              Approved
                            </option>
                            <option value="Rejected" className="bg-red-50 text-red-800" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                              Rejected
                            </option>
                          </select>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-current"
                          >
                            ▾
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.submittedAt).toLocaleDateString()}
                    </td>
                  </motion.tr>
              )
              }
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent ?
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-gray-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                Student Information Card
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteEnrollment(selectedStudent)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100">

                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Last Name
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedStudent.childLastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    First Name
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedStudent.childFirstName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Program
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.program}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Role
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.role}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Status
                  </p>
                  <p className="text-sm text-gray-800">{selectedStudent.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    Submitted At
                  </p>
                  <p className="text-sm text-gray-800">
                    {new Date(selectedStudent.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                    ID
                  </p>
                  <p className="text-sm text-gray-800 break-all">{selectedStudent.id}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Submitted Form Data</h4>
                {selectedStudentEntries.length === 0 ?
                <p className="text-sm text-gray-500">No additional form fields submitted.</p> :
                <div className="space-y-3">
                    {selectedStudentEntries.map(([key, value]) =>
                  key === 'idPicture' || key === 'id_picture' || key === 'learnerIdPicture' ?
                  null :
                  <div
                    key={key}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">

                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                          {key}
                        </p>
                        <p className="text-sm text-gray-800 break-words">
                          {formatValue(value)}
                        </p>
                      </div>
                  )}
                  </div>
                }
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">Learner ID Picture</h4>
                {selectedStudentIdPicture ?
                <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <p className="text-sm text-gray-800 break-words">
                      {selectedStudentIdPicture.fileName}
                    </p>
                    {selectedStudentIdPicture.storagePath ?
                  <button
                    type="button"
                    onClick={() =>
                    openEnrollmentIdPicture(selectedStudentIdPicture.storagePath as string)
                    }
                    disabled={
                    loadingIdPicturePath === selectedStudentIdPicture.storagePath
                    }
                    className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                  >
                        {loadingIdPicturePath === selectedStudentIdPicture.storagePath ?
                    'Preparing link...' :
                    'View ID Photo'}
                      </button> :
                  selectedStudentIdPicture.publicUrl ?
                  <button
                    type="button"
                    onClick={() =>
                    window.open(
                      selectedStudentIdPicture.publicUrl,
                      '_blank',
                      'noopener,noreferrer'
                    )
                    }
                    className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                  >
                        View ID Photo
                      </button> :
                  null}
                  </div> :
                <p className="text-sm text-gray-500">No ID picture uploaded for this enrollment.</p>}
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-3">
                  Requirements / Uploaded PDFs
                </h4>
                {selectedStudent.requirements.length === 0 ?
                <p className="text-sm text-gray-500">No uploaded requirement files yet.</p> :
                <div className="space-y-3">
                    {selectedStudent.requirements.map((requirement) =>
                  <div
                    key={requirement.id}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">

                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                          {requirement.label}
                        </p>
                        <p className="text-sm text-gray-800 break-words">
                          {requirement.fileName}
                        </p>
                        {requirement.storagePath || requirement.publicUrl ?
                      <button
                        type="button"
                        onClick={() => openRequirementFile(requirement)}
                        disabled={loadingRequirementId === requirement.id}
                        className="text-xs font-bold text-blue-600 hover:underline mt-1 inline-block"
                      >
                          {loadingRequirementId === requirement.id ?
                        'Preparing link...' :
                        'View Uploaded Document'}
                        </button> :
                      null}
                      </div>
                  )}
                  </div>
                }
              </div>
            </div>
          </div>
        </div> :
      null}
    </div>);

}