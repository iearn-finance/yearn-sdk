import BigNumber from "bignumber.js";

import { ChainId } from "../chain";
import { ServiceInterface } from "../common";
import { PROTOCOL_FEES } from "../services/subgraph/queries";
import { FeesResponse } from "../services/subgraph/responses";
import { Usdc } from "../types";

const BigZero = new BigNumber(0);

export class FeesInterface<C extends ChainId> extends ServiceInterface<C> {
  async protocolFees(since: Date): Promise<Usdc> {
    const response = await this.yearn.services.subgraph.fetchQuery<FeesResponse>(PROTOCOL_FEES, {
      sinceDate: since.getTime().toString(),
    });

    let result = BigZero;

    if (!response?.data || !response.data?.transfers) {
      return result.toFixed(0);
    }

    const transfers = response.data.transfers;

    return transfers
      .reduce((prev, current) => {
        return prev.plus(new BigNumber(current.tokenAmountUsdc || 0));
      }, result)
      .toFixed(0);
  }
}
