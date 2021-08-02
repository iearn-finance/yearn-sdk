import { Address, Integer, Usdc } from "../common";

export interface TransactionOutcome {
  sourceTokenAddress: Address;
  sourceTokenAmount: Integer;
  targetTokenAddress: Address;
  targetTokenAmount: Integer;
  targetTokenAmountUsdc: Usdc;
  targetUnderlyingTokenAddress: Address;
  targetUnderlyingTokenAmount: Integer;
  conversionRate: number;
  slippage: number;
}

export interface SimulationOptions {
  slippage?: number;
  root?: string;
  forkId?: string;
  gasPrice?: Integer;
  gasLimit?: Integer;
}
