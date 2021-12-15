import { apolloConsumer } from "./gql";
import { BigNumber } from "bignumber.js";
import fs from "fs";
// @ts-ignore
import { Obi } from "@bandprotocol/obi.js";

(async () => {
  const oracleRequests = await apolloConsumer.fetchOracleRequestsByPk();
  const BTC_CAP = [60000, 40000];
  const ETH_CAP = [4000, 3500];
  const BNB_CAP = [600, 450];
  const USDT_CAP = [1.5, 0.5];

  const obi = new Obi(`{
    symbols: [string],
    multiplier: u64
  } / {
    rates: [u64]
  }`);

  const parsedRequests = oracleRequests.requests.map((request: any) => {
    const resultHex = request.result.slice(2);
    const calldataHex = request.calldata.slice(2);
    const calldata = obi.decodeInput(Buffer.from(calldataHex, "hex"));
    const result = obi.decodeOutput(Buffer.from(resultHex, "hex"));

    return {
      ...request,
      result: {
        rates: result.rates.map((rate: any) => {
          const number = new BigNumber(rate.toString());

          return number.div(1e9).toString();
        }),
        ratesWithSymbols: result.rates.map((rate: any, index: number) => {
          const number = new BigNumber(rate.toString());
          const symbol = calldata.symbols[index];

          return `${symbol}: ${number.div(1e9).toFixed()}`;
        }),
      },
      calldata: {
        ...calldata,
        multiplier: calldata.multiplier.toString(),
      },
    };
  });

  const filteredRequestsForLivePerpetuals = parsedRequests.filter(
    (request: any) => {
      return request.calldata.symbols.includes("BTC");
    }
  );
  const filteredRequestsThatDeviate = filteredRequestsForLivePerpetuals.filter(
    (request: any) => {
      const [btcPrice, ethPrice, usdtPrice, , bnbPrice] = request.result.rates;
      const btcPriceToBN = new BigNumber(btcPrice);
      const ethPriceToBN = new BigNumber(ethPrice);
      const bnbPriceToBN = new BigNumber(bnbPrice);
      const usdtPriceToBN = new BigNumber(usdtPrice);

      if (btcPriceToBN.gt(BTC_CAP[0]) || btcPriceToBN.lt(BTC_CAP[1])) {
        return true;
      }

      if (ethPriceToBN.gt(ETH_CAP[0]) || ethPriceToBN.lt(ETH_CAP[1])) {
        return true;
      }

      if (bnbPriceToBN.gt(BNB_CAP[0]) || bnbPriceToBN.lt(BNB_CAP[1])) {
        return true;
      }

      if (usdtPriceToBN.gt(USDT_CAP[0]) || usdtPriceToBN.lt(USDT_CAP[1])) {
        return true;
      }

      return false;
    }
  );
  const shortFilteredRequestsThatDeviate = filteredRequestsThatDeviate.map(
    (request: any) => {
      return {
        id: request.id,
        result: request.result.ratesWithSymbols,
      };
    }
  );

  fs.writeFileSync(
    "all-requests.json",
    JSON.stringify(
      {
        ...oracleRequests,
        requests: filteredRequestsForLivePerpetuals,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    "bad-requests.json",
    JSON.stringify(
      {
        ...oracleRequests,
        requests: filteredRequestsThatDeviate,
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    "bad-requests-summary.json",
    JSON.stringify(
      {
        ...oracleRequests,
        requests: shortFilteredRequestsThatDeviate,
      },
      null,
      2
    )
  );
})();
