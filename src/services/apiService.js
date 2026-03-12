const getUrl = () => import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : `http://localhost:3000`;
const getDbType = () => 
  (localStorage.getItem('preferred_db') || 'supabase').replace(/^"|"$/g, '').replace(/'/g, '');

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${getUrl()}${endpoint}`;
  const dbType = getDbType();
  
  const headers = {
    'x-db-type': dbType,
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });

  // ✅ ถ้า OK คืนค่า JSON ปกติ
  if (response.ok) {
    return response.json();
  }

  // ❌ ถ้าไม่ OK (400, 500, etc.)
  // อ่าน body ออกมาเป็น text แค่ครั้งเดียวเพื่อป้องกัน Stream already read
  const errorText = await response.text(); 
  let errorMessage = 'API Error';

  try {
    // ลองแปลง text ที่อ่านมาเป็น JSON
    const errorData = JSON.parse(errorText);
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch (e) {
    // ถ้าไม่ใช่ JSON ก็ใช้ text ดิบๆ นั้นเลย
    errorMessage = errorText || errorMessage;
  }

  throw new Error(errorMessage);
};

export const checkHealth = () => {
  return apiFetch('/api/health');
};

export const fetchFaculties = () => {
  return apiFetch('/api/faculties');
};

export const fetchDepartments = () => {
  return apiFetch('/api/departments');
}

export const fetchApplicants = () => {
  return apiFetch('/api/applicants');
};

export const fetchCriteria = () => {
  return apiFetch('/api/criteria');
};

export const loginUser = (credentials) => {
  return apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

export const registerUser = (userData) => {
  return apiFetch('/api/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const createStaffUser = (userData) => {
  return apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const addDepartment = (deptData) => {
  return apiFetch('/api/departments', {
    method: 'POST',
    body: JSON.stringify(deptData)
  });
};

export const addFaculty = (facultyData) => {
  return apiFetch('/api/faculties', {
    method: 'POST',
    body: JSON.stringify(facultyData)
  });
}

export const fetchUserProfile = (userId) => {
  return apiFetch(`/api/users/${userId}`);
};

export const updateUserProfile = (userId, profileData) => {
  return apiFetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
};

export const fetchTopFacultiesStats = () => {
  return apiFetch('/api/stats/top-faculties');
};

// --- ADMISSION ---
export const fetchAdmissionsData = () => {
  return apiFetch('/api/admissions');
};

// --- STORAGE HELPER ---
// If using Supabase, it returns the bucket URL. 
// If using SQL, we can fallback to local assets or a placeholder.
export const getFacultyLogoUrl = (facultyId) => {
  const dbType = getDbType();
  if (dbType === 'supabase') {
    // Replace this with your actual Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/faculty-logos/${facultyId}.png`;
  } else {
    // Fallback for MS SQL: You can place local images in your React public folder 
    // like /public/logos/1.png, or just return null to trigger the fallback icon.
    return `/logos/${facultyId}.png`;
  }
};

// --- APPLY FOR ADMISSION ---
export const fetchApplyPreData = async (userId) => {
  return apiFetch(`/api/apply-data/${userId}`);
};

export const submitApplication = async (formData) => {
  return apiFetch('/api/apply', {
    method: 'POST',
    body: formData
  });
};