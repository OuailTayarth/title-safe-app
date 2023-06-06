/* configure hardhat to work with polygon*/

require("@nomiclabs/hardhat-waffle");

const fs = require("fs");

// get the private key from the secret file
const privateKey = fs.readFileSync(".secret").toString().trim();

const projectId = "184b35311791483b991c8951bb07c56c";

module.exports = {
  defaultNetwork: "sepolia",

  networks: {
    hardhat: {
      chainId: 1337,
    },

    // connect hardhat with infura endpoint
    sepolia: {
      url: `https://sepolia.infura.io/v3/${projectId}`,
      accounts: [privateKey],
    },

    mainnet: {
      url: `https://mainnet.infura.io/v3/${projectId}`,
      accounts: [privateKey],
    },
  },

  solidity: {
    version: "0.8.8",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
