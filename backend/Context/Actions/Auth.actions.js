import { jwtDecode } from "jwt-decode"
import Toast from "react-native-toast-message"
import baseURL from "../../../screens/assets/common/baseurl";
import { setToken, removeToken, getToken } from "../Store/tokenStorage";

import axios from "axios";

export const SET_CURRENT_USER = "SET_CURRENT_USER";

export const loginUser = async (user, dispatch) => {
    try {
        const response = await fetch(`${baseURL}users/login`, {
            method: "POST",
            body: JSON.stringify(user),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (response.ok) {
            const token = data.token;
            await setToken(token);
            const decoded = jwtDecode(token);
            dispatch(setCurrentUser(decoded, user));
            return Promise.resolve(data);
        } else {
            logoutUser(dispatch);
            return Promise.reject(data);
        }
    } catch (err) {
        logoutUser(dispatch);
        return Promise.reject(err);
    }
};

export const loginWithGoogle = async (accessToken, dispatch) => {
    if (!accessToken) {
        return Promise.reject(new Error("Google access token is required"));
    }

    try {
        const response = await axios.post(`${baseURL}users/google`, { accessToken });
        const token = response?.data?.token;

        if (!token) {
            throw new Error("No token returned from Google login.");
        }

        await setToken(token);
        const decoded = jwtDecode(token);
        dispatch(setCurrentUser(decoded));
        return response.data;
    } catch (err) {
        await removeToken();
        dispatch(setCurrentUser({}));
        return Promise.reject(err);
    }
};


export const logoutUser = async (dispatch, userId) => {
    if (userId) {
        try {
            const token = await getToken();
            // Clear the push token from the user record when they log out to prevent stale notifications
            if (token) {
                await axios.put(`${baseURL}users/${userId}/push-token`, 
                    { pushToken: '' },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
        } catch (e) {
            console.log("Could not clear push token on logout", e.message);
        }
    }
    await removeToken();
    dispatch(setCurrentUser({}))
}

export const setCurrentUser = (decoded, user) => {
    return {
        type: SET_CURRENT_USER,
        payload: decoded,
        userProfile: user
    }
}
