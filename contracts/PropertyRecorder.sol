// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title A contract for recording property titles onchain
/// @dev Extends ERC721URIStorage for NFT functionality

contract PropertyRecorder is ERC721URIStorage {
  using Counters for Counters.Counter;

  Counters.Counter private _tokenIds;
  Counters.Counter private _itemsTransferred; // / Tracks transferred titles

  /// @notice Address of the contract administrator
  address public admin;

  /// @notice List of addresses with manager permissions
  address[] public managers;

  /// @notice Indicates if an address is a manager
  mapping(address => bool) public isManager;

  /// @notice Maps token IDs to their corresponding property data
  mapping(uint256 => PropertyData) public idToProperty;

  error UnautorizedCaller(string message);

  /// @struct PropertyData
  /// @member tokenId Unique token identifier
  /// @member recorder Address of the recorder
  /// @member database Address of the database storing detailed property info
  /// @member instrumentNumber Instrument number of the property
  /// @member status Current status of the property
  /// @member recorded Boolean indicating if the property is recorded
  struct PropertyData {
    uint256 tokenId;
    address recorder;
    address database;
    uint256 instrumentNumber;
    string status;
    bool recorded;
  }

  /// @notice Emitted when a property is successfully created
  event PropertyCreated(
    uint256 indexed tokenId,
    address recorder,
    address database,
    uint256 instrumentNum,
    string status,
    bool recorded
  );

  // TODO:
  // function to set the new admin to another address
  // Gas Optimization

  /// @dev Sets the contract deployer as the admin
  constructor() ERC721("Property title", "PTT") {
    admin = msg.sender;
  }

  /*** modifier */

  /// @notice Ensures the function is called by a manager
  modifier onlyManager() {
    require(isManager[msg.sender], "Caller is not a manager");
    _;
  }

  /// @notice Ensures the function is called by the owner
  modifier onlyOwner() {
    require(admin == msg.sender, "Caller is not the owner");
    _;
  }

  /// @notice Allows a manager to mint a property and record the associated metadata
  /// @dev Requires the caller to be a manager
  /// @param tokenURI The URL that holds the metadata of the property
  /// @param instrumentNum The instrument number associated with the property/NFT
  /// @return newTokenId The tokenId of the minted property
  function createPropertyByManagers(
    string memory tokenURI,
    uint256 instrumentNum
  ) public onlyManager returns (uint256) {
    _tokenIds.increment();
    uint256 newTokenId = _tokenIds.current();

    _mint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, tokenURI);
    recordProperty(newTokenId, instrumentNum);

    return newTokenId;
  }

  /// @notice Allows the owner of an NFT or a manager to change the metadata
  /// @dev Checks if the caller is the recorder or a manager before allowing metadata update
  /// @param tokenId The ID of the token to update
  /// @param _tokenURI The new URI for the token metadata
  function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
    if (idToProperty[tokenId].recorder == msg.sender || isManager[msg.sender]) {
      _setTokenURI(tokenId, _tokenURI);
    } else {
      revert UnautorizedCaller("Unauthorized Caller");
    }
  }

  /// @notice Allows any user to mint a property and record the associated metadata
  /// @dev This function does not require manager privileges
  /// @param tokenURI The URL that holds the metadata of the property
  /// @param instrumentNum The instrument number associated with the property/NFT
  /// @return newTokenId The tokenId of the minted property
  function createProperty(
    string memory tokenURI,
    uint256 instrumentNum
  ) public returns (uint256) {
    _tokenIds.increment();
    uint256 newTokenId = _tokenIds.current();

    _mint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, tokenURI);
    recordProperty(newTokenId, instrumentNum);

    return newTokenId;
  }

  /// @notice Records the metadata of a property internally
  /// @dev This function is internal and can only be called by this contract
  /// @param tokenId The token ID of the minted property
  /// @param instrumentNum The instrument number associated with the property/NFT
  function recordProperty(uint256 tokenId, uint256 instrumentNum) internal {
    string memory status = "pending";

    idToProperty[tokenId] = PropertyData(
      tokenId,
      msg.sender, // recorder
      address(this), // database
      instrumentNum,
      status,
      true
    );

    _transfer(msg.sender, address(this), tokenId);

    emit PropertyCreated(
      tokenId,
      msg.sender,
      address(this),
      instrumentNum,
      status,
      true
    );
  }

  /// @notice Retrieves all properties recorded by managers
  /// @dev Returns an array of PropertyData for properties still held by the contract
  /// @return items An array of PropertyData representing recoded properties
  function fetchAllPropertiesByManagers()
    public
    view
    returns (PropertyData[] memory)
  {
    uint totalItemCount = _tokenIds.current();
    uint recordedItemsCount = totalItemCount - _itemsTransferred.current();
    uint currentIndex = 0;

    PropertyData[] memory items = new PropertyData[](recordedItemsCount);

    for (uint i = 0; i < totalItemCount; i++) {
      if (
        idToProperty[i + 1].database == address(this) && isManager[msg.sender]
      ) {
        uint currentId = i + 1;
        PropertyData storage currentItem = idToProperty[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /// @notice Returns all properties currently held by the contract
  /// @dev Iterates over all token IDs to collect properties stored in the contract's database
  /// @return items An array of PropertyData representing all properties held by the contract
  function fetchAllProperties() public view returns (PropertyData[] memory) {
    uint totalItemCount = _tokenIds.current();
    uint recordedItemsCount = totalItemCount - _itemsTransferred.current();
    uint currentIndex = 0;

    PropertyData[] memory items = new PropertyData[](recordedItemsCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToProperty[i + 1].database == address(this)) {
        uint currentId = i + 1;
        PropertyData storage currentItem = idToProperty[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /// @notice Fetches and filters properties based on their instrument number
  /// @dev Filters properties by matching the given instrument number and returns them
  /// @param _instrumentNum The instrument number used to filter properties
  /// @return items An array of PropertyData for properties matching the specified instrument number
  function fetchPropertiesByNum(
    uint256 _instrumentNum
  ) public view returns (PropertyData[] memory) {
    uint256 totalItemCount = _tokenIds.current();
    uint256 count = 0;

    // Count the number of tokens that match the instrument number
    for (uint256 i = 0; i < totalItemCount; i++) {
      if (
        idToProperty[i + 1].database == address(this) &&
        idToProperty[i + 1].instrumentNumber == _instrumentNum
      ) {
        count++;
      }
    }

    // Create a new array with the correct size
    PropertyData[] memory items = new PropertyData[](count);
    uint256 currentIndex = 0;

    // Populate the array with tokens that match the instrument number
    for (uint256 i = 0; i < totalItemCount; i++) {
      if (
        idToProperty[i + 1].database == address(this) &&
        idToProperty[i + 1].instrumentNumber == _instrumentNum
      ) {
        PropertyData storage currentItem = idToProperty[i + 1];
        items[currentIndex] = currentItem;
        currentIndex++;
      }
    }

    return items;
  }

  /// @notice Retrieves the properties recorded by the calling user
  /// @dev Returns an array of PropertyData containing properties associated with the caller's address
  /// @return An array of PropertyData representing the properties recorded by the caller
  function fetchUserProperty() public view returns (PropertyData[] memory) {
    uint totalItemCount = _tokenIds.current();
    uint itemCount = 0;
    uint currentIndex = 0;

    for (uint i = 0; i < totalItemCount; i++) {
      if (idToProperty[i + 1].recorder == msg.sender) {
        itemCount += 1;
      }
    }

    PropertyData[] memory items = new PropertyData[](itemCount);
    for (uint i = 0; i < totalItemCount; i++) {
      if (idToProperty[i + 1].recorder == msg.sender) {
        uint currentId = i + 1;
        PropertyData storage currentItem = idToProperty[currentId];
        items[currentIndex] = currentItem;
        currentIndex += 1;
      }
    }
    return items;
  }

  /// @notice Allows the admin to add a new manager to the contract
  /// @dev Adds a new manager address to the managers array and sets its status in the isManager mapping
  /// @param _newManager The address of the new manager to be added
  function addManager(address _newManager) external onlyOwner {
    require(!isManager[_newManager], "Manager is not unique");
    managers.push(_newManager);
    isManager[_newManager] = true;
  }

  /// @notice Allows managers to approve the status of a property
  /// @dev Changes the status of a property to 'approved' if it exists and is recorded
  /// @param tokenId The token ID of the property whose status is to be approved
  function approvedPropertyStatus(uint256 tokenId) external onlyManager {
    PropertyData storage property = idToProperty[tokenId];
    require(property.recorder != address(0), "property doesn't exesit...");
    string memory newStatus = "approved";
    property.status = newStatus;
  }
}
