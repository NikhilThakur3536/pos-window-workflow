{
  "targets": [
    {
      "target_name": "fingerprint",
      "sources": [ "fingerprint_addon.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        
        "C:/Program Files/DigitalPersona/U.are.U SDK/Include"
      ],
      "libraries": [
        "C:/Program Files/DigitalPersona/U.are.U SDK/Lib/x64/dpfpdd.lib",
        "C:/Program Files/DigitalPersona/U.are.U SDK/Lib/x64/dpfj.lib",
        "Crypt32.lib"
      ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      }
    }
  ]
}