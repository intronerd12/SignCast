import React, { useEffect, useReducer, useState } from "react";
// import "core-js/stable/atob";
import { jwtDecode } from "jwt-decode"

import AuthReducer from "../Reducers/Auth.reducer";
import { setCurrentUser } from "../Actions/Auth.actions";
import AuthGlobal from './AuthGlobal'
import { getToken } from "./tokenStorage";

const Auth = props => {
    // console.log(props.children)
    const [stateUser, dispatch] = useReducer(AuthReducer, {
        isAuthenticated: null,
        user: {}
    });
    const [showChild, setShowChild] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const bootstrapAuth = async () => {
            try {
                const token = await getToken();
                if (token && isMounted) {
                    const decoded = jwtDecode(token);
                    dispatch(setCurrentUser(decoded));
                }
            } catch (error) {
                if (isMounted) {
                    dispatch(setCurrentUser({}));
                }
            } finally {
                if (isMounted) {
                    setShowChild(true);
                }
            }
        };

        bootstrapAuth();

        return () => {
            isMounted = false;
            setShowChild(false);
        };
    }, [])


    if (!showChild) {
        return null;
    } else {
        return (
            <AuthGlobal.Provider
                value={{
                    stateUser,
                    dispatch
                }}
            >
                {props.children}
            </AuthGlobal.Provider>
        )
    }
};

export default Auth
