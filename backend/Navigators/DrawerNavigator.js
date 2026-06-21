import * as React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

import Main from "./Main";

import DrawerContent from "../../screens/Shared/DrawerContent";

const NativeDrawer = createDrawerNavigator();
const DrawerNavigator = () => {
  return (

    <NativeDrawer.Navigator
      screenOptions={({ route }) => {
        const focusedRoute = getFocusedRouteNameFromRoute(route) ?? "Home";
        const drawerEnabled = focusedRoute === "Home";

        return {
        headerShown: false,
        drawerStyle: {
          width: '50%',
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#A16207",
        headerTitleStyle: {
          fontWeight: "700",
        },
        swipeEnabled: drawerEnabled,
        gestureEnabled: drawerEnabled,
      };
      }}
      drawerContent={(props) => <DrawerContent {...props} />}>
      <NativeDrawer.Screen 
        name="Studyzie" 
        component={Main} 
        options={{
            title: ""
        }}
      />

    </NativeDrawer.Navigator>


  );
}
export default DrawerNavigator
