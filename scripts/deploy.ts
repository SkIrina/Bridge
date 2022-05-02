import { ethers } from "hardhat";

async function main() {
  const validator = "0xAbF78864415e71466DBBB0Bef55ba98F22e468cA";
  const binanceChainId = 56;
  const tokenAddr = "0x6A347312D30Ba7B542e492AAC73663498901C5fb";

  const Bridge = await ethers.getContractFactory("Bridge");
  const bridge = await Bridge.deploy(validator, binanceChainId, tokenAddr);

  await bridge.deployed();

  console.log("bridge deployed to:", bridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
