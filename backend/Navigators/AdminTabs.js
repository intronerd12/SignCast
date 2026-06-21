import React, { useContext, useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import Dashboard from "../../screens/Admin/Dashboard";
import Analytics from "../../screens/Admin/Analytics";
import Orders from "../../screens/Admin/Orders";
import AdminSettings from "../../screens/Admin/AdminSettings";
import AuthGlobal from "../Context/Store/AuthGlobal";
import { fetchProducts, fetchCategories } from "../Redux/Actions/productActions";
import { fetchOrders } from "../Redux/Actions/orderActions";
import { fetchUsers, fetchAdminProfile } from "../Redux/Actions/userActions";
import { getToken } from "../Context/Store/tokenStorage";

const Tab = createBottomTabNavigator();

const AdminTabs = () => {
    const dispatch = useDispatch();
    const context = useContext(AuthGlobal);
    const hasPrefetched = useRef(false);
    const productsState = useSelector((state) => state.products);
    const ordersState = useSelector((state) => state.orders);
    const usersState = useSelector((state) => state.users);

    useEffect(() => {
        if (hasPrefetched.current) return;
        hasPrefetched.current = true;

        const prefetch = async () => {
            const token = await getToken();
            const userId =
                context?.stateUser?.user?.userId ||
                context?.stateUser?.user?.id ||
                context?.stateUser?.user?.sub;

            if (!productsState.items?.length && !productsState.loading) {
                dispatch(fetchProducts());
            }
            if (!productsState.categories?.length && !productsState.categoriesLoading) {
                dispatch(fetchCategories());
            }
            if (!ordersState.list?.length && !ordersState.loading) {
                dispatch(fetchOrders());
            }
            if (token) {
                if (!usersState.list?.length && !usersState.loading) {
                    dispatch(fetchUsers(token));
                }
                if (userId) {
                    dispatch(fetchAdminProfile(userId, token));
                }
            }
        };

        prefetch();
    }, [
        context?.stateUser?.user?.id,
        context?.stateUser?.user?.sub,
        context?.stateUser?.user?.userId,
        dispatch,
        ordersState.list?.length,
        ordersState.loading,
        productsState.categories?.length,
        productsState.categoriesLoading,
        productsState.items?.length,
        productsState.loading,
        usersState.list?.length,
        usersState.loading,
    ]);

    return (
        <Tab.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: "#111827",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                    marginBottom: 4,
                },
                tabBarStyle: {
                    height: 70,
                    paddingTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: "#E5E7EB",
                    backgroundColor: "#FFFFFF",
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={Dashboard}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Analytics"
                component={Analytics}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="stats-chart-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Orders"
                component={Orders}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="receipt-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tab.Screen
                name="Settings"
                component={AdminSettings}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

export default AdminTabs;
