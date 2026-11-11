// #include <napi.h>
// #include <windows.h>
// #include <wincrypt.h>
// #include <winbio.h>
// #include <string>

// #pragma comment(lib, "Winbio.lib")
// #pragma comment(lib, "Crypt32.lib")

// static std::string BufferToBase64(const BYTE* data, DWORD length) {
//     DWORD outLen = 0;

//     if (!CryptBinaryToStringA(
//             data,
//             length,
//             CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF,
//             nullptr,
//             &outLen)) {
//         fprintf(
//             stderr,
//             "[fingerprint.node][capture] CryptBinaryToStringA (sizing) failed, err=%lu\n",
//             GetLastError()
//         );
//         return "";
//     }

//     std::string out;
//     out.resize(outLen);

//     if (!CryptBinaryToStringA(
//             data,
//             length,
//             CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF,
//             &out[0],
//             &outLen)) {
//         fprintf(
//             stderr,
//             "[fingerprint.node][capture] CryptBinaryToStringA (encode) failed, err=%lu\n",
//             GetLastError()
//         );
//         return "";
//     }

//     out.resize(outLen);
//     return out;
// }

// class CaptureWorker : public Napi::AsyncWorker {
// public:
//     explicit CaptureWorker(Napi::Function& callback)
//         : Napi::AsyncWorker(callback) {}

//     void Execute() override {
//         fprintf(
//             stdout,
//             "[fingerprint.node][capture] Opening WinBio session...\n"
//         );
//         fflush(stdout);

//         WINBIO_SESSION_HANDLE session = NULL;

//         HRESULT hr = WinBioOpenSession(
//             WINBIO_TYPE_FINGERPRINT,
//             WINBIO_POOL_SYSTEM,
//             WINBIO_FLAG_RAW,
//             NULL,
//             0,
//             WINBIO_DB_DEFAULT,
//             &session
//         );

//         if (FAILED(hr)) {
//             failed_ = true;
//             errorMessage_ =
//                 "WinBioOpenSession failed (hr=0x" + HrHex(hr) + ")";

//             fprintf(
//                 stderr,
//                 "[fingerprint.node][capture] ERROR: %s\n",
//                 errorMessage_.c_str()
//             );
//             fflush(stderr);
//             return;
//         }

//         fprintf(
//             stdout,
//             "[fingerprint.node][capture] Session opened. Waiting for finger on reader...\n"
//         );
//         fflush(stdout);

//         WINBIO_UNIT_ID unitId = 0;
//         PWINBIO_BIR sample = nullptr;
//         SIZE_T sampleSize = 0;
//         WINBIO_REJECT_DETAIL rejectDetail = 0;

//         hr = WinBioCaptureSample(
//             session,
//             WINBIO_PURPOSE_ENROLL_FOR_VERIFICATION,
//             WINBIO_DATA_FLAG_RAW,
//             &unitId,
//             &sample,
//             &sampleSize,
//             &rejectDetail
//         );

//         fprintf(
//             stdout,
//             "[fingerprint.node][capture] WinBioCaptureSample returned hr=0x%08X, unitId=%lu, sampleSize=%zu, rejectDetail=%lu\n",
//             static_cast<unsigned int>(hr),
//             unitId,
//             sampleSize,
//             rejectDetail
//         );
//         fflush(stdout);

//         if (FAILED(hr)) {
//             failed_ = true;
//             rejectDetail_ = rejectDetail;
//             errorMessage_ =
//                 "WinBioCaptureSample failed (hr=0x" + HrHex(hr) + ")";

//             fprintf(
//                 stderr,
//                 "[fingerprint.node][capture] ERROR: %s\n",
//                 errorMessage_.c_str()
//             );
//             fflush(stderr);

//             WinBioCloseSession(session);
//             return;
//         }

//         fprintf(
//             stdout,
//             "[fingerprint.node][capture] Sample captured. Base64-encoding %zu bytes...\n",
//             sampleSize
//         );
//         fflush(stdout);

//         templateReference_ = BufferToBase64(
//             reinterpret_cast<const BYTE*>(sample),
//             static_cast<DWORD>(sampleSize)
//         );

//         WinBioFree(sample);
//         WinBioCloseSession(session);

