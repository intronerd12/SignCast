import React, { useEffect, useContext, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import AuthGlobal from "./AuthGlobal";
import { fetchCart, syncCart } from "../Actions/Cart.actions";

const CartSync = () => {
    const context = useContext(AuthGlobal);
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cartItems);
    
    // Safety check for context
    const isAuthenticated = context?.stateUser?.isAuthenticated;
    const userId = context?.stateUser?.user?.userId;
    
    // Ref to track if initial load has happened to avoid overwriting backend with empty local state on mount
    const isInitialMount = useRef(true);

    // 1. Fetch cart from backend when user logs in
    useEffect(() => {
        if (isAuthenticated && userId) {
            // Fetch cart
            fetchCart(userId, dispatch);
        }
    }, [isAuthenticated, userId, dispatch]);

    // 2. Sync cart to backend when cartItems change
    useEffect(() => {
        // Skip the very first render to avoid syncing initial empty state
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (isAuthenticated && userId) {
            // Simple debounce to avoid too many requests
            const timeoutId = setTimeout(() => {
                syncCart(userId, cartItems);
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [cartItems, isAuthenticated, userId]);

    return null;
};

export default CartSync;
