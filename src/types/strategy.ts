import { BigNumber } from "@ethersproject/bignumber";

import { Address } from "./common";
import { StrategyMetadata } from "./metadata";
export interface VaultStrategiesMetadata {
  vaultAddress: Address;
  strategiesMetadata: StrategyMetadata[];
}

export interface HarvestData {
  transactionId: string;
  gain: BigNumber;
  gainUsdc: BigNumber;
  loss: BigNumber;
  time: Date;
  estimatedTotalAssets: BigNumber;
  apr?: number;
}
