import axios from "axios";
import baseURL from "../../../screens/assets/common/baseurl";
import {
    ORDER_LIST_REQUEST,
    ORDER_LIST_SUCCESS,
    ORDER_LIST_FAIL,
    USER_ORDERS_REQUEST,
    USER_ORDERS_SUCCESS,
    USER_ORDERS_FAIL,
    ORDER_STATUS_UPDATE_REQUEST,
    ORDER_STATUS_UPDATE_SUCCESS,
    ORDER_STATUS_UPDATE_FAIL,
} from "../constants";

export const fetchOrders = () => async (dispatch) => {
    dispatch({ type: ORDER_LIST_REQUEST });
    try {
        const response = await axios.get(`${baseURL}orders`);
        dispatch({ type: ORDER_LIST_SUCCESS, payload: response.data || [] });
    } catch (error) {
        dispatch({
            type: ORDER_LIST_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load orders",
        });
    }
};

export const fetchUserOrders = (userId) => async (dispatch) => {
    if (!userId) return;
    dispatch({ type: USER_ORDERS_REQUEST });
    try {
        const response = await axios.get(`${baseURL}orders/get/userorders/${userId}`);
        dispatch({ type: USER_ORDERS_SUCCESS, payload: response.data || [] });
    } catch (error) {
        dispatch({
            type: USER_ORDERS_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load user orders",
        });
    }
};

export const updateOrderStatus = (orderId, status, token) => async (dispatch) => {
    if (!orderId) return;
    dispatch({ type: ORDER_STATUS_UPDATE_REQUEST, payload: { orderId } });
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.put(
            `${baseURL}orders/${orderId}`,
            { status },
            headers ? { headers } : undefined
        );
        dispatch({
            type: ORDER_STATUS_UPDATE_SUCCESS,
            payload: response?.data || { id: orderId, status },
        });
        return response?.data;
    } catch (error) {
        const message = error?.response?.data?.message || error.message || "Failed to update order";
        dispatch({ type: ORDER_STATUS_UPDATE_FAIL, payload: message });
        throw error;
    }
};
