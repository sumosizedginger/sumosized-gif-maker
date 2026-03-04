/**
 * telemetry.js — Anonymous Usage Analytics
 */
export async function sendTelemetry(payload) {
    try {
        const response = await fetch('https://sumo-sized-api.onrender.com/telemetry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
    } catch {
        // We never want telemetry tracking to break the actual app
    }
}
