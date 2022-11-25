import { NextApiRequest, NextApiResponse } from "next";

import { Bundler } from "@/lib/bundler";

import networkConfigJson from "../../../../../../contracts/network.json";
import { isChainId } from "../../../../../../contracts/types/network";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { chainId } = req.query;
  if (typeof chainId !== "string" || !isChainId(chainId)) {
    throw new Error("chain id is invalid");
  }
  const { method, params, jsonrpc, id } = req.body;
  const bundler = new Bundler(networkConfigJson[chainId].rpc);
  try {
    const result = await bundler.handle(method, params);
    console.log("result", result);
    res.send({
      jsonrpc,
      id,
      result,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const error = {
      message: err.message,
      data: err.data,
      code: err.code,
    };
    res.send({
      jsonrpc,
      id,
      error,
    });
  }
};

export default handler;
