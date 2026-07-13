

const ROBOFLOW_API_URL = "https://serverless.roboflow.com";
const ROBOFLOW_API_KEY = "vSmtDSumhDVW5oZg72Ef";
const WORKSPACE_NAME   = "ianzaes-workspace";
const WORKFLOW_ID      = "filipino-sign-language-dataset-vfilipino-sign-language-dataset-h0guf-1-yolo11n-t1-logic";

async function test() {
  try {
    const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    // Try standard detect endpoint
    const url3 = `https://detect.roboflow.com/filipino-sign-language-dataset-h0guf/1?api_key=${ROBOFLOW_API_KEY}`;
    console.log(`\nTesting URL 3: ${url3}`);
    const res3 = await fetch(url3, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: imageBase64
    });
    console.log(`Status 3: ${res3.status}`);
    console.log(await res3.text());
  } catch(e) {
    console.error(e);
  }
}
test();
