// Universal fetch helper that routes everything through your Node.js server
export const apiFetch = async (endpoint, dbType, options = {}) => {
  const url = `http://localhost:3000${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-db-type': dbType, // Automatically passes 'supabase' or 'sqlserver' to backend
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // Attempt to parse JSON error message if possible
    let errorMessage = 'API Error';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

// ==========================================
// API FUNCTIONS
// ==========================================

export const checkHealth = (dbType) => {
  return apiFetch('/api/health', dbType);
};

export const fetchFaculties = (dbType) => {
  return apiFetch('/api/faculties', dbType);
};

export const fetchDepartments = (dbType) => {
  return apiFetch('/api/departments', dbType);
}

export const fetchApplicants = (dbType) => {
  return apiFetch('/api/applicants', dbType);
};

export const fetchCriteria = (dbType) => {
  return apiFetch('/api/criteria', dbType);
};

export const loginUser = (dbType, credentials) => {
  return apiFetch('/api/login', dbType, {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
};

export const registerUser = (dbType, userData) => {
  return apiFetch('/api/register', dbType, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const createStaffUser = (dbType, userData) => {
  return apiFetch('/api/users', dbType, {
    method: 'POST',
    body: JSON.stringify(userData)
  });
};

export const addDepartment = (dbType, deptData) => {
  return apiFetch('/api/departments', dbType, {
    method: 'POST',
    body: JSON.stringify(deptData)
  });
};

export const fetchUserProfile = (dbType, userId) => {
  return apiFetch(`/api/users/${userId}`, dbType);
};

export const updateUserProfile = (dbType, userId, profileData) => {
  return apiFetch(`/api/users/${userId}`, dbType, {
    method: 'PUT',
    body: JSON.stringify(profileData)
  });
};

export const fetchTopFacultiesStats = (dbType) => {
  return apiFetch('/api/stats/top-faculties', dbType);
};

// --- ADMISSION ---
export const fetchAdmissionsData = (dbType) => {
  return apiFetch('/api/admissions', dbType);
};

// --- STORAGE HELPER ---
// If using Supabase, it returns the bucket URL. 
// If using SQL, we can fallback to local assets or a placeholder.
export const getFacultyLogoUrl = (facultyId, dbType) => {
  if (dbType === 'supabase') {
    // Replace this with your actual Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
    return `${supabaseUrl}/storage/v1/object/public/faculty-logos/${facultyId}.png`;
  } else {
    // Fallback for MS SQL: You can place local images in your React public folder 
    // like /public/logos/1.png, or just return null to trigger the fallback icon.
    return `/logos/${facultyId}.png`;
  }
};

// --- APPLY FOR ADMISSION ---
export const fetchApplyPreData = async (dbType, userId) => {
  return apiFetch(`/api/apply-data/${userId}`, dbType);
};

export const submitApplication = async (dbType, formData) => {
  const url = `/api/apply`;
  const headers = { 'x-database-type': dbType };

  const response = await fetch(url, {
    method: 'POST',
    headers: headers, // Notice: No 'Content-Type: application/json' here!
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};