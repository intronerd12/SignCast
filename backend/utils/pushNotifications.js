const axios = require('axios');

const chunkArray = (items, size) => {
  if (!Array.isArray(items) || size <= 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

/**
 * Sends a push notification using Expo Push API
 * @param {string|string[]} pushTokens - The recipient's Expo Push Token or array of tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 */
const sendPushNotification = async (pushTokens, title, body, data = {}) => {
  const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];
  const cleanedTokens = tokens
    .map((token) => (typeof token === "string" ? token.trim() : ""))
    .filter(Boolean);

  const isExpoPushToken = (token) =>
    typeof token === "string" &&
    (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken"));

  const messages = cleanedTokens
    .filter(isExpoPushToken)
    .map(token => ({
      to: token,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      title: title,
      body: body,
      data: data,
    }));

  if (messages.length === 0) {
    console.log('No valid push tokens provided.');
    return;
  }

  try {
    const chunks = chunkArray(messages, 100);
    const responses = [];

    for (const chunk of chunks) {
      const response = await axios.post('https://exp.host/--/api/v2/push/send', chunk, {
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
      responses.push(response.data);
    }

    console.log(`Push notification(s) sent successfully to ${messages.length} device(s)`);
    return responses.length === 1 ? responses[0] : responses;
  } catch (error) {
    console.error('Error sending push notification:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendPushNotification };
