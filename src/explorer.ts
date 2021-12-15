import { HttpClient } from "@injectivelabs/utils";

export const fetchTransactions = async (skip: string = "0") => {
  const client = new HttpClient(
    "https://api.injective.network/api/explorer/v1"
  );
  const endpoint = () =>
    `txs?type=ibc.core.channel.v1.MsgRecvPacket&limit=100&skip=${skip}`;

  try {
    const response = (await client.get(endpoint())) as any;

    return response?.data?.data;
  } catch (e: any) {
    console.log(e.response.data ? e.response.data : e.response.statusText);
    process.exit();
  }
};
