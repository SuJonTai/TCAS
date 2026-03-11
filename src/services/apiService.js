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

export const fetchApplicants = (dbType) => {
  return apiFetch('/api/applicants', dbType);
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