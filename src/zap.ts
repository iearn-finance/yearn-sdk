import { ChainId, isEthereum, isFantom } from "./chain";
import { Token, VaultMetadataOverrides } from "./types";

type ZapInOptions = { isZapInSupported: boolean; zapInWith?: keyof Token["supported"] };

type ZapInProps = {
  chainId: ChainId;
  token?: Partial<Token>;
  vaultMetadata: VaultMetadataOverrides | null;
};

export function getZapInOptions({ chainId, token, vaultMetadata }: ZapInProps): ZapInOptions {
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
 * @param zappings the zapping types supported by the token
 * @returns true if the zap type is supported by the token
 */
function isValidZap<T>(zap: string | number | symbol, zappings: T): zap is keyof T {
  return zap in zappings;
}
