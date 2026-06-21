import AsyncStorage from "@react-native-async-storage/async-storage";
import SQLiteStorage from "expo-sqlite/kv-store";

const TOKEN_KEY = "jwt";

export const getToken = async () => {
    try {
        const token = await SQLiteStorage.getItem(TOKEN_KEY);
        if (token) return token;
    } catch (error) {
        // Fallback handled below
    }
    return AsyncStorage.getItem(TOKEN_KEY);
};

export const setToken = async (token) => {
    try {
        if (token) {
            await SQLiteStorage.setItem(TOKEN_KEY, token);
        } else {
            await SQLiteStorage.removeItem(TOKEN_KEY);
        }
        return;
    } catch (error) {
        // Fallback handled below
    }
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
};

export const removeToken = async () => {
    try {
        await SQLiteStorage.removeItem(TOKEN_KEY);
        return;
    } catch (error) {
        // Fallback handled below
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
};
