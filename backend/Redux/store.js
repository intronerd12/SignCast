import { legacy_createStore as createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

import usersReducer from './Reducers/usersReducer';

const reducers = combineReducers({
    users: usersReducer,
})

const store = createStore(
    reducers,
    applyMiddleware(thunk)
)

export default store;
