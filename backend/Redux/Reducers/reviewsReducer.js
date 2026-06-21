import {
    REVIEWABLE_PRODUCTS_REQUEST,
    REVIEWABLE_PRODUCTS_SUCCESS,
    REVIEWABLE_PRODUCTS_FAIL,
    REVIEW_SUBMIT_REQUEST,
    REVIEW_SUBMIT_SUCCESS,
    REVIEW_SUBMIT_FAIL,
} from "../constants";

const initialState = {
    reviewables: [],
    loading: false,
    error: null,
    saving: false,
    savingId: "",
    saveError: null,
};

const reviewsReducer = (state = initialState, action) => {
    switch (action.type) {
        case REVIEWABLE_PRODUCTS_REQUEST:
            return { ...state, loading: true, error: null };
        case REVIEWABLE_PRODUCTS_SUCCESS:
            return { ...state, loading: false, reviewables: action.payload || [] };
        case REVIEWABLE_PRODUCTS_FAIL:
            return { ...state, loading: false, error: action.payload };
        case REVIEW_SUBMIT_REQUEST:
            return { ...state, saving: true, savingId: action.payload?.productId || "", saveError: null };
        case REVIEW_SUBMIT_SUCCESS:
            return { ...state, saving: false, savingId: "", saveError: null };
        case REVIEW_SUBMIT_FAIL:
            return { ...state, saving: false, savingId: "", saveError: action.payload };
        default:
            return state;
    }
};

export default reviewsReducer;
