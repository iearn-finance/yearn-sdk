import { ChainId } from "./chain";
import { Context, ContextValue } from "./context";
import { EarningsInterface } from "./interfaces/earnings";
import { FeesInterface } from "./interfaces/fees";
import { IronBankInterface } from "./interfaces/ironbank";
import { SimulationInterface } from "./interfaces/simulation";
import { StrategyInterface } from "./interfaces/strategy";
import { TokenInterface } from "./interfaces/token";
import { VaultInterface } from "./interfaces/vault";
import { AssetService } from "./services/assets";
import { HelperService } from "./services/helper";
import { LensService } from "./services/lens";
import { MetaService } from "./services/meta";
import { OracleService } from "./services/oracle";
import { PickleService } from "./services/partners/pickle";
import { SubgraphService } from "./services/subgraph";
import { TelegramService } from "./services/telegram";
import { VisionService } from "./services/vision";
import { ZapperService } from "./services/zapper";

/**
 * [[Yearn]] is a wrapper for all the services and interfaces of the SDK.
 *
 * Yearn namespace can be instantiated as a class, providing configuration
 * options that will then be used by all the services and interfaces:
 *
 * ```typescript
 * import { Yearn } from "@yfi/sdk";
 *
 * const provider = new JsonRpcProvider("http://localhost:8545");
 * const yearn = new Yearn(1, { provider });
 * ```
 */
export class Yearn<T extends ChainId> {
  services: {
    lens: LensService<T>;
    oracle: OracleService<T>;
    zapper: ZapperService;
    asset: AssetService;
    vision: VisionService;
    subgraph: SubgraphService;
    telegram: TelegramService;
    meta: MetaService;

    pickle: PickleService;

    helper: HelperService<T>;
  };

  vaults: VaultInterface<T>;
  tokens: TokenInterface<T>;
  earnings: EarningsInterface<T>;
  fees: FeesInterface<T>;
  ironBank: IronBankInterface<T>;
  simulation: SimulationInterface<T>;
  strategies: StrategyInterface<T>;

  context: Context;

  /**
   * This promise can be **optionally** awaited to assure that all services
   * have been correctly loaded.
   *
   * ```typescript
   * const yearn = new Yearn(1, { provider });
   * await yearn.ready;
   * ```
   */
  ready: Promise<void[]>;

  /**
   * Create a new SDK instance.
   * @param chainId
   * @param context plain object containing all the optional configuration
   */
  constructor(chainId: T, context: ContextValue) {
    this.context = new Context(context);

    this.services = {
      lens: new LensService(chainId, this.context),
      oracle: new OracleService(chainId, this.context),
      zapper: new ZapperService(chainId, this.context),
      asset: new AssetService(chainId, this.context),
      vision: new VisionService(chainId, this.context),
      subgraph: new SubgraphService(chainId, this.context),
      pickle: new PickleService(chainId, this.context),
      helper: new HelperService(chainId, this.context),
      telegram: new TelegramService(chainId, this.context),
      meta: new MetaService(chainId, this.context)
    };

    this.vaults = new VaultInterface(this, chainId, this.context);
    this.tokens = new TokenInterface(this, chainId, this.context);
    this.earnings = new EarningsInterface(this, chainId, this.context);
    this.fees = new FeesInterface(this, chainId, this.context);
    this.ironBank = new IronBankInterface(this, chainId, this.context);
    this.simulation = new SimulationInterface(this, chainId, this.context);
    this.strategies = new StrategyInterface(this, chainId, this.context);

    this.ready = Promise.all([this.services.asset.ready]);
  }
}