//         if (templateReference_.empty()) {
//             failed_ = true;
//             errorMessage_ = "Failed to base64-encode captured sample";

//             fprintf(
//                 stderr,
//                 "[fingerprint.node][capture] ERROR: %s\n",
//                 errorMessage_.c_str()
//             );
//             fflush(stderr);
//             return;
//         }

//         fprintf(
//             stdout,
//             "[fingerprint.node][capture] SUCCESS. templateReference length=%zu chars\n",
//             templateReference_.size()
//         );
//         fflush(stdout);

//         success_ = true;
//     }

//     void OnOK() override {
//         Napi::HandleScope scope(Env());

//         Napi::Object result = Napi::Object::New(Env());

//         if (success_) {
//             result.Set(
//                 "success",
//                 Napi::Boolean::New(Env(), true)
//             );

//             result.Set(
//                 "templateReference",
//                 Napi::String::New(Env(), templateReference_)
//             );
//         } else {
//             result.Set(
//                 "success",
//                 Napi::Boolean::New(Env(), false)
//             );

//             result.Set(
//                 "error",
//                 Napi::String::New(Env(), errorMessage_)
//             );

//             result.Set(
//                 "rejectDetail",
//                 Napi::Number::New(Env(), rejectDetail_)
//             );
//         }

//         Callback().Call({
//             Env().Null(),
//             result
//         });
//     }

//     void OnError(const Napi::Error& e) override {
//         Napi::HandleScope scope(Env());

//         Callback().Call({
//             e.Value(),
//             Env().Undefined()
//         });
//     }

// private:
//     static std::string HrHex(HRESULT hr) {
//         char buf[16];

//         sprintf_s(
//             buf,
//             "%08X",
//             static_cast<unsigned int>(hr)
//         );

//         return std::string(buf);
//     }

//     bool success_ = false;
//     bool failed_ = false;
//     std::string templateReference_;
//     std::string errorMessage_;
//     WINBIO_REJECT_DETAIL rejectDetail_ = 0;
// };

// Napi::Value Capture(const Napi::CallbackInfo& info) {
//     Napi::Env env = info.Env();

//     if (info.Length() < 1 || !info[0].IsFunction()) {
//         Napi::TypeError::New(
//             env,
//             "capture(callback) expects a callback function"
//         ).ThrowAsJavaScriptException();

//         return env.Null();
//     }

//     Napi::Function callback = info[0].As<Napi::Function>();

//     (new CaptureWorker(callback))->Queue();

//     return env.Undefined();
// }

// Napi::Object Init(Napi::Env env, Napi::Object exports) {
//     exports.Set(
//         "capture",
//         Napi::Function::New(env, Capture)
//     );

//     return exports;
// }

// NODE_API_MODULE(fingerprint, Init)

#include <napi.h>
#include <windows.h>
#include <wincrypt.h>
#include <winbio.h>
#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

#pragma comment(lib, "Winbio.lib")
#pragma comment(lib, "Crypt32.lib")

