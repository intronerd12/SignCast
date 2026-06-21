import { openDatabaseAsync } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

let dbPromise;
let sqliteAvailable = typeof openDatabaseAsync === "function";
const CART_KEY = "studyzie:cart_state";

const getDb = async () => {
    if (!sqliteAvailable) return null;
    if (!dbPromise) {
        dbPromise = openDatabaseAsync("studyzie_cart.db");
    }
    try {
        return await dbPromise;
    } catch (error) {
        sqliteAvailable = false;
        dbPromise = null;
        return null;
    }
};

export const initCartStorage = async () => {
    const db = await getDb();
    if (!db) return;
    await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cart_state (
            id TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL,
            updatedAt INTEGER NOT NULL
        );`
    );
};

export const loadCartFromStorage = async () => {
    const db = await getDb();
    if (!db) {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (error) {
            return [];
        }
    }
    await initCartStorage();
    const row = await db.getFirstAsync("SELECT payload FROM cart_state WHERE id = ?", "cart");
    if (!row?.payload) return [];
    try {
        return JSON.parse(row.payload || "[]");
    } catch (error) {
        return [];
    }
};

export const saveCartToStorage = async (items = []) => {
    const payload = JSON.stringify(items || []);
    const db = await getDb();
    if (!db) {
        await AsyncStorage.setItem(CART_KEY, payload);
        return;
    }
    await initCartStorage();
    await db.runAsync(
        "INSERT OR REPLACE INTO cart_state (id, payload, updatedAt) VALUES (?, ?, ?)",
        "cart",
        payload,
        Date.now()
    );
};

export const clearCartStorage = async () => {
    const db = await getDb();
    if (!db) {
        await AsyncStorage.removeItem(CART_KEY);
        return;
    }
    await initCartStorage();
    await db.runAsync("DELETE FROM cart_state WHERE id = ?", "cart");
};
