
const path = require('path');

const BINDING_PATH = path.join(__dirname, 'build', 'Release', 'fingerprint.node');
console.log('[fingerprint-addon] Loading native binary from:', BINDING_PATH);

let binding;
try {
    binding = require(BINDING_PATH);
    console.log('[fingerprint-addon] Native binary loaded successfully. Exported keys:', Object.keys(binding));
} catch (err) {
    console.error('[fingerprint-addon] FAILED to load native binary. Did you run "node-gyp rebuild" and "electron-rebuild"?', err);
    throw err;
}

function captureFingerprintSample() {
    console.log('[fingerprint-addon] captureFingerprintSample() called - waiting for finger on reader...');
    return new Promise((resolve, reject) => {
        binding.capture((err, result) => {
            if (err) {
                console.error('[fingerprint-addon] capture() native callback returned an ERROR:', err);
                return reject(err);
            }
            console.log('[fingerprint-addon] capture() native callback returned success:', result.success,
                result.success ? `(templateReference length=${result.templateReference.length})` : `(error=${result.error})`);
            resolve(result);
        });
    });
}

function captureMultiple(sampleCount, onProgress) {
    console.log(`[fingerprint-addon] captureMultiple(${sampleCount}) called`);
    return new Promise((resolve, reject) => {
        binding.captureMultiple(
            sampleCount,
            (progress) => {
                try { onProgress && onProgress(progress); } catch (_) {}
            },
            (err, result) => {
                if (err) {
                    console.error('[fingerprint-addon] captureMultiple() native callback ERROR:', err);
                    return reject(err);
                }
                console.log('[fingerprint-addon] captureMultiple() SUCCESS:', result.success,
                    result.success ? `(${result.templateReferences.length} samples)` : `(error=${result.error})`);
                resolve(result);
            },
        );
    });
}

module.exports = { captureFingerprintSample, captureMultiple };
