import React, { createContext, useReducer } from 'react';

export const CartContext = createContext();

const cartReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_TO_CART':
            return [...state, action.payload];
        case 'REMOVE_FROM_CART':
            return state.filter(item => item !== action.payload);
        case 'CLEAR_CART':
            return [];
        default:
            return state;
    }
};

export const CartProvider = ({ children }) => {
    const [cartItems, dispatch] = useReducer(cartReducer, []);

    const addItemToCart = (product) => {
        dispatch({ type: 'ADD_TO_CART', payload: product });
    };

    const removeItemFromCart = (product) => {
        dispatch({ type: 'REMOVE_FROM_CART', payload: product });
    };

    const clearCart = () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addItemToCart,
                removeItemFromCart,
                clearCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
};
