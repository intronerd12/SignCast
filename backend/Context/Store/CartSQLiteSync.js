import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { SET_CART } from "../../Redux/constants";
import { initCartStorage, loadCartFromStorage, saveCartToStorage } from "./CartStorage";

const CartSQLiteSync = () => {
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cartItems);
    const hasHydrated = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const bootstrap = async () => {
            try {
                await initCartStorage();
                const stored = await loadCartFromStorage();
                if (isMounted && stored.length) {
                    dispatch({ type: SET_CART, payload: stored });
                }
            } catch (error) {
                // Safe to ignore; cart can operate in-memory.
            } finally {
                hasHydrated.current = true;
            }
        };

        bootstrap();

        return () => {
            isMounted = false;
        };
    }, [dispatch]);

    useEffect(() => {
        if (!hasHydrated.current) return;

        saveCartToStorage(cartItems).catch(() => {
            // Ignore persistence failures.
        });
    }, [cartItems]);

    return null;
};

export default CartSQLiteSync;
