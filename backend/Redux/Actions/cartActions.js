import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    SET_CART_ITEM_QUANTITY
} from '../constants';

export const addToCart = (payload) => {
    return {
        type: ADD_TO_CART,
        payload
    }
}

export const removeFromCart = (payload) => {
    return {
        type: REMOVE_FROM_CART,
        payload
    }
}

export const clearCart = () => {
    return {
        type: CLEAR_CART
    }
}

export const setCartItemQuantity = (payload) => {
    return {
        type: SET_CART_ITEM_QUANTITY,
        payload
    }
}
