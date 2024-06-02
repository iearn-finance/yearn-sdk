import { BigNumber } from "@ethersproject/bignumber";

import { ChainId } from "../chain";
import { Context } from "../context";
import { Yearn } from "../yearn";
import { StrategyInterface } from "./strategy";

const queryFilterMock = jest.fn();
const getPriceUsdcMock = jest.fn();
const decimalsMock = jest.fn();
const estimatedTotalAssetsMock = jest.fn();

jest.mock("@ethersproject/contracts", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    filters: {
      Harvested: jest.fn(),
    },
    queryFilter: queryFilterMock,
    want: jest.fn(),
    decimals: decimalsMock,
    estimatedTotalAssets: estimatedTotalAssetsMock,
  })),
}));

jest.mock("../context", () => ({
  Context: jest.fn().mockImplementation(() => ({
    provider: {
      read: {},
    },
  })),
}));

jest.mock("../yearn", () => ({
  Yearn: jest.fn().mockImplementation(() => ({
    services: {
      oracle: {
        getPriceUsdc: getPriceUsdcMock,
      },
    },
  })),
}));

describe("StrategyInterface", () => {
  let mockedYearn: Yearn<ChainId>;
  let strategyInterface: StrategyInterface<1>;

  beforeEach(() => {
    mockedYearn = new (Yearn as jest.Mock<Yearn<ChainId>>)();
    strategyInterface = new StrategyInterface(mockedYearn, 1, new Context({}));
    estimatedTotalAssetsMock.mockReturnValue(BigNumber.from(0));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("get harvests", () => {
    beforeEach(() => {
      decimalsMock.mockReturnValue(BigNumber.from(18));
      getPriceUsdcMock.mockReturnValue(Promise.resolve("1"));
    });

    it("cacluates gain in usdc correctly", async () => {
      const gains = 42;
      const price = 2;
      const harvestEvent = {
        args: {
          profit: BigNumber.from(gains).mul(BigNumber.from(10).pow(18)),
        },
        getBlock: () => {
          return Promise.resolve({ timestamp: 123 });
        },
      };

      getPriceUsdcMock.mockReturnValue(Promise.resolve(`${price}000000`));
      queryFilterMock.mockReturnValue([harvestEvent]);

      const result = await strategyInterface.getHarvests({ strategyAddress: "" });
      expect(result[0].gainUsdc.toString()).toEqual(`${gains * price}000000`);
    });
  });

  it("orders harvests by newest first", async () => {
    const olderHarvestTimestamp = 1653480070;
    const newerHarvestTimestamp = olderHarvestTimestamp + 7 * 24 * 60 * 60;
    const harvestEvents = [
      {
        getBlock: () => {
          return Promise.resolve({ timestamp: olderHarvestTimestamp });
        },
      },
      {
        getBlock: () => {
          return Promise.resolve({ timestamp: newerHarvestTimestamp });
        },
      },
    ];

    queryFilterMock.mockReturnValue(harvestEvents);

    const result = await strategyInterface.getHarvests({ strategyAddress: "" });
    expect(result[0].time.getTime()).toBeGreaterThan(result[1].time.getTime());
  });

  it("fills in apr", async () => {
    const olderHarvestTimestamp = 1653480070;
    const newerHarvestTimestamp = olderHarvestTimestamp + 7 * 24 * 60 * 60;
    estimatedTotalAssetsMock.mockReturnValue(BigNumber.from(1).mul(BigNumber.from(10).pow(18)));
    const harvestEvents = [
      {
        args: {
          profit: BigNumber.from(0),
        },
        getBlock: () => {
          return Promise.resolve({ timestamp: olderHarvestTimestamp });
        },
      },
      {
        args: {
          profit: BigNumber.from(5).mul(BigNumber.from(10).pow(18)),
        },
        getBlock: () => {
          return Promise.resolve({ timestamp: newerHarvestTimestamp });
        },
      },
    ];

    getPriceUsdcMock.mockReturnValue(Promise.resolve(`1000000`)); // 1 usdc
    queryFilterMock.mockReturnValue(harvestEvents);

    const result = await strategyInterface.getHarvests({ strategyAddress: "" });
    expect(result[0].apr).toEqual(260.89285714285717);
    expect(result[1].apr).toBeUndefined();
  });
});
