import React from 'react'
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import colors from '../../screens/assets/common/colors';

// Screens
import Checkout from '../../screens/Checkout/Checkout';
import Payment from '../../screens/Checkout/Payment';
import Confirm from '../../screens/Checkout/Confirm';

const Stack = createStackNavigator();

export default function CheckoutNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.white,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTintColor: colors.primary,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                cardStyle: { backgroundColor: colors.inputBg },
                ...TransitionPresets.SlideFromRightIOS
            }}
        >
            <Stack.Screen 
                name="Shipping" 
                component={Checkout} 
                options={{ title: '1. Shipping Address' }}
            />
            <Stack.Screen 
                name="Payment" 
                component={Payment} 
                options={{ title: '2. Payment Method' }}
            />
            <Stack.Screen 
                name="Confirm" 
                component={Confirm} 
                options={{ title: '3. Review Order' }}
            />
        </Stack.Navigator>
    );
}