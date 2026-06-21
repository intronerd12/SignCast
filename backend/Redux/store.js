import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

import cartItems from './Reducers/cartItems';
import productsReducer from './Reducers/productsReducer';
import ordersReducer from './Reducers/ordersReducer';
import reviewsReducer from './Reducers/reviewsReducer';
import usersReducer from './Reducers/usersReducer';
const reducers = combineReducers({
    cartItems: cartItems,
    products: productsReducer,
    orders: ordersReducer,
    reviews: reviewsReducer,
    users: usersReducer,
})

const store = createStore(
    reducers,
    applyMiddleware(thunk)
)

export default store;
