import { describe, expect, test, beforeAll } from "bun:test";
import { signerToSessionKeyValidator, signerToEcdsaValidator } from "@zerodev/core/plugins";
import { getPublicClient, getSignerToSessionKeyKernelAccount, getSmartAccountClient, getEntryPoint, getSignerToEcdsaKernelAccount, getPimlicoPaymasterClient } from "./utils";
import { Address, Hex, zeroAddress, PublicClient, createClient, type Client, http, getFunctionSelector, encodeFunctionData } from "viem";
import { UserOperation, SmartAccountClient } from "@zerodev/core";
import {SessionKeyValidatorPlugin} from "@zerodev/core/plugins/toSessionKeyValidatorPlugin";
import { polygonMumbai } from "viem/chains";
import { TEST_ERC20Abi } from "./abis/Test_ERC20Abi";
import {
  getChainId,
  readContract,
  signMessage,
  signTypedData,
} from "viem/actions";
import {getAction} from "../core/utils/getAction"

describe("Session Key kernel Account", () => {
  let publicClient: PublicClient;
  let client: Client;
  let sessionKeyValidatorPlugin: SessionKeyValidatorPlugin;
  let testPrivateKey: Hex;
  let accountAddress: Address;
  let Test_ERC20Address: Address;
  let ecdsaSmartAccountClient: SmartAccountClient;
  let sessionKeySmartAccountClient: SmartAccountClient;

  beforeAll(async () => {
    Test_ERC20Address = "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B";
    publicClient = await getPublicClient();
    client = await createClient({
      chain: polygonMumbai,
      transport: http(process.env.RPC_URL as string),
    });
    // sessionKeyValidatorPlugin = await getSignerToSessionKeyKernelAccount();
    testPrivateKey = process.env.TEST_PRIVATE_KEY as Hex;

    sessionKeySmartAccountClient = await getSmartAccountClient({
      account: await getSignerToSessionKeyKernelAccount(),
      sponsorUserOperation: async ({
				entryPoint: _entryPoint,
				userOperation,
			}): Promise<{
				paymasterAndData: Hex;
				preVerificationGas: bigint;
				verificationGasLimit: bigint;
				callGasLimit: bigint;
			}> => {
				const pimlicoPaymaster = getPimlicoPaymasterClient();
				return pimlicoPaymaster.sponsorUserOperation({
					userOperation,
					entryPoint: getEntryPoint(),
				});
			},
    });
    accountAddress = await sessionKeySmartAccountClient.account?.address as Address;

    ecdsaSmartAccountClient = await getSmartAccountClient({
      account: await getSignerToEcdsaKernelAccount(),
      sponsorUserOperation: async ({
				entryPoint: _entryPoint,
				userOperation,
			}): Promise<{
				paymasterAndData: Hex;
				preVerificationGas: bigint;
				verificationGasLimit: bigint;
				callGasLimit: bigint;
			}> => {
				const pimlicoPaymaster = getPimlicoPaymasterClient();
				return pimlicoPaymaster.sponsorUserOperation({
					userOperation,
					entryPoint: getEntryPoint(),
				});
			},
    });

    
  });

  // test("Validate signature", async () => {
  //   const message = "Test message";
  //   const signature = await client.signMessage({
  //     account: sessionKeyValidatorPlugin.address,
  //     message: message,
  //   });
  //   const isValid = await sessionKeyValidatorPlugin.validateSignature(message, signature);
  //   expect(isValid).toBe(true);

  //   sessionKeyValidatorPlugin
  // });

  // test("Enable session key", async () => {
  //   const enableData = await sessionKeyValidatorPlugin.getEnableData();
  //   const transactionHash = await publicClient.sendTransaction({
  //     to: accountAddress,
  //     data: enableData,
  //     value: 0n
  //   });
  //   expect(transactionHash).toBeString();
  //   expect(transactionHash).toHaveLength(66);
  //   expect(transactionHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  // });



  // test("Disable session key", async () => {
  //   const disableData = await sessionKeyValidatorPlugin.getDisableData();
  //   const transactionHash = await publicClient.sendTransaction({
  //     to: accountAddress,
  //     data: disableData,
  //     value: 0n
  //   });
  //   expect(transactionHash).toBeString();
  //   expect(transactionHash).toHaveLength(66);
  //   expect(transactionHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
  // });

  // test("Validate signature", async () => {
  //   const message = "Test message";
  //   const signature = await publicClient.signMessage({
  //     account: accountAddress,
  //     message: message
  //   });
  //   const isValid = await sessionKeyValidatorPlugin.validateSignature(message, signature);
  //   expect(isValid).toBe(true);
  // });

  test("should execute the erc20 token transfer action using SessionKey", async () => {
    const balanceOfAccount = await getAction(
      client,
      readContract
    )({
      abi: TEST_ERC20Abi,
      address: Test_ERC20Address,
      functionName: "balanceOf",
      args: [accountAddress],
    });

    const amountToMint = balanceOfAccount > 100000000n ? 0n : 100000000n;

    const mintData = encodeFunctionData({
      abi: TEST_ERC20Abi,
      functionName: "mint",
      args: [accountAddress, amountToMint],
    });

    const mintTransactionHash = await ecdsaSmartAccountClient.sendTransaction({
      to: Test_ERC20Address,
      data: mintData,
      // value: BigInt(0),
      account: await getSignerToEcdsaKernelAccount(),
      chain: polygonMumbai,
    });

    await publicClient.waitForTransactionReceipt({
			hash: mintTransactionHash,
		});

    const transferData = encodeFunctionData({
      abi: TEST_ERC20Abi,
      functionName: "transfer",
      args: [zeroAddress, 100000000n],
    });

    const transferTransactionHash = await sessionKeySmartAccountClient.sendTransaction({
      to: Test_ERC20Address,
      data: transferData,
      // value: BigInt(0),
      chain: polygonMumbai,
      account: await getSignerToSessionKeyKernelAccount(),
    });

    await publicClient.waitForTransactionReceipt({
			hash: transferTransactionHash,
		});

    const balanceOfAccountAfterTransfer = await getAction(
      client,
      readContract
    )({
      abi: TEST_ERC20Abi,
      address: Test_ERC20Address,
      functionName: "balanceOf",
      args: [accountAddress],
    });

    expect(balanceOfAccountAfterTransfer).toBe(BigInt(0));



  }, 1000000);

  // test("Sign user operation", async () => {
  //   const userOperation: UserOperation = {
  //     sender: accountAddress,
  //     nonce: 1,
  //     initCode: "",
  //     callData: "",
  //     callGasLimit: 0n,
  //     verificationGasLimit: 0n,
  //     preVerificationGas: 0n,
  //     maxFeePerGas: 0n,
  //     maxPriorityFeePerGas: 0n,
  //     paymaster: zeroAddress,
  //     paymasterData: "",
  //     signature: ""
  //   };
  //   const signature = await sessionKeyValidatorPlugin.signUserOperation(userOperation);
  //   expect(signature).toBeString();
  //   expect(signature).toHaveLength(132);
  //   expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
  // });

  // test("Enforce permissions", async () => {
  //   // Permissions setup and enforcement logic
  //   // ...
  // });
});