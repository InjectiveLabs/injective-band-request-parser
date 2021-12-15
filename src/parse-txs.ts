import { fetchTransactions } from "./explorer";
import { bytesFromBase64, uint8ArrayToString } from "./utils";
// @ts-ignore
import { Obi } from "@bandprotocol/obi.js";
import BigNumber from "bignumber.js";
import fs from "fs";

(async () => {
  const BTC_CAP = [60000, 40000];
  const ETH_CAP = [4000, 3500];
  const BNB_CAP = [600, 450];
  const USDT_CAP = [1.5, 0.85];
  const obi = new Obi(`{
    symbols: [string],
    multiplier: u64
  } / {
    rates: [u64]
  }`);

  const limit = 100;
  const skip = 0;
  const step = 100;
  let messages = [] as any;

  for (let i = skip; i < limit + skip; i += step) {
    console.log(`Fetching transactions ${i} - ${i + step}`);
    const txs = await fetchTransactions(i.toString());
    const filteredMessages = txs
      .reduce((messages: any, tx: any) => {
        return [...messages, ...tx.messages];
      }, [] as any)
      .filter(
        (message: any) => message.type === "/ibc.core.channel.v1.MsgRecvPacket"
      );
    messages = [...messages, ...filteredMessages];
  }

  messages = messages
    .map((message: any) => {
      const data = JSON.parse(
        uint8ArrayToString(bytesFromBase64(message.value.packet.data))
      ) as any;
      const result = obi.decodeOutput(Buffer.from(data.result, "base64"));
      const [BTC, ETH, USDT, INJ, BNB] = result.rates;

      return {
        type: message.type,
        data: {
          ...data,
          result: {
            BTC: new BigNumber(BTC.toString()).div(1e9).toFixed(),
            ETH: new BigNumber(ETH.toString()).div(1e9).toFixed(),
            USDT: new BigNumber(USDT.toString()).div(1e9).toFixed(),
            INJ: new BigNumber(INJ.toString()).div(1e9).toFixed(),
            BNB: new BigNumber(BNB.toString()).div(1e9).toFixed(),
          },
        },
      };
    })
    .filter((message: any) => {
      return new BigNumber(message.data.result.ETH).gt(
        1.25
      ); /* Remove UST/LUNA/TERRA requests */
    });

  const filteredMessages = messages.filter((message: any) => {
    const { BTC, ETH, USDT, BNB } = message.data.result;
    const btcPriceToBN = new BigNumber(BTC);
    const ethPriceToBN = new BigNumber(ETH);
    const bnbPriceToBN = new BigNumber(BNB);
    const usdtPriceToBN = new BigNumber(USDT);

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
  });

  fs.writeFileSync("all-messages.json", JSON.stringify(messages, null, 2));
  fs.writeFileSync(
    "bad-messages.json",
    JSON.stringify(filteredMessages, null, 2)
  );
})();
