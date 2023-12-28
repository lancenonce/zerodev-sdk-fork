import {
    UserOperation,
    type UserOperationWithBigIntAsHex
} from "permissionless/types/userOperation"
import {
    Account,
    Address,
    Chain,
    Client,
    Hex,
    LocalAccount,
    Transport
} from "viem"
import { PartialBy } from "viem/types/utils"
export type KernelPaymasterRpcSchema = [
    {
        Method: "zd_sponsorUserOperation"
        Parameters: [
            {
                chainId: number
                userOp: PartialBy<
                    UserOperationWithBigIntAsHex,
                    | "callGasLimit"
                    | "preVerificationGas"
                    | "verificationGasLimit"
                    | "paymasterAndData"
                >
                entryPointAddress: Address
                gasTokenData?: {
                    tokenAddress: Hex
                    erc20UserOp: PartialBy<
                        UserOperationWithBigIntAsHex,
                        | "callGasLimit"
                        | "preVerificationGas"
                        | "verificationGasLimit"
                        | "paymasterAndData"
                    >
                    erc20CallData: Hex
                }
                shouldOverrideFee?: boolean
                manualGasEstimation?: boolean
                shouldConsume?: boolean
            }
        ]
        ReturnType: {
            paymasterAndData: Hex
            preVerificationGas: Hex
            verificationGasLimit: Hex
            callGasLimit: Hex
            maxFeePerGas: Hex
            maxPriorityFeePerGas: Hex
        }
    }
]

export type KernelPlugin<
    Name extends string = string,
    transport extends Transport = Transport,
    chain extends Chain | undefined = Chain | undefined
> = LocalAccount<Name> & {
    signer: Account
    client: Client<transport, chain>
    entryPoint: Address
    getNonceKey: () => Promise<bigint>
    getDummySignature(): Promise<Hex>
    signUserOperation: (UserOperation: UserOperation) => Promise<Hex>
    getEnableData(): Promise<Hex>
}