namespace {

std::string HrHex(HRESULT hr) {
    char buf[16];
    sprintf_s(buf, "%08X", static_cast<unsigned int>(hr));
    return std::string(buf);
}

std::string BufferToBase64(const BYTE* data, DWORD length) {
    DWORD outLen = 0;

    if (!CryptBinaryToStringA(
            data, length,
            CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF,
            nullptr, &outLen)) {
        fprintf(
            stderr,
            "[fingerprint.node] CryptBinaryToStringA (sizing) failed, err=%lu\n",
            GetLastError());
        return "";
    }

    std::string out;
    out.resize(outLen);

    if (!CryptBinaryToStringA(
            data, length,
            CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF,
            &out[0], &outLen)) {
        fprintf(
            stderr,
            "[fingerprint.node] CryptBinaryToStringA (encode) failed, err=%lu\n",
            GetLastError());
        return "";
    }

    out.resize(outLen);
    return out;
}

// Cheap, stable content fingerprint for the raw captured bytes. Not used for
// any security purpose - only so captureMultiple() can tell "the same touch
// read twice" apart from "a genuinely different scan", so it can ask for
// another touch instead of silently enrolling a duplicate sample.
std::string HashRawBytes(const BYTE* data, DWORD length) {
    std::string result;

    HCRYPTPROV hProv = 0;
    if (!CryptAcquireContextW(&hProv, nullptr, nullptr, PROV_RSA_AES, CRYPT_VERIFYCONTEXT)) {
        return result;
    }

    HCRYPTHASH hHash = 0;
    if (!CryptCreateHash(hProv, CALG_SHA_256, 0, 0, &hHash)) {
        CryptReleaseContext(hProv, 0);
        return result;
    }

    if (CryptHashData(hHash, data, length, 0)) {
        DWORD hashLen = 0;
        DWORD hashLenSize = sizeof(hashLen);
        CryptGetHashParam(hHash, HP_HASHSIZE, reinterpret_cast<BYTE*>(&hashLen), &hashLenSize, 0);

        std::vector<BYTE> hashBytes(hashLen);
        if (CryptGetHashParam(hHash, HP_HASHVAL, hashBytes.data(), &hashLen, 0)) {
            char hex[3];
            result.reserve(static_cast<size_t>(hashLen) * 2);
            for (DWORD i = 0; i < hashLen; ++i) {
                sprintf_s(hex, "%02x", hashBytes[i]);
                result += hex;
            }
        }
    }

    CryptDestroyHash(hHash);
    CryptReleaseContext(hProv, 0);
    return result;
}

// Result of a single WinBioCaptureSample() call, independent of whether it's
// being used for a one-off login scan or as one slot in a multi-scan enroll.
struct SingleCaptureResult {
    bool success = false;
    std::string base64;
    std::string rawHash;
    std::string errorMessage;
    WINBIO_REJECT_DETAIL rejectDetail = 0;
};

SingleCaptureResult CaptureOneSample(WINBIO_SESSION_HANDLE session) {
    SingleCaptureResult result;

    WINBIO_UNIT_ID unitId = 0;
    PWINBIO_BIR sample = nullptr;
    SIZE_T sampleSize = 0;
    WINBIO_REJECT_DETAIL rejectDetail = 0;

    HRESULT hr = WinBioCaptureSample(
        session,
        WINBIO_PURPOSE_ENROLL_FOR_VERIFICATION,
        WINBIO_DATA_FLAG_RAW,
        &unitId,
        &sample,
        &sampleSize,
        &rejectDetail);

    fprintf(
        stdout,
        "[fingerprint.node][capture] WinBioCaptureSample returned hr=0x%08X, unitId=%lu, sampleSize=%zu, rejectDetail=%lu\n",
        static_cast<unsigned int>(hr), unitId, sampleSize, rejectDetail);
    fflush(stdout);

    if (FAILED(hr)) {
        result.rejectDetail = rejectDetail;
        result.errorMessage = "WinBioCaptureSample failed (hr=0x" + HrHex(hr) + ")";
        return result;
    }

    result.base64 = BufferToBase64(reinterpret_cast<const BYTE*>(sample), static_cast<DWORD>(sampleSize));
    result.rawHash = HashRawBytes(reinterpret_cast<const BYTE*>(sample), static_cast<DWORD>(sampleSize));

    WinBioFree(sample);

    if (result.base64.empty()) {
        result.errorMessage = "Failed to base64-encode captured sample";
        return result;
    }

    result.success = true;
    return result;
}

WINBIO_SESSION_HANDLE OpenFingerprintSession(HRESULT* outHr) {
    WINBIO_SESSION_HANDLE session = NULL;
    *outHr = WinBioOpenSession(
        WINBIO_TYPE_FINGERPRINT,
        WINBIO_POOL_SYSTEM,
        WINBIO_FLAG_RAW,
        NULL,
        0,
        WINBIO_DB_DEFAULT,
        &session);
    return session;
}

}  // namespace

// ---------------------------------------------------------------------------
// Single-sample capture - used for fingerprint-login (main.js sends this one
// live scan to the backend, which now scores it against every enrolled
// sample for the credential itself).
// ---------------------------------------------------------------------------

class CaptureWorker : public Napi::AsyncWorker {
public:
    explicit CaptureWorker(Napi::Function& callback)
        : Napi::AsyncWorker(callback) {}

