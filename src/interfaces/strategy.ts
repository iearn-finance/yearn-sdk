import { BigNumber } from "@ethersproject/bignumber";
import { Contract } from "@ethersproject/contracts";
import { BlockTag } from "@ethersproject/providers";
import { BigNumber as BigNumberJs } from "bignumber.js";
import fetch from "cross-fetch";

import { CachedFetcher } from "../cache";
import { ChainId } from "../chain";
import { ServiceInterface } from "../common";
import { Address, StrategiesMetadata, StrategyMetadata } from "../types";
import { HarvestData, VaultStrategiesMetadata } from "../types/strategy";
import { getLocalizedString } from "../utils/localization";

interface VaultData {
  address: Address;
  token: {
    symbol: string;
  };
  strategies: {
    name: string;
    address: Address;
  }[];
}

const VaultAbi = [
  "function strategies(address) view returns (uint256 performanceFee, uint256 activation, uint256 debtRatio, uint256 rateLimit, uint256 lastReport, uint256 totalDebt, uint256 totalGain, uint256 totalLoss)",
  "function token() view returns (address)",
  "event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)",
];

const TokenAbi = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];

const StrategyAbi = [
  "event Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding)",
  "function want() view returns (address)",
  "function estimatedTotalAssets() view returns (uint256)",
];

export class StrategyInterface<T extends ChainId> extends ServiceInterface<T> {
  private cachedFetcher = new CachedFetcher<VaultStrategiesMetadata[]>(
    "strategies/metadata/get",
    this.ctx,
    this.chainId
  );

  /**
   * Get information about the harvests of a strategy, based on `Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding)`
   * events that are emitted when the strategy is harvested
   * @param strategyAddress the address of the strategy
   * @param fromBlock optional block to query harvest events from, if omitted then with no limit
   * @param toBlock optional block to query harvest events to, if omitted then to the most recent block
   * @returns `HarvestData` which includes information such as the gain of the harvest in USDC, the time of the harvest, and the apr since the previous harvest
   */
  async getHarvests({
    strategyAddress,
    fromBlock,
    toBlock,
  }: {
    strategyAddress: Address;
    fromBlock?: BlockTag;
    toBlock?: BlockTag;
  }): Promise<HarvestData[]> {
    const contract = new Contract(strategyAddress, StrategyAbi, this.ctx.provider.read);
    const filter = contract.filters.Harvested();
    const harvestEvents = await contract.queryFilter(filter, fromBlock, toBlock);

    // order the harvest events by newest first
    harvestEvents.reverse();

    // todo - add these calls into a new function in the strategies helper function
    const want: Address = await contract.want();
    const wantContract = new Contract(want, TokenAbi, this.ctx.provider.read);
    const [decimals, usdcPrice] = await Promise.all([
      wantContract.decimals() as Promise<BigNumber>,
      this.yearn.services.oracle.getPriceUsdc(want).then((res) => BigNumber.from(res)),
    ]);

    const harvestPromises = harvestEvents.map(async (event) => {
      const gain: BigNumber = event.args?.profit ?? BigNumber.from(0);
      const loss: BigNumber = event.args?.loss ?? BigNumber.from(0);
      const gainUsdc = gain.mul(usdcPrice).div(BigNumber.from(10).pow(decimals));

      const [timestamp, estimatedTotalAssets] = await Promise.all([
        event.getBlock().then((block) => block.timestamp),
        contract.estimatedTotalAssets({ blockTag: event.blockNumber }),
      ]);

      return {
        transactionId: event.transactionHash,
        gain,
        gainUsdc,
        loss,
        time: new Date(timestamp * 1000),
        estimatedTotalAssets,
        apr: undefined, // will be filled in using the `populateHarvestAprs` function
      };
    });

    const harvests = await Promise.all(harvestPromises);
    return this.populateHarvestAprs(harvests);
  }

  /**
   * Populates the `apr` field of the `HarvestData` object by referencing the time since the previous harvest
   * @param harvests an array of `HarvestData` objects to populate, assumes ordered by newest first
   * @returns the array of `HarvestData` with populated `apr` fields
   */
  private populateHarvestAprs(harvests: HarvestData[]): HarvestData[] {
    // loop through the harvests, and calculate the apr by referencing the time since the previous harvest
    harvests.forEach((harvest, index) => {
      // if the gain is 0 then the apr is 0
      if (harvest.gain === BigNumber.from(0)) {
        harvests[index].apr = 0;
        return;
      } else if (index + 1 === harvests.length) {
        // if this is the oldest harvest leave the apy as undefined since there is no previous harvest to compare it against
        return;
      }

      const previousHarvest = harvests[index + 1];

      // get the difference in days between this harvest and the one prior
      const days = (harvest.time.getTime() - previousHarvest.time.getTime()) / 1000 / 60 / 60 / 24;

      // need to use BigNumber.js since days could be less than 0, which Ether's BigNumber type does not support
      const daysBigJs = new BigNumberJs(days);

      if (previousHarvest.estimatedTotalAssets.toString() === "0") {
        harvests[index].apr = 0;
        return;
      }

      // need to use the assets at the block of the previous harvest, since that's what the current harvest's gains are based on
      const estimatedTotalAssetsBigJs = new BigNumberJs(previousHarvest.estimatedTotalAssets.toString());

      // apr = gain / estimated total assets / days since previous harvest * 365.25
      const gainBigJs = new BigNumberJs(harvest.gain.toString());
      const apr = gainBigJs
        .div(estimatedTotalAssetsBigJs)
        .div(daysBigJs)
        .multipliedBy(new BigNumberJs(365.25))
        .toNumber();

      harvests[index].apr = apr;
    });

    return harvests;
  }

