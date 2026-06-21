import React from 'react'
import { createStackNavigator, TransitionPresets } from "@react-navigation/stack"

import Cart from '../../screens/Cart/Cart'
import CheckoutNavigator from './CheckoutNavigator';

const Stack = createStackNavigator();

function MyStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                ...TransitionPresets.SlideFromRightIOS,
            }}
        >
            <Stack.Screen
                name="Cart"
                component={Cart}
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="Checkout"
                component={CheckoutNavigator}
                options={{
                    headerShown: false
                }}
            />
        </Stack.Navigator>
    )
}

export default function CartNavigator() {
    return <MyStack />
}