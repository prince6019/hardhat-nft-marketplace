const { expect, assert } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name) ?
    descibe.skip :
    describe("NftMarketPlace", () => {
        let nftMarketPlace, deployer, basicNft, player;
        const TOKEN_ID = 0;
        const PRICE = ethers.utils.parseEther("0.01");

        beforeEach(async () => {

            // player = (await getNamedAccounts()).player;
            const accounts = await ethers.getSigners();
            deployer = accounts[0];
            player = accounts[1];
            await deployments.fixture(["all"]);
            nftMarketPlace = await ethers.getContract("NftMarketplace");
            // nftMarketPlace = nftMarketPlaceContract.connect(deployer);
            basicNft = await ethers.getContract("BasicNft");
            // basicNft = basicNftContract.connect(deployer);

            await basicNft.mintNft();
            await basicNft.approve(nftMarketPlace.address, TOKEN_ID);
        })

        describe("listItems", () => {
            it("list items that haven't been listed", async () => {
                nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                await expect(nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NftMarketplace__AlreadyListed");
            })
            // it("reverts if seller is not the owner of nft", async () => {
            //     nftMarketPlace = nftMarketPlace.connect(player);
            //     await basicNft.approve(player, TOKEN_ID);
            //     await expect(nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE)).to.be.revertedWith("NftMarketplace__Notowner");
            // })
            it("needs approvals to list item", async function () {
                await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                await expect(
                    nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE)
                ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
            })
            it("reverts if price is smaller than 0", async () => {
                await expect(nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero");
            })
            it("emits an event ItemListed", async () => {
                await expect(nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                    nftMarketPlace,
                    "ItemListed"
                );
            })
            it("does mapping of nftaddress to tokenID to listings", async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                const listing = await nftMarketPlace.getListings(basicNft.address, TOKEN_ID);
                assert.equal(listing.seller, deployer.address);
            })
        })
        describe("BuyItems", () => {
            beforeEach(async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
            })
            it("reverts if there is no listedItem", async () => {
                await expect(nftMarketPlace.buyItem(basicNft.address, 1)).to.be.revertedWith("NftMarketplace__notListed");
            })
            it("reverts if price not met", async () => {

                await expect(nftMarketPlace.buyItem(basicNft.address, TOKEN_ID)).to.be.revertedWith("NftMarketplace__PriceNotMet");
            })
            it("insert seller to the proceeds mapping and delete from listing mapping", async () => {
                const playerConnectedNftmarketplace = nftMarketPlace.connect(player);
                await playerConnectedNftmarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });
                const deployerProcceds = await nftMarketPlace.getProceeds(deployer.address);
                const newOwner = await basicNft.ownerOf(TOKEN_ID);
                assert.equal(newOwner.toString(), player.address);
                assert.equal(deployerProcceds.toString(), PRICE.toString());
            })
            it("emits the event itemBought", async () => {
                await expect(nftMarketPlace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })).to.emit(nftMarketPlace, "ItemBought");
            })
        })
        describe("cancelItems", () => {
            it("deletes the listed nft and emits event temcanceled", async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                await expect(nftMarketPlace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(nftMarketPlace, "ItemCanceled");
                const listing = await nftMarketPlace.getListings(basicNft.address, TOKEN_ID);
                assert(listing.price.toString() == 0);

            })
        })
        describe("updateItems", () => {
            it("reverts if new price is equal or less than zero", async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                await expect(nftMarketPlace.updateListing(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith("NftMarketplace__PriceNotMet");
            })
            it("updates the mapping and emit the event", async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                const newPrice = ethers.utils.parseEther("0.1");
                await expect(nftMarketPlace.updateListing(basicNft.address, TOKEN_ID, newPrice)).to.emit(nftMarketPlace, "ItemListed");
                const listing = await nftMarketPlace.getListings(basicNft.address, TOKEN_ID);
                assert.equal(listing.price.toString(), newPrice.toString());

            })
        })
        describe("withdrawProceeds", () => {
            it("doesn't allow 0 proceed withdrawls", async function () {
                await expect(nftMarketPlace.withdrawProceeds()).to.be.revertedWith("NftMarketplace__NotProceeds")
            })
            it("withdraw proceeds", async () => {
                await nftMarketPlace.ListItem(basicNft.address, TOKEN_ID, PRICE);
                const playerConnectedNftmarketplace = nftMarketPlace.connect(player);
                await playerConnectedNftmarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE });

                const deployerProceedsBefore = await nftMarketPlace.getProceeds(deployer.address);
                // const playerbalance = await player.getBalance();
                const deployerBalanceBefore = await deployer.getBalance();
                const txResponse = await nftMarketPlace.withdrawProceeds();
                const transactionReceipt = await txResponse.wait(1);
                const { gasUsed, effectiveGasPrice } = transactionReceipt;
                const gasCost = gasUsed.mul(effectiveGasPrice);
                const deployerBalanceAfter = await deployer.getBalance();

                assert(
                    deployerBalanceAfter.add(gasCost).toString() ==
                    deployerProceedsBefore.add(deployerBalanceBefore).toString()
                )
            })
        })
    })