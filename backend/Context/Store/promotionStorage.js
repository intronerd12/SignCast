import AsyncStorage from "@react-native-async-storage/async-storage";

const PROMO_KEY = "activePromotion";

export const getPromotion = async () => {
  try {
    const raw = await AsyncStorage.getItem(PROMO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

export const setPromotion = async (promotion) => {
  try {
    if (!promotion) {
      await AsyncStorage.removeItem(PROMO_KEY);
      return;
    }
    await AsyncStorage.setItem(PROMO_KEY, JSON.stringify(promotion));
  } catch (error) {
    // ignore storage errors
  }
};

export const clearPromotion = async () => {
  try {
    await AsyncStorage.removeItem(PROMO_KEY);
  } catch (error) {
    // ignore storage errors
  }
};
