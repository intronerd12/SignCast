import axios from "axios";
import baseURL from "../../../screens/assets/common/baseurl";
import {
    PRODUCT_LIST_REQUEST,
    PRODUCT_LIST_SUCCESS,
    PRODUCT_LIST_FAIL,
    CATEGORY_LIST_REQUEST,
    CATEGORY_LIST_SUCCESS,
    CATEGORY_LIST_FAIL,
} from "../constants";

export const fetchProducts = () => async (dispatch) => {
    dispatch({ type: PRODUCT_LIST_REQUEST });
    try {
        const response = await axios.get(`${baseURL}products`);
        dispatch({
            type: PRODUCT_LIST_SUCCESS,
            payload: response.data || [],
            meta: { fetchedAt: Date.now() },
        });
    } catch (error) {
        dispatch({
            type: PRODUCT_LIST_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load products",
        });
    }
};

export const fetchCategories = () => async (dispatch) => {
    dispatch({ type: CATEGORY_LIST_REQUEST });
    try {
        const response = await axios.get(`${baseURL}categories`);
        dispatch({
            type: CATEGORY_LIST_SUCCESS,
            payload: response.data || [],
            meta: { fetchedAt: Date.now() },
        });
    } catch (error) {
        dispatch({
            type: CATEGORY_LIST_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load categories",
        });
    }
};
