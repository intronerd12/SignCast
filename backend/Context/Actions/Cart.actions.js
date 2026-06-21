import axios from "axios";
import baseURL from "../../../screens/assets/common/baseurl";
import { SET_CART } from "../../Redux/constants"; // We need to add this constant first

export const fetchCart = async (userId, dispatch) => {
    try {
        const response = await axios.get(`${baseURL}users/${userId}/cart`);
        if (response.data) {
            dispatch({
                type: SET_CART,
                payload: response.data
            });
        }
    } catch (error) {
        console.error("Error fetching cart:", error);
    }
};

export const syncCart = async (userId, cartItems) => {
    try {
        // Format for backend: array of { product: productId, quantity: number }
        // cartItems from Redux is array of product objects with quantity property
        const payload = {
            cart: cartItems.map(item => ({
                product: item.product || item.id || item._id, 
                quantity: item.quantity
            }))
        };
        
        await axios.put(`${baseURL}users/${userId}/cart`, payload);
    } catch (error) {
        console.error("Error syncing cart:", error);
    }
};
