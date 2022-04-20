import { ChainId, isEthereum, isFantom } from "./chain";
import { Token, VaultMetadataOverrides } from "./types";

export type ZapInWith = keyof Token["supported"];

type ZapInDetails = { isZapInSupported: boolean; zapInWith?: ZapInWith };

type ZapInArgs = {
  chainId: ChainId;
  token?: Partial<Token>;
  vaultMetadata: VaultMetadataOverrides | null;
};

export function getZapInDetails({ chainId, token, vaultMetadata }: ZapInArgs): ZapInDetails {
  if (!token?.supported || !vaultMetadata) {
    return { isZapInSupported: false };
  }

  if (isEthereum(chainId)) {
    const { zapInWith } = vaultMetadata;

    if (zapInWith && isValidZap(zapInWith, token.supported)) {
      const isZapInSupported = !!token.supported[zapInWith];
      return { isZapInSupported, zapInWith };
    }
  }

  if (isFantom(chainId)) {
    const zapInWith = "ftmApeZap"; // Hardcoded for now

    const isZapInSupported = !!token.supported[zapInWith];
    return { isZapInSupported, zapInWith };
  }

  return { isZapInSupported: false };
}

/**
 * Returns true if the given zap is valid for the given token.
 * @param zap the zap type to check
 * @param zaps the zap types supported by the token
 * @returns true if the zap type is supported by the token
 */
function isValidZap<T>(zap: string | number | symbol, zaps: T): zap is keyof T {
  return zap in zaps;
}
