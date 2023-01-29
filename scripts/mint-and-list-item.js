const { ethers } = require("hardhat");

const PRICE = ethers.utils.parseEther("0.01");

async function mintAndList() {
    const basicNft = await ethers.getContract("BasicNft");
    const nftMarketPlace = await ethers.getContract("NftMarketplace");

    console.log("MInting Nfts-----");
    const mintTx = await basicNft.mintNft();
    const minTxReceipt = await mintTx.wait(1);
    // console.log(minTxReceipt.events[1].args.tokenId);
    const tokenId = minTxReceipt.events[0].args.tokenId;
    console.log("Approving NFT...");
    const approvalTx = await basicNft.approve(nftMarketPlace.address, tokenId);
    await approvalTx.wait(1);
    console.log("Listing NFT...");
    const tx = await nftMarketPlace.ListItem(basicNft.address, tokenId, PRICE);
    await tx.wait(1);
    console.log("NFT Listed!");
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })