import { Address, Integer, Locale } from "./common";
import { EarningsDayData } from "./custom/earnings";
import { Apy } from "./custom/vault";
import { VaultStrategiesMetadata } from "./strategy";

/**
 * Lens-defined metadata for Yearn Vaults (v1 & v2)
 */
export interface VaultMetadata {
  allowZapIn?: boolean;
  allowZapOut?: boolean;
  apy?: Apy;
  controller: Address;
  defaultDisplayToken: Address;
  depositLimit: Integer;
  depositsDisabled?: boolean;
  displayIcon: string;
  displayName: string; // TODO: should be optional
  emergencyShutdown: boolean;
  hideIfNoDeposits: boolean;
  historicEarnings?: EarningsDayData[];
  latestVaultAddress: Address;
  migrationAvailable: boolean; // TODO: should be optional
  migrationContract?: Address;
  migrationTargetVault?: Address;
  pricePerShare: Integer;
  strategies?: VaultStrategiesMetadata;
  symbol?: string;
  totalAssets: Integer;
  totalSupply: Integer;
  vaultDetailPageAssets?: string[];
  vaultNameOverride?: string;
  withdrawalsDisabled?: boolean;
  zapInWith?: string;
  zapOutWith?: string;
}

/**
 * Lens-defined metadata for a Voting Escrow
 */
export interface VotingEscrowMetadata {
  apy?: Apy;
  rewardPool: Address;
}

/**
 * Lens-defined metadata for a Gauge
 */
export interface GaugeMetadata {
  apy: number;
  displayIcon: string;
  displayName: string;
  vaultApy?: Apy;
  vaultPricePerShare: Integer;
  vaultUnderlyingToken: Address;
  rewardToken: Address;
  votingEscrowToken: Address;
}

/**
 * Key Value representation of metadata names and types.
 * Used mainly to provide correct type-guards for asset types.
 */
export type Metadata = {
  VAULT_V2: VaultMetadata;
  VAULT_V1: VaultMetadata;
  VOTING_ESCROW: VotingEscrowMetadata;
  GAUGE: GaugeMetadata;
};

/**
 * Union type of all the existing Metadata types.
 */
export type TypeId = keyof Metadata;

export interface LocalizedProperties {
  name?: string;
  description: string;
}

export type Localization = Partial<Record<Locale, LocalizedProperties>>;
/**
 * Token metadata from yearn-meta
 */
export interface TokenMetadata {
  address: Address;
  categories?: string[];
  description: string;
  website: string;
  tokenIconOverride?: string;
  tokenSymbolOverride?: string;
  tokenNameOverride?: string;
  localization: Localization;
}

export interface StrategyMetadata {
  name: string;
  description: string;
  address: Address;
  protocols: string[];
}

export interface StrategiesMetadata {
  name: string;
  description: string;
  localization: Localization;
  addresses: Address[];
  protocols: string[];
}

export interface VaultMetadataOverrides {
  address: Address;
  allowZapIn?: boolean;
  allowZapOut?: boolean;
  apyOverride?: number;
  apyTypeOverride?: string;
  comment?: string;
  depositsDisabled?: boolean;
  displayName?: string;
  hideAlways?: boolean;
  migrationAvailable?: boolean;
  migrationContract?: Address;
  migrationTargetVault?: Address;
  order?: number;
  retired?: boolean;
  useVaultDataAsDefault?: boolean;
  vaultDetailPageAssets?: string[];
  vaultIconOverride?: string;
  vaultNameOverride?: string;
  vaultSymbolOverride?: string;
  withdrawalsDisabled?: boolean;
  zapInWith?: string;
  zapOutWith?: string;
}
