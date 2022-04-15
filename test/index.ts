import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Token, Bridge__factory, Bridge } from "../typechain";
import { BigNumber } from "ethers";

describe("My awesome bridge contract", function () {
  let token: Token;
  let Bridge: Bridge__factory;
  let bridge: Bridge;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  let addrs: SignerWithAddress[];

  beforeEach(async function () {
 
    Bridge = await ethers.getContractFactory("Bridge");
    bridge = await Bridge.deploy();
    await bridge.deployed();

    const tokenAddr = await bridge.token();
    token = await ethers.getContractAt("Token", tokenAddr);

    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // addr1 gets 100 teokens
    await token.transfer(addr1.address, 40);
  });

  describe("swap", function () {
    it("Should burn users tokens", async function () {
      // addr1 gets the item
      token.connect(addr1).approve(bridge.address, 10);
      await bridge.connect(addr1).swap(addr2.address, 10, 123);

      expect(await token.balanceOf(addr1.address)).to.equal(30);
    });

    it("Should emit swapInitialised event", async function () {
      token.connect(addr1).approve(bridge.address, 10);
      await expect(bridge.connect(addr1).swap(addr2.address, 10, 123))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, ethers.constants.AddressZero, 10)
        .and
        .to.emit(bridge, "SwapInitialized")
        .withArgs(addr1.address, addr2.address, 10, 123);
    });
  });

  describe("redeem", function () {
    it("Should mint tokens for true sender", async function () {
      const nonce = 123;
      const value = 10;
      let msg = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [addr1.address, value, nonce]
      );
    
      let signature = await owner.signMessage(ethers.utils.arrayify(msg));
      let sig = await ethers.utils.splitSignature(signature);
      token.approve(bridge.address, 10);

      await expect(bridge.connect(addr1).redeem(addr1.address, value, nonce, sig.v, sig.r, sig.s))
      .to.emit(token, "Transfer")
      .withArgs(owner.address, addr1.address, 10);
    });

    it("Should not mint tokens for fake sender", async function () {
      const nonce = 123;
      const value = 10;
      let msg = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [addr1.address, value, nonce]
      );
    
      let signature = await addr2.signMessage(ethers.utils.arrayify(msg));

      let sig = await ethers.utils.splitSignature(signature);

      token.approve(bridge.address, 10);
      await expect(bridge.connect(addr1).redeem(addr1.address, value, nonce, sig.v, sig.r, sig.s))
      .to.be.revertedWith('Invalid signer');
    });
    it("Should not mint tokens twice for the same transaction", async function () {
      const nonce = 123;
      const value = 10;
      const msg = ethers.utils.solidityKeccak256(
        ["address", "uint256", "uint256"],
        [addr1.address, value, nonce]
      );
    
      const signature = await owner.signMessage(ethers.utils.arrayify(msg));

      const sig = await ethers.utils.splitSignature(signature);

      token.approve(bridge.address, 20);
      await bridge.connect(addr1).redeem(addr1.address, value, nonce, sig.v, sig.r, sig.s);

      await expect(bridge.connect(addr1).redeem(addr1.address, value, nonce, sig.v, sig.r, sig.s))
      .to.be.revertedWith('Transaction already done');
    });
  });
});