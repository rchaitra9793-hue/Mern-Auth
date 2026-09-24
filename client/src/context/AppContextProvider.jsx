// src/context/AppContextProvider.jsx
import { useEffect, useState } from "react";
import { AppContext } from "./AppContext";
import axios from 'axios';
import { toast } from 'react-toastify';

// Send the auth cookie with every request to the backend
axios.defaults.withCredentials = true;

export const AppContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(false);

 const getUserData = async () => {
  try {
    const { data } = await axios.get(backendUrl + '/api/user/data');
    data.success ? setUserData(data.userData) : toast.error(data.message);
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Failed to fetch user data.";
    toast.error(errorMessage);
  }
};

  // Restore the session on page load/refresh (cookie is httpOnly, so ask the server)
  const getAuthState = async () => {
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/is-auth');
      if (data.success) {
        setIsLoggedIn(true);
        getUserData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    getAuthState();
  }, []);

  const value = {
    backendUrl,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
