import axios from "axios";
import baseURL from "../../../screens/assets/common/baseurl";
import {
    REVIEWABLE_PRODUCTS_REQUEST,
    REVIEWABLE_PRODUCTS_SUCCESS,
    REVIEWABLE_PRODUCTS_FAIL,
    REVIEW_SUBMIT_REQUEST,
    REVIEW_SUBMIT_SUCCESS,
    REVIEW_SUBMIT_FAIL,
} from "../constants";

const getProductId = (product) =>
    product?.id || product?._id || product?.product || product?._id?.$oid || "";

const buildReviewables = (orders) => {
    const delivered = (orders || []).filter((order) => String(order?.status) === "1");
    const map = new Map();

    delivered.forEach((order) => {
        (order?.orderItems || []).forEach((orderItem) => {
            const product = orderItem?.product || orderItem;
            const id = getProductId(product);
            if (!id) return;
            if (!map.has(id)) {
                map.set(id, { ...product, _id: id });
            }
        });
    });

    return Array.from(map.values());
};

export const fetchReviewables = (userId) => async (dispatch) => {
    if (!userId) return;
    dispatch({ type: REVIEWABLE_PRODUCTS_REQUEST });
    try {
        const response = await axios.get(`${baseURL}orders/get/userorders/${userId}`);
        const reviewables = buildReviewables(response.data || []);
        dispatch({ type: REVIEWABLE_PRODUCTS_SUCCESS, payload: reviewables });
    } catch (error) {
        dispatch({
            type: REVIEWABLE_PRODUCTS_FAIL,
            payload: error?.response?.data?.message || error.message || "Failed to load review products",
        });
    }
};

export const submitReview = (productId, payload, token, isUpdate = false) => async (dispatch) => {
    if (!productId) return;
    dispatch({ type: REVIEW_SUBMIT_REQUEST, payload: { productId } });
    try {
        const headers = { Authorization: `Bearer ${token}` };
        if (isUpdate) {
            await axios.put(`${baseURL}products/${productId}/reviews`, payload, { headers });
        } else {
            await axios.post(`${baseURL}products/${productId}/reviews`, payload, { headers });
        }
        dispatch({ type: REVIEW_SUBMIT_SUCCESS, payload: { productId } });
        return true;
    } catch (error) {
        const message = error?.response?.data?.message || error.message || "Failed to submit review";
        dispatch({ type: REVIEW_SUBMIT_FAIL, payload: message });
        throw error;
    }
};
