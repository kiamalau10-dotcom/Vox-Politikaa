import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db, doc, onSnapshot, OperationType, handleFirestoreError } from '../firebase';
import { UserContext } from './UserContextCore';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const remembered = localStorage.getItem("isLoggedIn") === "true";
    const sessioned = sessionStorage.getItem("isLoggedIn") === "true";
    return remembered || sessioned;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Sync currentUser from Firestore in real-time
  useEffect(() => {
    if (isLoggedIn && currentUser?.username) {
      const docId = currentUser.username.replace('@', '');
      const path = `users/${docId}`;
      const unsubscribe = onSnapshot(doc(db, 'users', docId), (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          setCurrentUser(userData);
          localStorage.setItem("currentUser", JSON.stringify(userData));
          localStorage.setItem(`user_data_${userData.username}`, JSON.stringify(userData));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      });
      return () => unsubscribe();
    }
  }, [isLoggedIn, currentUser?.username]);

  // Sync from storage for cross-tab or other component updates
  useEffect(() => {
    const handleStorageChange = () => {
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("currentUser");
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoggedIn, setIsLoggedIn, logout }}>
      {children}
    </UserContext.Provider>
  );
};
