import { getAddress } from "@ethersproject/address";

import { Service } from "../common";
import { Address, Balance, BalancesMap, Token } from "../types";
import { EthAddress, handleHttpError, ZeroAddress, usdc } from "../helpers";

/**
 * [[ZapperService]] interacts with the zapper api to gather more insight for
 * tokens and user positions.
 */
export class ZapperService extends Service {
  async supportedTokens(): Promise<Token[]> {
    const url = "https://api.zapper.fi/v1/prices";
    const params = new URLSearchParams({ api_key: this.ctx.zapper });
    const tokens = await fetch(`${url}?${params}`)
      .then(handleHttpError)
      .then(res => res.json());
    return tokens.map(
      (token: Record<string, string>): Token => ({
        address: token.address,
        name: token.symbol,
        symbol: token.symbol,
        icon: `https://zapper.fi/icons/${token.symbol}-icon.png`,
        decimals: token.decimals,
        priceUsdc: usdc(token.price),
        supported: { zapper: true }
      })
    );
  }

  async balances<T extends Address>(address: T): Promise<Balance[]>;
  async balances<T extends Address>(addresses: T[]): Promise<BalancesMap<T>>;
  async balances<T extends Address>(addresses: T[] | T): Promise<BalancesMap<T> | Balance[]>;

  async balances<T extends Address>(addresses: T[] | T): Promise<BalancesMap<T> | Balance[]> {
    const url = "https://api.zapper.fi/v1/protocols/tokens/balances";
    const params = new URLSearchParams({
      "addresses[]": Array.isArray(addresses) ? addresses.join() : addresses,
      api_key: this.ctx.zapper
    });
    const balances = await fetch(`${url}?${params}`)
      .then(handleHttpError)
      .then(res => res.json());
    Object.keys(balances).forEach(address => {
      const copy = balances[address]["products"][0]["assets"];
      delete balances[address];
      balances[getAddress(address)] = copy.map(
        (balance: Record<string, string>): Balance => {
          const address = balance.address === ZeroAddress ? EthAddress : getAddress(String(balance.address));
          return {
            address,
            token: {
              address,
              name: balance.symbol,
              symbol: balance.symbol,
              decimals: balance.decimals
            },
            balance: balance.balanceRaw,
            balanceUsdc: usdc(balance.balanceUSD),
            priceUsdc: usdc(balance.price)
          };
        }
      );
    });
    if (!Array.isArray(addresses)) return balances[addresses];
    return balances;
  }
}
