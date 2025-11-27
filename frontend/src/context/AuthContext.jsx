import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://127.0.0.1:8000';

    // Load user from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const register = async (username, email, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const userData = await response.json();

            // After registration, log the user in
            await login(email, password);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const login = async (email, password) => {
        console.log("Attempting login for:", email);
        try {
            // OAuth2PasswordRequestForm expects form data
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 uses 'username' field
            formData.append('password', password);

            console.log("Sending login request...");
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });
            console.log("Login response status:", response.status);

            if (!response.ok) {
                const error = await response.json();
                console.error("Login failed:", error);
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            const accessToken = data.access_token;
            console.log("Login successful, token received");

            // Fetch user data
            console.log("Fetching user data...");
            const userResponse = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!userResponse.ok) {
                console.error("Failed to fetch user data");
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            console.log("User data received:", userData);

            // Store in state and localStorage
            setToken(accessToken);
            setUser(userData);
            localStorage.setItem('token', accessToken);
            localStorage.setItem('user', JSON.stringify(userData));

            return { success: true };
        } catch (error) {
            console.error("Login error caught:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
