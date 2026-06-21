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

const initialState = {
    list: [],
    loading: false,
    error: null,
    profile: null,
    profileLoading: false,
    profileError: null,
    updating: false,
    updateError: null,
};

const usersReducer = (state = initialState, action) => {
    switch (action.type) {
        case USER_LIST_REQUEST:
            return { ...state, loading: true, error: null };
        case USER_LIST_SUCCESS:
            return { ...state, loading: false, list: action.payload || [] };
        case USER_LIST_FAIL:
            return { ...state, loading: false, error: action.payload };
        case ADMIN_PROFILE_REQUEST:
            return { ...state, profileLoading: true, profileError: null };
        case ADMIN_PROFILE_SUCCESS:
            return { ...state, profileLoading: false, profile: action.payload };
        case ADMIN_PROFILE_FAIL:
            return { ...state, profileLoading: false, profileError: action.payload };
        case ADMIN_PROFILE_UPDATE_REQUEST:
            return { ...state, updating: true, updateError: null };
        case ADMIN_PROFILE_UPDATE_SUCCESS:
            return { ...state, updating: false, profile: action.payload };
        case ADMIN_PROFILE_UPDATE_FAIL:
            return { ...state, updating: false, updateError: action.payload };
        default:
            return state;
    }
};

export default usersReducer;