    void Execute() override {
        fprintf(stdout, "[fingerprint.node][capture] Opening WinBio session...\n");
        fflush(stdout);

        HRESULT hr = S_OK;
        WINBIO_SESSION_HANDLE session = OpenFingerprintSession(&hr);

        if (FAILED(hr)) {
            failed_ = true;
            errorMessage_ = "WinBioOpenSession failed (hr=0x" + HrHex(hr) + ")";
            fprintf(stderr, "[fingerprint.node][capture] ERROR: %s\n", errorMessage_.c_str());
            fflush(stderr);
            return;
        }

        fprintf(stdout, "[fingerprint.node][capture] Session opened. Waiting for finger on reader...\n");
        fflush(stdout);

        SingleCaptureResult capture = CaptureOneSample(session);
        WinBioCloseSession(session);

        if (!capture.success) {
            failed_ = true;
            rejectDetail_ = capture.rejectDetail;
            errorMessage_ = capture.errorMessage;
            fprintf(stderr, "[fingerprint.node][capture] ERROR: %s\n", errorMessage_.c_str());
            fflush(stderr);
            return;
        }

        templateReference_ = capture.base64;
        success_ = true;

        fprintf(
            stdout,
            "[fingerprint.node][capture] SUCCESS. templateReference length=%zu chars\n",
            templateReference_.size());
        fflush(stdout);
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        Napi::Object result = Napi::Object::New(Env());

        if (success_) {
            result.Set("success", Napi::Boolean::New(Env(), true));
            result.Set("templateReference", Napi::String::New(Env(), templateReference_));
        } else {
            result.Set("success", Napi::Boolean::New(Env(), false));
            result.Set("error", Napi::String::New(Env(), errorMessage_));
            result.Set("rejectDetail", Napi::Number::New(Env(), rejectDetail_));
        }

        Callback().Call({Env().Null(), result});
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        Callback().Call({e.Value(), Env().Undefined()});
    }

private:
    bool success_ = false;
    bool failed_ = false;
    std::string templateReference_;
    std::string errorMessage_;
    WINBIO_REJECT_DETAIL rejectDetail_ = 0;
};

Napi::Value Capture(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsFunction()) {
        Napi::TypeError::New(env, "capture(callback) expects a callback function")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Function callback = info[0].As<Napi::Function>();
    (new CaptureWorker(callback))->Queue();
    return env.Undefined();
}

struct ProgressPayload {
    int index;
    int total;
    std::string stage;
};

class CaptureMultipleWorker : public Napi::AsyncWorker {
public:
    CaptureMultipleWorker(Napi::Function& callback, int sampleCount, Napi::ThreadSafeFunction progressTsfn)
        : Napi::AsyncWorker(callback),
          sampleCount_(sampleCount),
          progressTsfn_(progressTsfn) {}

    ~CaptureMultipleWorker() override {
        progressTsfn_.Release();
    }

