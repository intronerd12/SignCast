import {
    ADD_TO_CART,
    REMOVE_FROM_CART,
    CLEAR_CART,
    SET_CART_ITEM_QUANTITY,
    SET_CART
} from '../constants';

const getItemKey = (item) =>
    item?._id?.$oid || item?._id || item?.id || `${item?.name || "item"}-${item?.price || 0}`;

const getMaxStock = (item) => {
    const stock = Number(item?.countInStock);
    return Number.isFinite(stock) && stock > 0 ? stock : Infinity;
};

const clampQuantity = (qty, maxStock) => {
    const parsed = Number(qty);
    const safeQty = Number.isFinite(parsed) ? parsed : 1;
    return Math.max(1, Math.min(safeQty, maxStock));
};

const cartItems = (state = [], action) => {
    switch (action.type) {
        case ADD_TO_CART: {
            const incoming = action.payload || {};
            const incomingKey = getItemKey(incoming);
            const maxStock = getMaxStock(incoming);
            const incomingQty = clampQuantity(Number(incoming.quantity) || 1, maxStock);
            const existingIndex = state.findIndex((item) => getItemKey(item) === incomingKey);

            if (existingIndex === -1) {
                return [...state, { ...incoming, quantity: incomingQty, countInStock: incoming.countInStock }];
            }

            const existingItem = state[existingIndex];
            const existingMaxStock = getMaxStock(existingItem);
            const nextQty = clampQuantity((Number(existingItem.quantity) || 1) + incomingQty, existingMaxStock);

            return state.map((item, index) => (index === existingIndex ? { ...item, quantity: nextQty } : item));
        }
        case REMOVE_FROM_CART: {
            const targetKey = getItemKey(action.payload);
            return state.filter((item) => getItemKey(item) !== targetKey);
        }
        case SET_CART_ITEM_QUANTITY: {
            const target = action.payload || {};
            const targetKey = getItemKey(target);
            const targetQty = Number(target.quantity);

            return state.map((item) => {
                if (getItemKey(item) !== targetKey) {
                    return item;
                }

                const maxStock = getMaxStock(item);
                return { ...item, quantity: clampQuantity(targetQty, maxStock) };
            });
        }
        case CLEAR_CART:
            return [];
        case SET_CART:
            return action.payload || [];
    }
    return state;
}

export default cartItems;
