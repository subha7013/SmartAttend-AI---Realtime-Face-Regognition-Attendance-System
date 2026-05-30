import React, { useState, useEffect } from 'react';
import { getAttendanceLogs, apiRequest } from '../services/api';
import { Search, Calendar, FileText, Download, ShieldAlert, GraduationCap } from 'lucide-react';

const Reports = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState('');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportLoading, setExportLoading] = useState({ excel: false, pdf: false });

  const isMainAdmin = user?.email === 'admin@speedmart.com';

  useEffect(() => {
    if (isMainAdmin) {
      const fetchTeachers = async () => {
        try {
          const response = await apiRequest('/auth/teachers');
          setTeachers(response.data);
        } catch (err) {
          console.error('Error fetching teachers list:', err);
        }
      };
      fetchTeachers();
    }
  }, [isMainAdmin]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getAttendanceLogs(date, department, search, teacherId);
      setLogs(response.data);
    } catch (err) {
      setError('Could not retrieve attendance logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [date, department, search, teacherId]);

  const handleExport = async (type) => {
    setExportLoading((prev) => ({ ...prev, [type]: true }));
    try {
      const blob = await apiRequest(
        `/attendance/export/${type}?date=${date}&department=${department}&search=${search}&teacherId=${teacherId}`
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `attendance_report_${date || 'all'}.${type === 'excel' ? 'xlsx' : 'pdf'}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert(`Export to ${type.toUpperCase()} failed.`);
      console.error(err);
    } finally {
      setExportLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Attendance Reports</h1>
          <p className="text-slate-400 mt-1 text-sm">Query, filter, and export detailed attendance records</p>
        </div>
        
        {/* Export buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => handleExport('excel')}
            disabled={exportLoading.excel || logs.length === 0}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-emerald-300 font-bold rounded-xl transition text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportLoading.excel ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exportLoading.pdf || logs.length === 0}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 font-bold rounded-xl transition text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exportLoading.pdf ? (
              <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className={`grid grid-cols-1 ${isMainAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        {/* Date Filter */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Calendar className="w-5 h-5" />
          </span>
          <input
            type="date"
            className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm cursor-pointer"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Dept Filter */}
        <div className="w-full">
          <select
            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm cursor-pointer"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="CSE">Computer Science & Engineering(CSE)</option>
            <option value="ECE">Electronics & Communication Engineering(ECE)</option>
            <option value="EE">Electrical & Electronics Engineering(EEE)</option>
            <option value="ME">Mechanical Engineering(ME)</option>
            <option value="IT">Information Technology(IT)</option>
          </select>
        </div>

        {isMainAdmin && (
          <div className="w-full">
            <select
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm cursor-pointer"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">All Teachers</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Student */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            placeholder="Search student or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-6 glass-panel rounded-2xl border border-red-500/20 max-w-xl mx-auto mt-6 text-center text-red-200">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <span>{error}</span>
        </div>
      ) : logs.length > 0 ? (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{log.date}</td>
                    <td className="py-3.5 px-4">{log.time}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{log.student?.name || 'Unknown'}</td>
                    <td className="py-3.5 px-4 font-medium">{log.student?.rollNo || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{log.student?.department || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                      {log.markedBy?.name || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800/60 max-w-lg mx-auto">
          <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
          <p className="text-slate-500 text-sm">
            There are no attendance logs that match your active search filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;
