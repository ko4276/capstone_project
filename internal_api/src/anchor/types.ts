import { Idl } from "@project-serum/anchor";

export const idl: Idl = {
  "version": "0.1.0",
  "name": "model_marketplace",
  "instructions": [
    {
      "name": "createModel",
      "accounts": [
        {
          "name": "modelAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "modelName",
          "type": "string"
        },
        {
          "name": "url",
          "type": "string"
        },
        {
          "name": "royaltyBps",
          "type": "u16"
        },
        {
          "name": "isAllowed",
          "type": "bool"
        }
      ]
    },
    {
      "name": "buyLicense",
      "accounts": [
        {
          "name": "licenseAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "modelAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "licenseType",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerDerivativeModel",
      "accounts": [
        {
          "name": "newModelAccount",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "creator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "parentModelAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "modelName",
          "type": "string"
        },
        {
          "name": "url",
          "type": "string"
        },
        {
          "name": "royaltyBps",
          "type": "u16"
        },
        {
          "name": "isActive",
          "type": "bool"
        },
        {
          "name": "isAllowed",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ModelAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey"
          },
          {
            "name": "modelName",
            "type": "string"
          },
          {
            "name": "url",
            "type": "string"
          },
          {
            "name": "royaltyBps",
            "type": "u16"
          },
          {
            "name": "isAllowed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "LicenseAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "modelAccount",
            "type": "publicKey"
          },
          {
            "name": "licenseType",
            "type": "u8"
          }
        ]
      }
    }
  ]
}; 