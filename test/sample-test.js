const { ethers } = require("hardhat");

describe("NFt Marketplace", () => {
  it("it should create and execute market sales", async () => {
    /* deploy the market contract */
    const NFTMarketplace = await ethers.getContractFactory("Marketplace");
    const nftMarketplace = await NFTMarketplace.deploy();
    /* wait for the contract if it is deployed or not */
    await nftMarketplace.deployed();
    console.log(nftMarketplace.address);

    /* get the listing price */
    let listingPrice = await nftMarketplace.getListingPrice();
    listingPrice = listingPrice.toString();

    /* How much are we selling the item for */
    const auctionPrice = ethers.utils.parseUnits("1", "ether");

    /* create two NFT*/
    await nftMarketplace.createToken(
      "https://www.mytokenlocation.com",
      auctionPrice,
      { value: listingPrice }
    );
    await nftMarketplace.createToken(
      "https://www.mytokenlocation2.com",
      auctionPrice,
      { value: listingPrice }
    );

    /* _ it the first address is the seller address */
    const [_, buyerAddress] = await ethers.getSigners();

    /* execute sale of token to another user buy add the value price to "buy" */
    await nftMarketplace
      .connect(buyerAddress)
      .createMarketSale(1, { value: auctionPrice });

    /* resell token by add the auctionPrice to list token  */
    await nftMarketplace
      .connect(buyerAddress)
      .resellTokens(1, auctionPrice, { value: listingPrice });

    // fetch all the unsold items
    let items = await nftMarketplace.fetchMarketItems();
    console.log("items", items);

    /* query for and return the unsold items */
    items = await Promise.all(
      items.map(async (i) => {
        const tokenURI = await nftMarketplace.tokenURI(i.tokenId);
        let item = {
          tokenId: i.tokenId.toString(),
          price: i.price.toString(),
          seller: i.seller,
          owner: i.owner,
          tokenURI,
        };
        return item;
      })
    );
    console.log("items: ", items);
  });
});
