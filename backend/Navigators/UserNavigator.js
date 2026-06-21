import React, { useContext } from "react";
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'

import AuthScreen from "../../screens/AuthUI/AuthScreen";
import UserProfile from "../../screens/User/UserProfile";
import AuthGlobal from "../Context/Store/AuthGlobal";
const Stack = createStackNavigator();

const UserNavigator = (props) => {
    const context = useContext(AuthGlobal);
    const isAuthenticated = Boolean(context?.stateUser?.isAuthenticated);

    return (
        <Stack.Navigator
            initialRouteName={isAuthenticated ? "User Profile" : "Login"}
            screenOptions={{
                headerStyle: {
                    backgroundColor: "#FFFFFF",
                },
                headerTintColor: "#A16207",
                headerTitleStyle: {
                    fontWeight: "700",
                },
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen
                name="Login"
                component={AuthScreen}
                options={{
                    headerShown: false
                }}
            />

            <Stack.Screen
                name="User Profile"
                component={UserProfile}
                options={{
                    title: "My Account"
                }}
            />
        </Stack.Navigator>
    )

}

export default UserNavigator;
