import React, { useState, useEffect } from 'react';
import { getStudents, createStudent, deleteStudent, getTeachersList, enrollTeacher, deleteTeacher } from '../services/api';
import { Plus, Search, Trash2, GraduationCap, Mail, CheckCircle, AlertTriangle, X, Image as ImageIcon, Briefcase } from 'lucide-react';

const Students = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Student Form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dept, setDept] = useState('');
  const [photos, setPhotos] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Teacher Form states
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [tName, setTName] = useState('');
  const [tDesignation, setTDesignation] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tFormLoading, setTFormLoading] = useState(false);
  const [tFormError, setTFormError] = useState('');
  const [tFormSuccess, setTFormSuccess] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await getStudents(search, department);
      setStudents(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await getTeachersList();
      setTeachers(response.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      const delayDebounceFn = setTimeout(() => {
        fetchStudents();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      fetchTeachers();
    }
  }, [search, department, activeTab]);

  const handlePhotoChange = (e) => {
    setPhotos(Array.from(e.target.files));
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    if (photos.length === 0) {
      setFormError('Please select at least one face photo for registration.');
      setFormLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('rollNo', rollNo);
    formData.append('department', dept);
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });

    try {
      await createStudent(formData);
      setFormSuccess('Student enrolled and face embeddings successfully saved!');
      setName('');
      setEmail('');
      setRollNo('');
      setDept('');
      setPhotos([]);
      const fileInput = document.getElementById('photos-input');
      if (fileInput) fileInput.value = '';
      fetchStudents();
    } catch (err) {
      setFormError(err.message || 'Enrollment failed. Ensure student data is unique and AI service is active.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student and their entire attendance history?')) {
      return;
    }

    try {
      await deleteStudent(id);
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setTFormLoading(true);
    setTFormError('');
    setTFormSuccess('');

    try {
      await enrollTeacher(tName, tDesignation, tEmail, tPassword);
      setTFormSuccess('Teacher enrolled successfully!');
      setTName('');
      setTDesignation('');
      setTEmail('');
      setTPassword('');
      fetchTeachers();
    } catch (err) {
      setTFormError(err.message || 'Teacher enrollment failed.');
    } finally {
      setTFormLoading(false);
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher? They will no longer be able to log in.')) {
      return;
    }

    try {
      await deleteTeacher(id);
      fetchTeachers();
    } catch (err) {
      alert(err.message || 'Failed to delete teacher.');
    }
  };

  // Filter teachers locally based on search query
  const filteredTeachers = teachers.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      (t.designation && t.designation.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {activeTab === 'students' ? 'Student Enrollment' : 'Teacher Enrollment'}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {activeTab === 'students' 
              ? 'Register students and manage facial templates database' 
              : 'Register and manage authorized system teachers'}
          </p>
        </div>
        <button
          onClick={() => activeTab === 'students' ? setShowForm(true) : setShowTeacherForm(true)}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/10 transition cursor-pointer text-sm"
        >
          <Plus className="w-5 h-5" />
          <span>{activeTab === 'students' ? 'Enroll New Student' : 'Enroll New Teacher'}</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => {
            setActiveTab('students');
            setError('');
            setSearch('');
          }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'students'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-455 text-slate-400 hover:text-slate-200'
          }`}
        >
          Students List
        </button>
        <button
          onClick={() => {
            setActiveTab('teachers');
            setError('');
            setSearch('');
          }}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'teachers'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-slate-455 text-slate-400 hover:text-slate-200'
          }`}
        >
          Teachers List
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm"
            placeholder={activeTab === 'students' ? "Search by name, roll number, or email..." : "Search by teacher name, designation, or email..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Dept Filter (Students tab only) */}
        {activeTab === 'students' && (
          <div className="w-full md:w-64">
            <select
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm cursor-pointer"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="CSE">Computer Science and Engineering(CSE)</option>
              <option value="ECE">Electronics and Communication Engineering(ECE)</option>
              <option value="EE">Electrical Engineering(EE)</option>
              <option value="ME">Mechanical Engineering(ME)</option>
              <option value="IT">Information Technology (IT)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'students' ? (
        students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map((student) => (
              <div
                key={student._id}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      {student.department}
                    </span>
                    <button
                      onClick={() => handleDeleteStudent(student._id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white leading-tight">{student.name}</h3>
                  <p className="text-sm text-slate-400 mt-1 font-semibold">Roll No: {student.rollNo}</p>

                  <div className="space-y-2 mt-6">
                    <div className="flex items-center text-xs text-slate-400">
                      <Mail className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <GraduationCap className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                      <span>{student.faceEmbeddings?.length || 0} Facial templates registered</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800/60 max-w-lg mx-auto">
            <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Students Enrolled</h3>
            <p className="text-slate-500 text-sm mb-6">
              There are no student profiles found in the database. Use the button above to register a student.
            </p>
          </div>
        )
      ) : (
        filteredTeachers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher._id}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {teacher.designation || 'Lecturer'}
                    </span>
                    <button
                      onClick={() => handleDeleteTeacher(teacher._id)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-white leading-tight">{teacher.name}</h3>
                  
                  <div className="space-y-2 mt-6">
                    <div className="flex items-center text-xs text-slate-400">
                      <Mail className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-400">
                      <Briefcase className="w-4 h-4 mr-2 text-slate-500 shrink-0" />
                      <span>Role: Teacher</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800/60 max-w-lg mx-auto">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Teachers Registered</h3>
            <p className="text-slate-500 text-sm mb-6">
              There are no teacher accounts found in the database. Use the button above to register your first teacher.
            </p>
          </div>
        )
      )}

      {/* Student Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl p-8 border border-slate-800/80 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowForm(false);
                setFormError('');
                setFormSuccess('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-850 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-extrabold text-white mb-6">Student Registration</h3>

            {formError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-200 text-xs font-medium">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-emerald-200 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Student Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Roll Number</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                    placeholder="e.g. CSE-001"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Department</label>
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm cursor-pointer"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    disabled={formLoading}
                  >
                    <option value="">Select...</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EE">EE</option>
                    <option value="ME">ME</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="student@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Face Enrollment Images</label>
                <div className="mt-2 border border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-slate-700 transition relative">
                  <input
                    id="photos-input"
                    type="file"
                    multiple
                    required
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={formLoading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="inline-flex p-2 bg-slate-800/50 rounded-xl border border-slate-750">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-white">Upload photos (Select 1 to 5 photos)</p>
                    <p className="text-xs text-slate-500">Provide clear headshots of the student under good lighting</p>
                  </div>
                </div>
                {photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded bg-slate-800 text-xs text-slate-300 font-medium">
                        {p.name.substring(0, 15)}...
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                    setFormSuccess('');
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer text-sm"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-sm"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Register Student</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Form Modal */}
      {showTeacherForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl p-8 border border-slate-800/80 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowTeacherForm(false);
                setTFormError('');
                setTFormSuccess('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-850 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-extrabold text-white mb-6">Teacher Registration</h3>

            {tFormError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-200 text-xs font-medium">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <span>{tFormError}</span>
              </div>
            )}

            {tFormSuccess && (
              <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-3 text-emerald-200 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{tFormSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeacher} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Teacher Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="e.g. Dr. Jane Smith"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  disabled={tFormLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Designation / Department</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="e.g. Professor of Physics"
                  value={tDesignation}
                  onChange={(e) => setTDesignation(e.target.value)}
                  disabled={tFormLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="teacher@college.edu"
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  disabled={tFormLoading}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  placeholder="••••••••"
                  value={tPassword}
                  onChange={(e) => setTPassword(e.target.value)}
                  disabled={tFormLoading}
                />
              </div>

              <div className="pt-4 border-t border-slate-800/60 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherForm(false);
                    setTFormError('');
                    setTFormSuccess('');
                  }}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer text-sm"
                  disabled={tFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-sm"
                  disabled={tFormLoading}
                >
                  {tFormLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Register Teacher</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
