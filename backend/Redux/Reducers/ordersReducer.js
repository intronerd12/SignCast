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

const getOrderId = (order) => order?.id || order?._id;

const initialState = {
    list: [],
    userList: [],
    loading: false,
    error: null,
    userLoading: false,
    userError: null,
    updating: false,
    updatingId: "",
    updateError: null,
};

const ordersReducer = (state = initialState, action) => {
    switch (action.type) {
        case ORDER_LIST_REQUEST:
            return { ...state, loading: true, error: null };
        case ORDER_LIST_SUCCESS:
            return { ...state, loading: false, list: action.payload || [] };
        case ORDER_LIST_FAIL:
            return { ...state, loading: false, error: action.payload };
        case USER_ORDERS_REQUEST:
            return { ...state, userLoading: true, userError: null };
        case USER_ORDERS_SUCCESS:
            return { ...state, userLoading: false, userList: action.payload || [] };
        case USER_ORDERS_FAIL:
            return { ...state, userLoading: false, userError: action.payload };
        case ORDER_STATUS_UPDATE_REQUEST:
            return { ...state, updating: true, updatingId: action.payload?.orderId || "", updateError: null };
        case ORDER_STATUS_UPDATE_SUCCESS: {
            const updated = action.payload || {};
            const updatedId = getOrderId(updated);
            const mergeOrder = (order) => (getOrderId(order) === updatedId ? { ...order, ...updated } : order);
            return {
                ...state,
                updating: false,
                updatingId: "",
                list: state.list.map(mergeOrder),
                userList: state.userList.map(mergeOrder),
            };
        }
        case ORDER_STATUS_UPDATE_FAIL:
            return { ...state, updating: false, updatingId: "", updateError: action.payload };
        default:
            return state;
    }
};

export default ordersReducer;
