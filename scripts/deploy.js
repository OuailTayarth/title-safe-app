const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const PropertyRecorderContract =
    await hre.ethers.getContractFactory("PropertyRecorder");
  const PropertyRecorder = await PropertyRecorderContract.deploy();
  PropertyRecorder.deployed();
  console.log("propertyContractAddress", `${PropertyRecorder.address}`);

  fs.writeFileSync(
    "./config.js",
    `
  export const propertyContractAddress = "${PropertyRecorder.address}"`
  );
}

// pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
