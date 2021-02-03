import {
  StrategyContract__factory,
  VaultV2Contract__factory
} from "../../contracts";
import { Context } from "../../data/context";
import { NullAddress } from "../../utils/constants";
import { objectAll } from "../../utils/promise";
import { Strategy, VaultV2 } from "../interfaces";
import { resolveBasic } from "./common";

async function resolveStrategy(address: string, ctx: Context): Promise<Strategy> {
  const strategy = StrategyContract__factory.connect(address, ctx.provider);
  const structure = {
    name: strategy.name()
  };
  const result = await objectAll(structure);
  return {
    ...result,
    address
  };
}

export async function resolveV2(address: string, ctx: Context): Promise<VaultV2> {
  const basic = await resolveBasic(address, ctx);
  const vault = VaultV2Contract__factory.connect(address, ctx.provider);
  const structure = {
    emergencyShutdown: vault.emergencyShutdown()
  };
  const specific = await objectAll(structure);

  const strategyAddresses = [];

  let strategyAddress,
    i = 0;
  do {
    strategyAddress = await vault.withdrawalQueue(i++);
    strategyAddresses.push(strategyAddress);
  } while (strategyAddress !== NullAddress);

  strategyAddresses.pop(); // Remove NullAddresses

  const strategies = await Promise.all(
    strategyAddresses.map(address => resolveStrategy(address, ctx))
  );

  return { ...basic, ...specific, strategies, type: "v2" };
}