    void Execute() override {
        fprintf(
            stdout,
            "[fingerprint.node][captureMultiple] Opening WinBio session for %d samples...\n",
            sampleCount_);
        fflush(stdout);

        HRESULT hr = S_OK;
        WINBIO_SESSION_HANDLE session = OpenFingerprintSession(&hr);

        if (FAILED(hr)) {
            failed_ = true;
            errorMessage_ = "WinBioOpenSession failed (hr=0x" + HrHex(hr) + ")";
            fprintf(stderr, "[fingerprint.node][captureMultiple] ERROR: %s\n", errorMessage_.c_str());
            fflush(stderr);
            return;
        }

        std::vector<std::string> seenHashes;

        const int kMaxAttemptsPerSlot = 10;

        for (int index = 1; index <= sampleCount_; ++index) {
            EmitProgress(index, "waiting");

            bool acceptedThisSlot = false;

            for (int attempt = 0; attempt < kMaxAttemptsPerSlot && !acceptedThisSlot; ++attempt) {
                SingleCaptureResult capture = CaptureOneSample(session);

                if (!capture.success) {
                    failed_ = true;
                    rejectDetail_ = capture.rejectDetail;
                    errorMessage_ = capture.errorMessage;
                    fprintf(
                        stderr,
                        "[fingerprint.node][captureMultiple] ERROR on sample %d: %s\n",
                        index, errorMessage_.c_str());
                    fflush(stderr);
                    WinBioCloseSession(session);
                    return;
                }

                bool isDuplicate = !capture.rawHash.empty() &&
                    std::find(seenHashes.begin(), seenHashes.end(), capture.rawHash) != seenHashes.end();

                if (isDuplicate) {
                    fprintf(
                        stdout,
                        "[fingerprint.node][captureMultiple] Duplicate read at slot %d (attempt %d), asking for another touch\n",
                        index, attempt + 1);
                    fflush(stdout);
                    EmitProgress(index, "duplicate");
                    continue;
                }

                if (!capture.rawHash.empty()) {
                    seenHashes.push_back(capture.rawHash);
                }
                templateReferences_.push_back(capture.base64);
                acceptedThisSlot = true;
                EmitProgress(index, "captured");
            }

            if (!acceptedThisSlot) {
                failed_ = true;
                errorMessage_ = "Too many duplicate reads - lift and reposition your finger between scans";
                fprintf(stderr, "[fingerprint.node][captureMultiple] ERROR: %s\n", errorMessage_.c_str());
                fflush(stderr);
                WinBioCloseSession(session);
                return;
            }
        }

        WinBioCloseSession(session);
        success_ = true;

        fprintf(
            stdout,
            "[fingerprint.node][captureMultiple] SUCCESS. Captured %zu samples\n",
            templateReferences_.size());
        fflush(stdout);
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        Napi::Object result = Napi::Object::New(Env());

        if (success_) {
            result.Set("success", Napi::Boolean::New(Env(), true));

            Napi::Array arr = Napi::Array::New(Env(), templateReferences_.size());
            for (size_t i = 0; i < templateReferences_.size(); ++i) {
                arr.Set(static_cast<uint32_t>(i), Napi::String::New(Env(), templateReferences_[i]));
            }
            result.Set("templateReferences", arr);
        } else {
            result.Set("success", Napi::Boolean::New(Env(), false));
            result.Set("error", Napi::String::New(Env(), errorMessage_));
            result.Set("rejectDetail", Napi::Number::New(Env(), rejectDetail_));
        }

        Callback().Call({Env().Null(), result});
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        Callback().Call({e.Value(), Env().Undefined()});
    }

private:
    void EmitProgress(int index, const char* stage) {
        auto* payload = new ProgressPayload{index, sampleCount_, stage};

        napi_status status = progressTsfn_.BlockingCall(
            payload,
            [](Napi::Env env, Napi::Function jsCallback, ProgressPayload* data) {
                Napi::Object progress = Napi::Object::New(env);
                progress.Set("index", Napi::Number::New(env, data->index));
                progress.Set("total", Napi::Number::New(env, data->total));
                progress.Set("stage", Napi::String::New(env, data->stage));
                jsCallback.Call({progress});
                delete data;
            });

        if (status != napi_ok) {
            delete payload;
        }
    }

    int sampleCount_;
    Napi::ThreadSafeFunction progressTsfn_;

    bool success_ = false;
    bool failed_ = false;
    std::vector<std::string> templateReferences_;
    std::string errorMessage_;
    WINBIO_REJECT_DETAIL rejectDetail_ = 0;
};

Napi::Value CaptureMultiple(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3 || !info[0].IsNumber() || !info[1].IsFunction() || !info[2].IsFunction()) {
        Napi::TypeError::New(
            env,
            "captureMultiple(sampleCount, onProgress, callback) expects (number, function, function)")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    int sampleCount = info[0].As<Napi::Number>().Int32Value();
    if (sampleCount < 1) {
        Napi::RangeError::New(env, "sampleCount must be at least 1").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Function progressCallback = info[1].As<Napi::Function>();
    Napi::Function finalCallback = info[2].As<Napi::Function>();

    Napi::ThreadSafeFunction progressTsfn = Napi::ThreadSafeFunction::New(
        env,
        progressCallback,
        "FingerprintCaptureProgress",
        0,   
        1); 

    (new CaptureMultipleWorker(finalCallback, sampleCount, progressTsfn))->Queue();
    return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("capture", Napi::Function::New(env, Capture));
    
    exports.Set("captureFingerprintSample", Napi::Function::New(env, Capture));
    exports.Set("captureMultiple", Napi::Function::New(env, CaptureMultiple));
    return exports;
}

NODE_API_MODULE(fingerprint, Init)