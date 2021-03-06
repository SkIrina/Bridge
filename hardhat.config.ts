import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "./tasks/interact";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
const { API_URL, PRIVATE_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  networks: {
    hardhat: {},
    rinkeby: {
       url: API_URL,
       accounts: [`${PRIVATE_KEY}`]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
