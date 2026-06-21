import React from 'react'
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack"
// import { Stack } from 'expo-router';
import ProductContainer from '../../screens/Product/ProductContainer';
import SingleProduct from '../../screens/Product/SingleProduct';
import PromotionDetail from '../../screens/User/PromotionDetail';

const Stack = createStackNavigator()
function MyStack() {
    return (
        <Stack.Navigator
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
                name='Main'
                component={ProductContainer}
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name='Product Detail'
                component={SingleProduct}
                options={{
                    headerShown: true,
                    title: "Product Details",
                }}
            />
            <Stack.Screen
                name='PromotionDetail'
                component={PromotionDetail}
                options={{
                    headerShown: true,
                    title: "Special Promotion",
                }}
            />
        </Stack.Navigator>
    )
}

export default function HomeNavigator() {
    return <MyStack />;
}
