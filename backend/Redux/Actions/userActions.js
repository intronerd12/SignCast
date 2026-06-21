import axios from "axios";
import baseURL from "../../../screens/assets/common/baseurl";
import {
    USER_LIST_REQUEST,
    USER_LIST_SUCCESS,
    USER_LIST_FAIL,
    ADMIN_PROFILE_REQUEST,
    ADMIN_PROFILE_SUCCESS,
    ADMIN_PROFILE_FAIL,
    ADMIN_PROFILE_UPDATE_REQUEST,
    ADMIN_PROFILE_UPDATE_SUCCESS,
    ADMIN_PROFILE_UPDATE_FAIL,
} from "../constants";

export const fetchUsers = (token) => async (dispatch) => {
    dispatch({ type: USER_LIST_REQUEST });
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.get(`${baseURL}users`, headers ? { headers } : undefined);
        dispatch({ type: USER_LIST_SUCCESS, payload: response.data || [] });
    } catch (error) {
        dispatch({
            type: USER_LIST_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load users",
        });
    }
};

export const fetchAdminProfile = (userId, token) => async (dispatch) => {
    if (!userId) return;
    dispatch({ type: ADMIN_PROFILE_REQUEST });
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.get(
            `${baseURL}users/${userId}`,
            headers ? { headers } : undefined
        );
        dispatch({ type: ADMIN_PROFILE_SUCCESS, payload: response.data });
    } catch (error) {
        dispatch({
            type: ADMIN_PROFILE_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load profile",
        });
    }
};

export const updateAdminProfile = (userId, payload, token) => async (dispatch) => {
    if (!userId) return;
    dispatch({ type: ADMIN_PROFILE_UPDATE_REQUEST });
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.put(
            `${baseURL}users/${userId}`,
            payload,
            headers ? { headers } : undefined
        );
        dispatch({ type: ADMIN_PROFILE_UPDATE_SUCCESS, payload: response.data });
        return response.data;
    } catch (error) {
        dispatch({
            type: ADMIN_PROFILE_UPDATE_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to update profile",
        });
        throw error;
    }
};
