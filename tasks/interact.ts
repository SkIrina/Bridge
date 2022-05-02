import { task } from "hardhat/config";

const contractAddress = "0x01e8CB08DC0e1cc87FCd2532ab04d32f3376fF87";

task("swap", "Send amount tokens to address")
.addParam("chainId", "Receiver chain ID")
.addParam("tokenAddr", "Token address in sender's chain")
.addParam("to", "Receiver address")
.addParam("amount", "Token amount")
.addParam("nonce", "Nonce provided by backend")
.setAction(async function ({ chainId, tokenAddr, to, amount, nonce }, { ethers }) {
    const Bridge = await ethers.getContractAt("Bridge", contractAddress);
    const transactionResponse = await Bridge.swap(chainId, tokenAddr, to, amount, nonce, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

task("redeem", "Claim receiving the tokens")
.addParam("from", "Sender address in the sender's chain")
.addParam("chainId", "Sender chain ID")
.addParam("tokenAddr", "Token address in receiver's chain")
.addParam("amount", "Token amount")
.addParam("nonce", "Nonce provided by backend")
.addParam("v", "Signature v")
.addParam("r", "Signature r")
.addParam("s", "Signature s")
.setAction(async function ({ from, chainId, tokenAddr, amount, nonce, v, r, s }, { ethers }) {
    const Bridge = await ethers.getContractAt("Bridge", contractAddress);
    const transactionResponse = await Bridge.redeem(from, chainId, tokenAddr, amount, nonce, v, r, s, {
        gasLimit: 500_000,
    });
    console.log(`Transaction Hash: ${transactionResponse.hash}`);
});

