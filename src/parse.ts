import { apolloConsumer } from "./gql";
import { BigNumber } from "bignumber.js";
import fs from "fs";
// @ts-ignore
import { Obi } from "@bandprotocol/obi.js";

(async () => {
  const oracleRequests = await apolloConsumer.fetchOracleRequests();
  const BTC_CAP = [60000, 40000];
  const ETH_CAP = [4000, 3500];
  const BNB_CAP = [600, 450];

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
      const [btcPrice, ethPrice, , , bnbPrice] = request.result.rates;
      const btcPriceToBN = new BigNumber(btcPrice);
      const ethPriceToBN = new BigNumber(ethPrice);
      const bnbPriceToBN = new BigNumber(bnbPrice);

      if (btcPriceToBN.gt(BTC_CAP[0]) || btcPriceToBN.lt(BTC_CAP[1])) {
        return true;
      }

      if (ethPriceToBN.gt(ETH_CAP[0]) || ethPriceToBN.lt(ETH_CAP[1])) {
        return true;
      }

      if (bnbPriceToBN.gt(BNB_CAP[0]) || bnbPriceToBN.lt(BNB_CAP[1])) {
        return true;
      }

      return false;
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
})();
