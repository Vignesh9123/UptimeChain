/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/contract.json`.
 */
export type Contract = {
  "address": "3tezpLbcXZEZmiRjMMWfb2zSgnR39DpsCK8MC2BkFeAH",
  "metadata": {
    "name": "contract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initializeRewardVault",
      "discriminator": [
        33,
        115,
        172,
        200,
        102,
        221,
        242,
        128
      ],
      "accounts": [
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeStakePool",
      "discriminator": [
        48,
        189,
        243,
        73,
        19,
        67,
        36,
        83
      ],
      "accounts": [
        {
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeTarget",
      "discriminator": [
        167,
        178,
        27,
        189,
        27,
        100,
        156,
        184
      ],
      "accounts": [
        {
          "name": "targetAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  114,
                  103,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "targetId"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "targetId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initializeValidator",
      "discriminator": [
        1,
        208,
        135,
        238,
        15,
        185,
        20,
        172
      ],
      "accounts": [
        {
          "name": "validatorAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator"
              }
            ]
          }
        },
        {
          "name": "validator"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitRound",
      "discriminator": [
        249,
        136,
        54,
        171,
        179,
        230,
        145,
        107
      ],
      "accounts": [
        {
          "name": "targetAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  114,
                  103,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "targetId"
              }
            ]
          }
        },
        {
          "name": "roundAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "target_account.target_id",
                "account": "targetAccount"
              },
              {
                "kind": "arg",
                "path": "roundTimestamp"
              }
            ]
          }
        },
        {
          "name": "rewardVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "verifier",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "targetId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "roundTimestamp",
          "type": "i64"
        },
        {
          "name": "uptimePercent",
          "type": "u16"
        },
        {
          "name": "medianLatencyMs",
          "type": "u32"
        },
        {
          "name": "reportHash",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "rewardPerValidator",
          "type": "u64"
        }
      ]
    },
    {
      "name": "validatorStake",
      "discriminator": [
        202,
        103,
        63,
        147,
        231,
        211,
        229,
        42
      ],
      "accounts": [
        {
          "name": "validatorAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator"
              }
            ]
          }
        },
        {
          "name": "validator",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "validatorUnstake",
      "discriminator": [
        15,
        21,
        113,
        173,
        44,
        95,
        78,
        123
      ],
      "accounts": [
        {
          "name": "validatorAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "validator"
              }
            ]
          }
        },
        {
          "name": "validator",
          "writable": true,
          "signer": true
        },
        {
          "name": "stakePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  107,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "rewardVault",
      "discriminator": [
        201,
        22,
        221,
        167,
        208,
        16,
        210,
        33
      ]
    },
    {
      "name": "roundSummaryAccount",
      "discriminator": [
        218,
        60,
        246,
        235,
        244,
        100,
        4,
        81
      ]
    },
    {
      "name": "stakeVault",
      "discriminator": [
        192,
        112,
        65,
        125,
        129,
        151,
        173,
        226
      ]
    },
    {
      "name": "targetAccount",
      "discriminator": [
        140,
        246,
        247,
        200,
        198,
        220,
        24,
        250
      ]
    },
    {
      "name": "validatorAccount",
      "discriminator": [
        32,
        144,
        229,
        203,
        9,
        154,
        158,
        255
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "insufficientFunds",
      "msg": "Vault has insufficient funds"
    },
    {
      "code": 6001,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6002,
      "name": "zeroAmount",
      "msg": "Reward amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "noRecipients",
      "msg": "No recipients provided"
    },
    {
      "code": 6004,
      "name": "invalidRoundOrder",
      "msg": "invalidRoundOrder"
    },
    {
      "code": 6005,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6006,
      "name": "noStakeAmountToUnstake",
      "msg": "Stake amount is 0"
    },
    {
      "code": 6007,
      "name": "invalidRoundTimestamp",
      "msg": "Invalid round timestamp"
    }
  ],
  "types": [
    {
      "name": "rewardVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roundSummaryAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "targetId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "roundTimestamp",
            "type": "i64"
          },
          {
            "name": "uptimePercent",
            "type": "u16"
          },
          {
            "name": "medianLatencyMs",
            "type": "u32"
          },
          {
            "name": "reportHash",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "stakeVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "targetAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "targetId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "validatorAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validatorPubkey",
            "type": "pubkey"
          },
          {
            "name": "stakeAmount",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
