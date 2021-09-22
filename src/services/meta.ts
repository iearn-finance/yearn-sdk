import { Service } from "../common";
import { Address, ChainMetadata, StrategiesMetadata, TokenMetadata, VaultMetadataOverrides } from "../types";

const MetaURL = "https://meta.yearn.network";

interface IPFSIndex {
  files: string[];
  directories: string[];
}

const CHAIN_ID_KEY = "{chain_id}";

/**
 * [[MetaService]] fetches meta data about things such as vaults and tokens
 * from yearn-meta
 */
export class MetaService extends Service {
  async token(address: Address): Promise<TokenMetadata | undefined> {
    const metadata = await this.fetchMetadataItem<any>(this.buildUrl(`tokens/${CHAIN_ID_KEY}/${address}`));
    const result: TokenMetadata = {
      address: address,
      categories: metadata.categories,
      description: metadata.description,
      website: metadata.website
    };
    return result;
  }

  async strategies(): Promise<StrategiesMetadata[]> {
    const filesRes = await fetch(this.buildUrl(`strategies/index`)).then(res => res.json());
    const files: string[] = filesRes.files.filter((file: string) => !file.startsWith("0x"));
    return Promise.all(files.map(async file => fetch(`${MetaURL}/strategies/${file}`).then(res => res.json())));
  }

  async vaults(): Promise<VaultMetadataOverrides[]> {
    const index: IPFSIndex = await fetch(this.buildUrl(`vaults/${CHAIN_ID_KEY}/index`)).then(res => res.json());

    const promises = index.files.map(async file => {
      const metadata = await fetch(this.buildUrl(`vaults/${CHAIN_ID_KEY}/${file}`)).then(res => res.json());
      const vaultMetadata: VaultMetadataOverrides = {
        address: file,
        comment: metadata.comment,
        hideAlways: metadata.hideAlways,
        depositsDisabled: metadata.depositsDisabled,
        withdrawalsDisabled: metadata.withdrawalsDisabled,
        apyOverride: metadata.apyOverride,
        order: metadata.order,
        migrationAvailable: metadata.migrationAvailable,
        allowZapIn: metadata.allowZapIn,
        allowZapOut: metadata.allowZapOut,
        latestVaultAddress: metadata.latestVaultAddress
      };
      return vaultMetadata;
    });

    return Promise.all(promises);
  }

  async chain(): Promise<ChainMetadata> {
    console.log(this.buildUrl(`chain-settings/${CHAIN_ID_KEY}`));
    const chainSettings: any = await fetch(this.buildUrl(`chain-settings/${CHAIN_ID_KEY}`)).then(res => res.json());
    console.log(chainSettings);
    const metadata: ChainMetadata = {
      zapsEnabled: chainSettings.zaps_enabled,
      simulationsEnabled: chainSettings.simulations_enabled
    };
    return metadata;
  }

  private async fetchMetadataItem<T>(url: string): Promise<T | undefined> {
    try {
      return await fetch(url).then(res => res.json());
    } catch (error) {
      return undefined;
    }
  }

  private buildUrl(path: string): string {
    return `${MetaURL}/${path}`.replace(CHAIN_ID_KEY, this.chainId.toString());
  }
}
