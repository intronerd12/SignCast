const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const NGROK_API_URL = 'http://127.0.0.1:4040/api/tunnels';
const BASEURL_FILE_PATH = path.join(__dirname, '..', '..', 'screens', 'assets', 'common', 'baseurl.js');
const BACKEND_PORT = 5000; // Default backend port

function getNgrokPublicUrl() {
    return new Promise((resolve, reject) => {
        const request = http.get(NGROK_API_URL, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (!json.tunnels || !Array.isArray(json.tunnels)) {
                        resolve(null);
                        return;
                    }

                    const httpsTunnel = json.tunnels.find((tunnel) => typeof tunnel.public_url === 'string' && tunnel.public_url.startsWith('https://'));
                    const httpTunnel = json.tunnels.find((tunnel) => typeof tunnel.public_url === 'string' && tunnel.public_url.startsWith('http://'));
                    const tunnel = httpsTunnel || httpTunnel || json.tunnels[0];

                    if (!tunnel || !tunnel.public_url) {
                        resolve(null);
                        return;
                    }

                    resolve(tunnel.public_url);
                } catch (error) {
                    // JSON parse error or other issue
                    resolve(null);
                }
            });
        });

        request.on('error', (error) => {
            // Ngrok not running or connection refused
            resolve(null);
        });
    });
}

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }

    if (addresses.length === 0) {
        return 'localhost';
    }

    // Heuristic: Prefer Wi-Fi first
    const wifi = addresses.find(item => item.name.toLowerCase().includes('wi-fi'));
    if (wifi) {
        return wifi.address;
    }

    // Then Ethernet (excluding VirtualBox default 192.168.56.1)
    const ethernet = addresses.find(item => 
        item.name.toLowerCase().includes('ethernet') && 
        !item.name.toLowerCase().includes('vethernet') &&
        item.address !== '192.168.56.1'
    );
    
    if (ethernet) {
        return ethernet.address;
    }

    // Fallback: Avoid 192.168.56.1 (VirtualBox default) if possible
    const nonVirtualBox = addresses.find(item => item.address !== '192.168.56.1');
    if (nonVirtualBox) {
        return nonVirtualBox.address;
    }

    return addresses[0].address;
}

function buildApiBaseUrl(host, isNgrok = false) {
    if (!host) {
        return null;
    }

    let url = host;
    // If it's a local IP or localhost, add protocol and port
    if (!isNgrok && !url.startsWith('http')) {
        url = `http://${host}:${BACKEND_PORT}`;
    }

    const normalized = url.endsWith('/') ? url.slice(0, -1) : url;
    return `${normalized}/api/v1/`;
}

function writeBaseUrlFile(apiBaseUrl) {
    const contentLines = [
        "import { Platform } from 'react-native'",
        "",
        `let baseURL = '${apiBaseUrl}'`,
        "",
        "export default baseURL;",
        ""
    ];

    fs.writeFileSync(BASEURL_FILE_PATH, contentLines.join('\n'), { encoding: 'utf8' });
}

function askUserForIp(defaultIp) {
    if (!process.stdin.isTTY) {
        return Promise.resolve(defaultIp);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        // Set a timeout to auto-select default if user doesn't respond quickly (optional, but good for UX)
        // However, user specifically asked to type it, so let's wait.
        // But to avoid blocking if they just ran it and walked away, maybe a timeout is good?
        // Let's stick to simple prompt first as per request.
        
        rl.question(`\nNgrok not detected.\nEnter IP address (Press Enter for default: ${defaultIp}): `, (answer) => {
            rl.close();
            const input = answer.trim();
            resolve(input.length > 0 ? input : defaultIp);
        });
    });
}

async function updateOnce() {
    try {
        let publicUrl = await getNgrokPublicUrl();
        let isNgrok = true;

        if (!publicUrl) {
            console.log('No ngrok tunnel detected. Falling back to local IP address.');
            const localIp = getLocalIpAddress();
            
            // Ask user for input
            publicUrl = await askUserForIp(localIp);
            
            // If user typed something different than localIp, treat it as custom
            // But if they just pressed enter, it's localIp
            // Logic for isNgrok is strictly false here
            isNgrok = false;
        }

        const apiBaseUrl = buildApiBaseUrl(publicUrl, isNgrok);
        if (!apiBaseUrl) {
            console.log('Failed to build API base URL');
            return;
        }

        writeBaseUrlFile(apiBaseUrl);
        console.log(`Updated baseURL to ${apiBaseUrl} (${isNgrok ? 'ngrok' : 'local/custom'})`);
    } catch (error) {
        console.error('Failed to update URL:', error.message || error);
    }
}

async function watchAndUpdate(intervalMs) {
    let lastBaseUrl = null;

    const tick = async () => {
        try {
            let publicUrl = await getNgrokPublicUrl();
            let isNgrok = true;

            if (!publicUrl) {
                 // In watch mode, if ngrok isn't running, we might still want to use local IP
                 // or we might want to wait for ngrok.
                 // The user asked for "npm start works even there is no ngrok".
                 // So we should fallback here too.
                 publicUrl = getLocalIpAddress();
                 isNgrok = false;
            }

            const apiBaseUrl = buildApiBaseUrl(publicUrl, isNgrok);
            
            if (apiBaseUrl && apiBaseUrl !== lastBaseUrl) {
                writeBaseUrlFile(apiBaseUrl);
                console.log(`Updated baseURL to ${apiBaseUrl} (${isNgrok ? 'ngrok' : 'local'})`);
                lastBaseUrl = apiBaseUrl;
            }
        } catch (error) {
            // Ignore errors in watch loop
        }
        setTimeout(tick, intervalMs);
    };

    tick();
}

const args = process.argv.slice(2);
if (args.includes('--watch')) {
    watchAndUpdate(2000);
} else {
    updateOnce();
}
