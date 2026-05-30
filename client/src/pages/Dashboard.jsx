import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAttendanceLogs, apiRequest } from '../services/api';
import { Users, UserCheck, UserMinus, Percent, Calendar, RefreshCw, ShieldAlert, X, AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAbsentModal, setShowAbsentModal] = useState(false);

  // Low Attendance warning states
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [threshold, setThreshold] = useState(75);
  const [alertStudents, setAlertStudents] = useState([]);
  const [alertLoading, setAlertLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');

  const fetchLowAttendance = async () => {
    setAlertLoading(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      const res = await apiRequest(`/attendance/low-attendance?threshold=${threshold}`);
      setAlertStudents(res.students || []);
    } catch (err) {
      console.error('Error fetching low attendance:', err);
    } finally {
      setAlertLoading(false);
    }
  };

  useEffect(() => {
    if (showWarnModal) {
      fetchLowAttendance();
    }
  }, [showWarnModal, threshold]);

  const handleSendWarningEmails = async () => {
    setEmailSending(true);
    setEmailSuccess('');
    setEmailError('');
    try {
      const res = await apiRequest('/attendance/email-low-attendance', {
        method: 'POST',
        body: JSON.stringify({ threshold }),
      });
      setEmailSuccess(res.message || 'Warning emails sent successfully!');
      fetchLowAttendance();
    } catch (err) {
      setEmailError(err.message || 'Failed to send warning emails.');
    } finally {
      setEmailSending(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes.data);

      const today = new Date().toISOString().split('T')[0];
      const logsRes = await getAttendanceLogs(today);
      setRecentLogs(logsRes.data.slice(0, 5)); // show top 5 recent entries
    } catch (err) {
      setError('Could not fetch dashboard statistics. Ensure server and DB are online.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 glass-panel rounded-2xl border border-red-500/20 max-w-xl mx-auto mt-12 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Connection Issue</h3>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const summary = stats?.summary || { totalStudents: 0, presentToday: 0, absentToday: 0, attendanceRate: 0 };
  const absentStudents = stats?.absentStudentsToday || [];
  const weeklyTrend = stats?.weeklyTrend || [];
  const departmentStats = stats?.departmentStats || [];

  // Line Chart Data for Weekly Trend
  const lineChartData = {
    labels: weeklyTrend.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Present Students',
        data: weeklyTrend.map(item => item.present),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, family: 'Outfit' },
        bodyFont: { size: 12, family: 'Outfit' },
        borderColor: '#1e293b',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' }, stepSize: 1 },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } },
      },
    },
  };

  // Bar Chart Data for Department-wise attendance
  const barChartData = {
    labels: departmentStats.map(item => item.department),
    datasets: [
      {
        label: 'Present',
        data: departmentStats.map(item => item.present),
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Absent',
        data: departmentStats.map(item => item.absent),
        backgroundColor: '#ef4444',
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { family: 'Outfit' } },
      },
    },
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Real-time attendance insights and performance trends</p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowWarnModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-505 bg-gradient-to-r from-red-650 to-red-600 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Low Attendance</span>
            </button>
          )}
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all text-sm font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <Users className="w-24 h-24 text-blue-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Enrolled</span>
            <span className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{summary.totalStudents}</h3>
          <p className="text-xs text-slate-500 mt-2 font-medium">Registered faces database</p>
        </div>

        {/* Present Today */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <UserCheck className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Present Today</span>
            <span className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{summary.presentToday}</h3>
          <p className="text-xs text-emerald-500/80 mt-2 font-semibold">Active in classroom</p>
        </div>

        {/* Absent Today */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <UserMinus className="w-24 h-24 text-red-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Absent Today</span>
            <span className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
              <UserMinus className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{summary.absentToday}</h3>
          {summary.absentToday > 0 ? (
            <button
              onClick={() => setShowAbsentModal(true)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold mt-2 underline cursor-pointer bg-transparent border-none p-0 flex items-center space-x-1"
            >
              <span>View Absent List</span>
            </button>
          ) : (
            <p className="text-xs text-slate-500 mt-2 font-medium">No absent students</p>
          )}
        </div>

        {/* Attendance Rate */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <Percent className="w-24 h-24 text-amber-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Attendance Rate</span>
            <span className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Percent className="w-5 h-5" />
            </span>
          </div>
          <h3 className="text-3xl font-extrabold text-white">{summary.attendanceRate}%</h3>
          <p className="text-xs text-slate-500 mt-2 font-medium">Daily class percentage</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Trend Chart */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col h-[380px]">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Last 7 Days Attendance</span>
          </h3>
          <div className="relative flex-1">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Department Stats Chart */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col h-[380px]">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <Percent className="w-5 h-5 text-emerald-400" />
            <span>Department-wise Breakdown (Today)</span>
          </h3>
          <div className="relative flex-1">
            {departmentStats.length > 0 ? (
              <Bar data={barChartData} options={barChartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                No department records found for today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <span>Recently Marked Present (Today)</span>
        </h3>
        {recentLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
                {recentLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">{log.time}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{log.student?.name || 'Unknown'}</td>
                    <td className="py-3.5 px-4 font-medium">{log.student?.rollNo || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{log.student?.department || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-sm italic">
            No attendance marked yet for today
          </div>
        )}
      </div>

      {/* Absent Students Modal */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[80vh] animate-zoomIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <UserMinus className="w-5 h-5 text-red-400" />
                  <span>Absent Students Today</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Students who haven't marked attendance today</p>
              </div>
              <button
                onClick={() => setShowAbsentModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 min-h-[200px] pr-1">
              {absentStudents.length > 0 ? (
                <div className="divide-y divide-slate-800/40">
                  {absentStudents.map((student) => (
                    <div key={student._id} className="py-3 flex items-center justify-between hover:bg-slate-900/20 px-2 rounded-xl transition">
                      <div>
                        <h4 className="text-sm font-bold text-white">{student.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Roll No: {student.rollNo}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
                          Absent
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold">{student.department}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm italic py-8">
                  <UserCheck className="w-8 h-8 text-emerald-500/80 mb-2 animate-bounce" />
                  <p>All students are present today</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowAbsentModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Attendance Warning Modal */}
      {showWarnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-2xl border border-slate-800 shadow-2xl p-6 relative flex flex-col max-h-[85vh] animate-zoomIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Low Attendance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Identify and contact students with low class attendance</p>
              </div>
              <button
                onClick={() => setShowWarnModal(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Threshold slider/input */}
            <div className="py-4 border-b border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Threshold (%)</label>
                <p className="text-xs text-slate-500">Students with attendance rate less than this will be listed</p>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-40 accent-blue-500 cursor-pointer"
                />
                <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-white">
                  {threshold}%
                </span>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 min-h-[250px] pr-1">
              {emailSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              )}
              {emailError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {alertLoading ? (
                <div className="h-full flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : alertStudents.length > 0 ? (
                <div className="divide-y divide-slate-800/40">
                  {alertStudents.map((student) => (
                    <div key={student._id} className="py-3.5 flex items-center justify-between hover:bg-slate-900/20 px-2 rounded-xl transition">
                      <div>
                        <h4 className="text-sm font-bold text-white">{student.name}</h4>
                        <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 font-medium">
                          <span>Roll: {student.rollNo}</span>
                          <span className="text-slate-700">•</span>
                          <span>{student.department}</span>
                          <span className="text-slate-700">•</span>
                          <span className="truncate max-w-[150px]">{student.email}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400">
                          {student.attendanceRate}%
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 font-semibold">
                          {student.presentCount} / {student.totalDays} Classes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm italic py-12">
                  <CheckCircle className="w-10 h-10 text-emerald-500/80 mb-2 animate-bounce" />
                  <p>No students fall below the {threshold}% threshold.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => setShowWarnModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold rounded-xl transition cursor-pointer text-sm"
              >
                Close
              </button>
              {alertStudents.length > 0 && (
                <button
                  onClick={handleSendWarningEmails}
                  disabled={emailSending}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-650 to-rose-650 hover:from-red-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-sm flex items-center space-x-2 disabled:opacity-50"
                >
                  {emailSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-white" />
                      <span>Send Warning Emails ({alertStudents.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
