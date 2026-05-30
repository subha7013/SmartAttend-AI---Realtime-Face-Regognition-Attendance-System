const API_URL = 'http://localhost:5000/api';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData, browser does it automatically with boundary boundaries
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check if it's a file download (like Excel or PDF)
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('spreadsheetml') || contentType.includes('pdf'))) {
      if (!response.ok) {
        throw new Error('Failed to download report');
      }
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error.message);
    throw error;
  }
};

export const loginAdmin = (email, password) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const registerAdmin = (name, email, password) => {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
};

export const getMe = () => {
  return apiRequest('/auth/me');
};

export const getStudents = (search = '', department = '') => {
  let query = '';
  if (search || department) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department) params.append('department', department);
    query = `?${params.toString()}`;
  }
  return apiRequest(`/students${query}`);
};

export const createStudent = (formData) => {
  return apiRequest('/students', {
    method: 'POST',
    body: formData,
  });
};

export const updateStudent = (id, formData) => {
  return apiRequest(`/students/${id}`, {
    method: 'PUT',
    body: formData,
  });
};

export const deleteStudent = (id) => {
  return apiRequest(`/students/${id}`, {
    method: 'DELETE',
  });
};

export const recognizeAttendance = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/attendance/recognize', {
    method: 'POST',
    body: formData,
  });
};

export const getAttendanceLogs = (date = '', department = '', search = '', teacherId = '') => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (department) params.append('department', department);
  if (search) params.append('search', search);
  if (teacherId) params.append('teacherId', teacherId);
  return apiRequest(`/attendance/logs?${params.toString()}`);
};

export const getDashboardStats = () => {
  return apiRequest('/attendance/stats');
};

export const getExportUrl = (type, date = '', department = '', search = '') => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (department) params.append('department', department);
  if (search) params.append('search', search);
  const token = localStorage.getItem('token');
  if (token) params.append('token', token); // Optional if needed for direct links
  return `http://localhost:5000/api/attendance/export/${type}?${params.toString()}`;
};

export const getTeachersList = () => {
  return apiRequest('/auth/teachers');
};

export const enrollTeacher = (name, designation, email, password) => {
  return apiRequest('/auth/enroll-teacher', {
    method: 'POST',
    body: JSON.stringify({ name, designation, email, password }),
  });
};

export const deleteTeacher = (id) => {
  return apiRequest(`/auth/teachers/${id}`, {
    method: 'DELETE',
  });
};
