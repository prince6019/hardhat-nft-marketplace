const fs = require("fs");
const { network, ethers } = require("hardhat");

const frontEndAbiFile = "../nft-marketplace/constants/abi.json";
const frontEndContractsFile =
  "../nft-marketplace/constants/ContractAddress.json";
module.exports = async () => {
  if (process.env.UPDATE_FRONTEND) {
    console.log("writing to frontend");
    await updateContractAddress();
    await updateAbi();
    console.log("frontend written");
  }
};

async function updateAbi() {
  const nftmarketplace = await ethers.getContract("NftMarketplace");
  fs.writeFileSync(
    frontEndAbiFile,
    nftmarketplace.interface.format(ethers.utils.FormatTypes.json)
  );
}

async function updateContractAddress() {
  const chainId = network.config.chainId.toString();
  const nftmarketplace = await ethers.getContract("NftMarketplace");
  const contractAddresses = JSON.parse(
    fs.readFileSync(frontEndContractsFile, "utf8")
  );
  if (network.chainId in contractAddresses) {
    if (!contractAddresses[chainId].includes(nftmarketplace.address)) {
      contractAddresses[chainId].push(nftmarketplace.address);
    }
  } else {
    contractAddresses[chainId] = [nftmarketplace.address];
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses));
}
module.exports.tags = ["all", "frontend"];