  async vaultsStrategiesMetadata(vaultAddresses?: Address[]): Promise<VaultStrategiesMetadata[]> {
    const cached = await this.cachedFetcher.fetch();
    if (cached) {
      return cached;
    }

    let vaults: Address[];
    if (vaultAddresses) {
      vaults = vaultAddresses;
    } else {
      vaults = await this.yearn.services.lens.adapters.vaults.v2
        .assetsStatic()
        .then((assets) => assets.map((asset) => asset.address));
    }

    let vaultStrategiesMetadata: VaultStrategiesMetadata[] | undefined;

    try {
      vaultStrategiesMetadata = await this.fetchMetadataFromApi(vaults);
    } catch (error) {
      console.error(error);
    }

    if (!vaultStrategiesMetadata) {
      vaultStrategiesMetadata = await this.fetchMetadataFromChain(vaults);
    }

    return vaultStrategiesMetadata;
  }

  private async fetchMetadataFromApi(vaultAddresses: Address[]): Promise<VaultStrategiesMetadata[]> {
    const vaultsData = await this.fetchVaultsData();

    const strategiesMetadata = await this.yearn.services.meta.strategies();

    const vaultsStrategiesMetadataPromises: Promise<VaultStrategiesMetadata | undefined>[] = vaultAddresses.map(
      async (vaultAddress) => {
        const vaultDatum = vaultsData.find((datum) => datum.address === vaultAddress);
        if (!vaultDatum) {
          return undefined;
        }
        const vaultContract = new Contract(vaultDatum.address, VaultAbi, this.ctx.provider.read);
        return this.fetchVaultStrategiesMetadata(
          vaultDatum.strategies,
          strategiesMetadata,
          vaultContract,
          vaultDatum.token.symbol
        );
      }
    );

    return Promise.all(vaultsStrategiesMetadataPromises).then((vaultsStrategyData) => {
      return vaultsStrategyData.flatMap((data) => (data ? [data] : []));
    });
  }

  private async fetchMetadataFromChain(vaultAddresses: Address[]): Promise<VaultStrategiesMetadata[]> {
    const strategiesMetadata = await this.yearn.services.meta.strategies();
    const provider = this.ctx.provider.read;

    const vaultsStrategiesMetadataPromises: Promise<VaultStrategiesMetadata | undefined>[] = vaultAddresses.map(
      async (vaultAddress) => {
        const vaultContract = new Contract(vaultAddress, VaultAbi, provider);

        const strategiesPromise = this.yearn.services.helper.assetStrategiesAddresses(vaultAddress).then((addresses) =>
          addresses.map((strat) => {
            return {
              address: strat,
            };
          })
        );

        const [strategies, underlyingTokenAddress] = await Promise.all([strategiesPromise, vaultContract.token()]);
        const underlyingTokenContract = new Contract(underlyingTokenAddress, TokenAbi, provider);
        const underlyingTokenSymbol = await underlyingTokenContract.symbol();

        return this.fetchVaultStrategiesMetadata(strategies, strategiesMetadata, vaultContract, underlyingTokenSymbol);
      }
    );

    return Promise.all(vaultsStrategiesMetadataPromises).then((vaultsStrategyData) =>
      vaultsStrategyData.flatMap((data) => (data ? [data] : []))
    );
  }

  private async fetchVaultStrategiesMetadata(
    strategies: { address: Address; name?: string }[],
    strategiesMetadata: StrategiesMetadata[],
    vaultContract: Contract,
    underlyingTokenSymbol: string
  ): Promise<VaultStrategiesMetadata | undefined> {
    if (strategies.length === 0) {
      return undefined;
    }

    const metadata: StrategyMetadata[] = await Promise.all(
      strategies.map(async (strategy) => {
        let debtRatio: BigNumber;

        try {
          const struct = await vaultContract.strategies(strategy.address);
          debtRatio = struct.debtRatio as BigNumber;
        } catch (error) {
          return undefined;
        }

        if (debtRatio.lte(BigNumber.from("0"))) {
          return undefined;
        }

        const metadatum = strategiesMetadata.find((strategiesMetadata) =>
          strategiesMetadata.addresses.includes(strategy.address)
        );

        const metadata: StrategyMetadata = {
          address: strategy.address,
          name: metadatum?.name || strategy.name || "Strategy",
          description: getLocalizedString({
            obj: metadatum,
            property: "description",
            locale: this.ctx.locale,
            fallback: "Vault strategy missing",
          }),
          protocols: metadatum?.protocols ?? [],
        };

        metadata.description = metadata?.description.replace(/{{token}}/g, underlyingTokenSymbol);

        return { data: metadata, debtRatio };
      })
    ).then((metadataAndDebtRatio) =>
      metadataAndDebtRatio
        .flatMap((data) => (data ? [data] : []))
        .sort((lhs, rhs) => {
          if (lhs.debtRatio.lt(rhs.debtRatio)) {
            return 1;
          } else if (lhs.debtRatio.eq(rhs.debtRatio)) {
            return 0;
          } else {
            return -1;
          }
        })
        .map((metadata) => metadata.data)
    );

    if (metadata.length === 0) {
      return undefined;
    }

    const result: VaultStrategiesMetadata = {
      vaultAddress: vaultContract.address,
      strategiesMetadata: metadata,
    };

    return result;
  }

  private async fetchVaultsData(): Promise<VaultData[]> {
    const res = await fetch(`https://api.yearn.finance/v1/chains/${this.chainId}/vaults/all`);

    if (!res.ok) {
      throw new Error(`An error has occured fetching vaults data: ${res.status}`);
    }

    return await res.json();
  }
}
