import React, { useContext } from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

import HomeNavigator from "./HomeNavigator";
import CartNavigator from "./CartNavigator";
import UserNavigator from "./UserNavigator";
import AdminNavigator from "./AdminNavigator";
import MyOrders from "../../screens/User/MyOrders";
import Reviews from "../../screens/User/Reviews";
import { Ionicons } from "@expo/vector-icons";
import CartIcon from "../../screens/Shared/CartIcon";
import AuthGlobal from "../Context/Store/AuthGlobal";
import colors from "../../screens/assets/common/colors";
const Tab = createBottomTabNavigator();

const Main = () => {
    const context = useContext(AuthGlobal);
    const isAuthenticated = Boolean(context?.stateUser?.isAuthenticated);
    const isAdmin = Boolean(context?.stateUser?.user?.isAdmin);

    if (!isAuthenticated) {
        return <UserNavigator />
    }

    if (isAdmin) {
        return <AdminNavigator />
    }

    const tabBarBaseStyle = {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        elevation: 0,
        backgroundColor: 'rgba(141, 123, 104, 0.85)', // colors.primary with opacity for glass effect
        borderRadius: 30,
        height: 60,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255, 255, 255, 0.2)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.2)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    };

    const getCartTabBarStyle = (route) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? "Cart";
        if (["Checkout", "Shipping", "Payment", "Confirm"].includes(routeName)) {
            return { display: 'none' };
        }
        return tabBarBaseStyle;
    };

    const getHomeTabBarStyle = (route) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? "Main";
        // Hide the bottom tab bar on Product Detail to avoid overlap with the bottom action bar
        if (["Product Detail", "PromotionDetail"].includes(routeName)) {
            return { display: 'none' };
        }
        return tabBarBaseStyle;
    };

    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#ffffff', // Active icon white
                tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)', // Inactive icon faded white
                tabBarStyle: tabBarBaseStyle,
                tabBarItemStyle: {
                    padding: 5,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                tabBarBackground: () => (
                    <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                ),
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeNavigator}
                options={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: getHomeTabBarStyle(route),
                    tabBarIcon: ({ color }) => (
                        <Ionicons
                            name="home"
                            style={{ position: "relative" }}
                            color={color}
                            size={30}
                        />
                    )
                })}
            />

            <Tab.Screen
                name="My Orders"
                component={MyOrders}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color }) => (
                        <Ionicons
                            name="bag-handle"
                            style={{ position: "relative" }}
                            color={color}
                            size={30}
                        />
                    )
                }}
            />

            <Tab.Screen
                name="Ratings"
                component={Reviews}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color }) => (
                        <Ionicons
                            name="star"
                            style={{ position: "relative" }}
                            color={color}
                            size={28}
                        />
                    )
                }}
            />

            <Tab.Screen
                name="Cart Screen"
                component={CartNavigator}
                options={({ route }) => ({
                    headerShown: false,
                    tabBarStyle: getCartTabBarStyle(route),
                    tabBarIcon: ({ color }) => (
                        <View>
                            <Ionicons
                                name="cart"
                                style={{ position: "relative" }}
                                color={color}
                                size={30}
                            />
                            <CartIcon />
                        </View>
                    )
                })}
            />

            <Tab.Screen
                name="User"
                component={UserNavigator}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Ionicons
                            name="person"
                            style={{ position: "relative" }}
                            color={color}
                            size={30}
                        />
                    )
                }}
            />

        </Tab.Navigator>
    )
}
export default Main
