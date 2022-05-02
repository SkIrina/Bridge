import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Token, Token__factory, Bridge__factory, Bridge } from "../typechain";
import { BigNumber } from "ethers";

describe("My awesome bridge contract", function () {
  let Token: Token__factory;
  let token1: Token;
  let token2: Token;
  let Bridge: Bridge__factory;
  let bridge: Bridge;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let addrs: SignerWithAddress[];

 // const validator = "0xAbF78864415e71466DBBB0Bef55ba98F22e468cA";
  const binanceChainId = 56;
  const hardhatChainId = 31337;
  let validator: string;

  beforeEach(async function () {
    Token = await ethers.getContractFactory("Token");
    token1 = await Token.deploy("First token", "FST");
    token2 = await Token.deploy("Second token", "SCD");

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    validator = owner.address;

    Bridge = await ethers.getContractFactory("Bridge");
    bridge = await Bridge.deploy(validator, binanceChainId, token1.address);
    await bridge.deployed();

    // addr1 gets 100 tokens
    await token1.transfer(addr1.address, 40);
  });

  describe("admin functions", function () {
    it("Should set correct values in constructor", async function () {
      // addr1 gets the item
      expect(await bridge.chainIdDeployed()).to.equal(hardhatChainId);
      expect(await bridge.validator()).to.equal(validator);
      expect(await bridge.owner()).to.equal(owner.address);
    });

    it("Should let owner add a token", async function () {
      // addr1 gets the item

      await bridge.addToken(token2.address);

      expect(await bridge.tokens(token2.address)).to.equal(true);
    });

    it("Should let owner add a chain", async function () {
      // addr1 gets the item

      await bridge.addChain(2);

      expect(await bridge.chainIdOther(2)).to.equal(true);
    });

    it("Should let owner set new validator", async function () {
      // addr1 gets the item

      await bridge.setValidator(addr2.address);

      expect(await bridge.validator()).to.equal(addr2.address);
    });

    it("Should not let non-owner add a token", async function () {
      // addr1 gets the item

      await expect(bridge.connect(addr1).addToken(token2.address))
        .to.be.revertedWith('Not allowed');
    });

    it("Should not let non-owner add a chain", async function () {
      // addr1 gets the item

      await expect(bridge.connect(addr1).addChain(2))
        .to.be.revertedWith('Not allowed');
    });
  });

  describe("swap", function () {
    it("Should burn users tokens", async function () {
      // addr1 gets the item
      token1.connect(addr1).approve(bridge.address, 10);
      const amount = 10;
      const nonce = 123;
      await bridge.connect(addr1).swap(binanceChainId, token1.address, addr2.address, amount, nonce);

      expect(await token1.balanceOf(addr1.address)).to.equal(30);
    });

    it("Should emit Transfer events", async function () {
      const amount = 10;
      const nonce = 123;
      token1.connect(addr1).approve(bridge.address, amount);
      await expect(bridge.connect(addr1).swap(binanceChainId, token1.address, addr2.address, amount, nonce))
        .to.emit(token1, "Transfer")
        .withArgs(addr1.address, ethers.constants.AddressZero, 10)
        .and.to.emit(bridge, "Transfer")
        .withArgs(addr1.address, addr2.address, binanceChainId, token1.address, amount, nonce,
          ethers.constants.Zero, ethers.constants.Zero, ethers.constants.Zero, ethers.constants.Zero);
    });

    it("Should fail for unsupported token", async function () {
      const amount = 10;
      const nonce = 123;
      // addr1 gets 100 tokens
      await token2.transfer(addr1.address, 40);
      token2.connect(addr1).approve(bridge.address, amount);
      await expect(bridge.connect(addr1).swap(binanceChainId, token2.address, addr2.address, amount, nonce))
        .to.be.revertedWith('Unsupported token');
    });

    it("Should fail for unlisted chain", async function () {
      const amount = 10;
      const nonce = 123;
      token1.connect(addr1).approve(bridge.address, amount);
      await expect(bridge.connect(addr1).swap(5, token1.address, addr2.address, amount, nonce))
        .to.be.revertedWith('Unsupported chain');
    });
  });

  describe("redeem", function () {
    it("Should mint tokens for true sender and emit Transfer", async function () {
      const nonce = 123;
      const amount = 10;
      let msg = ethers.utils.solidityKeccak256(
        ["address", "address", "uint256", "address", "uint256", "uint256"],
        [addr1.address, addr2.address, binanceChainId, token1.address, amount, nonce]
      );

      let signature = await owner.signMessage(ethers.utils.arrayify(msg));
      let sig = await ethers.utils.splitSignature(signature);
      token1.approve(bridge.address, 10);

      await expect(
        bridge
          .connect(addr2)
          .redeem(addr1.address, binanceChainId, token1.address, amount, nonce, sig.v, sig.r, sig.s)
      )
        .to.emit(token1, "Transfer")
        .withArgs(owner.address, addr2.address, 10)
        .and.to.emit(bridge, "Transfer")
        .withArgs(addr1.address, addr2.address, binanceChainId, token1.address, amount, nonce,
          sig.v, sig.r, sig.s, ethers.constants.One);
    });

    it("Should not mint tokens for fake sender", async function () {
      const nonce = 123;
      const amount = 10;
      let msg = ethers.utils.solidityKeccak256(
        ["address", "address", "uint256", "address", "uint256", "uint256"],
        [addr1.address, addr2.address, binanceChainId, token1.address, amount, nonce]
      );

      let signature = await addr2.signMessage(ethers.utils.arrayify(msg));
      let sig = await ethers.utils.splitSignature(signature);
      token1.approve(bridge.address, 10);

      await expect(
        bridge
          .connect(addr2)
          .redeem(addr1.address, binanceChainId, token1.address, amount, nonce, sig.v, sig.r, sig.s)
      )
      .to.be.revertedWith("Invalid signer");
    });

    it("Should not mint tokens twice for the same transaction", async function () {
      const nonce = 123;
      const amount = 10;
      let msg = ethers.utils.solidityKeccak256(
        ["address", "address", "uint256", "address", "uint256", "uint256"],
        [addr1.address, addr2.address, binanceChainId, token1.address, amount, nonce]
      );

      let signature = await owner.signMessage(ethers.utils.arrayify(msg));
      let sig = await ethers.utils.splitSignature(signature);
      token1.approve(bridge.address, 10);

      await bridge
          .connect(addr2)
          .redeem(addr1.address, binanceChainId, token1.address, amount, nonce, sig.v, sig.r, sig.s);
      
      await expect(
        bridge
          .connect(addr2)
          .redeem(addr1.address, binanceChainId, token1.address, amount, nonce, sig.v, sig.r, sig.s)
      ).to.be.revertedWith("Transaction already done");
    });
  });
});
