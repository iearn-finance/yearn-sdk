import "dotenv/config";

import { WebSocketProvider } from "@ethersproject/providers";

import { Context } from "../../../src/data/context";
import { calculateTvlV2 } from "../../../src/protocols/yearn/vault";
import { vaults } from "./testdata";

describe("tvl", () => {
  let provider: WebSocketProvider;
  let ctx: Context;

  beforeAll(() => {
    provider = new WebSocketProvider(process.env.WEB3_PROVIDER_WSS ?? "");
    ctx = new Context({ provider, etherscan: process.env.ETHERSCAN_KEY });
  });

  it("should calculate tvl for a v2 vault (network)", () => {
    const tvl = calculateTvlV2(vaults.v2.object, ctx);
    return expect(tvl).resolves.toStrictEqual(expect.any(Number));
  });

  afterAll(() => {
    return provider.destroy();
  }, 1e4);
});
