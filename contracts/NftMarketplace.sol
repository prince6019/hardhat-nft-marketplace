// SPDX-License-Identifier:MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__notListed(address nftAddress, uint256 tokenId);
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__Notowner();
error NftMarketplace__PriceNotMet(
    address nftAddress,
    uint256 tokenId,
    uint256 price
);
error NftMarketplace__NotProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace {
    // type declarations

    struct Listing {
        uint256 price;
        address seller;
    }
    // events

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed Buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 tokenId
    );
    // state variables

    // nft contract address => nft TokenId => listings
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // seller address => amount
    mapping(address => uint256) private s_proceeds;
    // moodifiers

    modifier NotListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier IsListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__notListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftaddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftaddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__Notowner();
        }
        _;
    }

    ///////////////////
    // Main Functions/
    //////////////////

    /**
     * @notice listItem lists you nfts on the marketplace
     * @param nftAddress addrss of the nft
     * @param tokenId token id for nft list on the marketplace
     * @param price price of the nft placed to sell
     */
    function ListItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        NotListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable IsListed(nftAddress, tokenId) {
        Listing memory listeditem = s_listings[nftAddress][tokenId];
        if (msg.value < listeditem.price) {
            revert NftMarketplace__PriceNotMet(
                nftAddress,
                tokenId,
                listeditem.price
            );
        }
        // sending the money to user is wrong
        // rather have them withdraw the money is right
        s_proceeds[listeditem.seller] =
            s_proceeds[listeditem.seller] +
            msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(
            listeditem.seller,
            msg.sender,
            tokenId
        );
        emit ItemBought(msg.sender, nftAddress, tokenId, msg.value);
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
        external
        IsListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        IsListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        //We should check the value of `newPrice` and revert if it's below zero (like we also check in `listItem()`)
        if (newPrice <= 0) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, newPrice);
        }
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NotProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    /////////////////////
    // getter Functions//
    /////////////////////

    function getListings(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }
}
