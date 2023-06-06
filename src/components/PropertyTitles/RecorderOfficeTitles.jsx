// React and hooks
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

// Next.js
import Link from "next/link";

// Material-UI
import IconButton from "@mui/material/IconButton";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";

// Bootstrap
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

// Blockchain-related
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { propertyContractAddress } from "../../../config";
import propertyInterface from "../../../artifacts/contracts/PropertyRecorder.sol/PropertyRecorder.json";

// HTTP client
import axios from "axios";

// AWS Config
import { s3 } from "../../config/awsConfig.js";

// Custom hooks
import useAlert from "../useAlert";
import { CopperLoading } from "respinner";

const RecorderOfficeTitles = () => {
  const [myPropertiesTitles, setMyPropertiesTitles] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  const [propertyToUpdate, setPropertyToUpdate] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [alert, showAlert, showError] = useAlert(10000);
  const [activeTransactions, setActiveTransactions] = useState({});
  const [activeTransaction, setActiveTransaction] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isManager, setIsManager] = useState(false);

  const [propertyMetadata, updatedPropertyMetadata] = useState({
    documents: {},
  });

  const blockchain = useSelector((state) => state.blockchain);

  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [isEditInformationModalOpen, setIsEditInformationModalOpen] =
    useState(false);

  /**
   * Delays setting the loading state to false after 3 seconds and clears the timeout on cleanup.
   */
  useEffect(() => {
    const time = setTimeout(() => {
      setLoadingData(false);
    }, 3000);
    return () => clearTimeout(time);
  }, []);

  /**
   * Loads property titles and checks user manager status when the account changes.
   */
  useEffect(() => {
    LoadMyPropertiesTitles();
    IsUserManager();
  }, [blockchain.account]);

  /**
   * Opens the add document modal and sets the property to update.
   * @param {Object} property - The property to be updated.
   */
  function openAddDocumentModal(property) {
    setPropertyToUpdate(property);
    updatedPropertyMetadata(property);
    setIsAddDocumentModalOpen(true);
  }

  /**
   * Updates the property to update state with new input values.
   * @param {Object} e - The event object from the input change.
   */
  const handleChange = (e) => {
    setPropertyToUpdate({
      ...propertyToUpdate,
      [e.target.name]: e.target.value,
    });
  };

  /**
   * Submits updated property metadata to S3 and updates the state.
   */
  const handleSubmit = async () => {
    // Get the tokens URL of the metadata of the current tokenID
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      signer
    );

    // We add the newMetaDataUri +  the propertyToUpdate tokenID selected from clicking on Add Additional Documents
    let propertyTokenURI = await marketContract.tokenURI(
      propertyToUpdate.tokenId
    );

    try {
      console.log("property Url", propertyTokenURI);

      // Extract the bucket name and object key from the URL
      const url = new URL(propertyTokenURI);
      const bucketName = url.hostname.split(".")[0];
      let objectKey = url.pathname.slice(1);
      objectKey = objectKey.replace(/\+|%20/g, " ");

      // Retrieve the existing JSON file from the S3 bucket
      const getParams = {
        Bucket: bucketName,
        Key: objectKey,
      };

      const existingData = await s3.getObject(getParams).promise();
      const existingProperty = JSON.parse(existingData.Body.toString());

      // Update the property information with the modified data
      const updatedProperty = {
        ...existingProperty,
        ...propertyToUpdate,
      };

      // Convert the updated property data back to a string
      const updatedData = JSON.stringify(updatedProperty);

      // Upload the updated JSON data back to the S3 bucket
      const putParams = {
        Bucket: bucketName,
        Key: objectKey,
        Body: updatedData,
        ContentType: "application/json",
      };

      await s3.putObject(putParams).promise();

      // Update the myPropertiesTitles state with the updated property information
      setMyPropertiesTitles((prevTitles) =>
        prevTitles.map((title) =>
          title.tokenId === propertyToUpdate.tokenId ? updatedProperty : title
        )
      );

      handleEditInformationModalClose();
    } catch (error) {
      console.error("Error updating property information:", error);
    }
  };

  /**
   * Closes the add document modal and resets related states.
   */
  function handleAddDocumentModalClose() {
    setPropertyToUpdate(null);
    setSelectedDocumentType(null);
    setIsAddDocumentModalOpen(false);
  }

  /**
   * Closes the edit information modal and resets the property state.
   */
  function handleEditInformationModalClose() {
    setPropertyToUpdate(null);
    setIsEditInformationModalOpen(false);
  }

  /**
   * Opens the edit information modal and sets the property to update.
   * @param {Object} property - The property to be edited.
   */
  function openEditInformationModal(property) {
    setPropertyToUpdate(property);
    setIsEditInformationModalOpen(true);
  }

  /**
   * Updates the metadata URI for a property on the blockchain.
   * @param {number} tokenId - The token ID of the property to update.
   * @param {string} newMetadataUri - The new metadata URI to set.
   */
  async function updatePropertyMetadata(tokenId, newMetadataUri) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      signer
    );
    showAlert(true, "Uploading document. Please wait...");
    setActiveTransactions((prev) => ({ ...prev, [tokenId]: true }));
    try {
      // We add the newMetaDataUri +  the propertyToUpdate tokenID selected from clicking on Add Additional Documents
      let transaction = await marketContract.setTokenURI(
        tokenId,
        newMetadataUri
      );
      transaction.wait();

      showAlert(true, "Document(s) uploaded successfully!");
      setActiveTransactions((prev) => ({ ...prev, [tokenId]: false }));
    } catch (err) {
      setActiveTransactions((prev) => ({ ...prev, [tokenId]: false }));
      showAlert(true, "Upload failed. Try again later or contact support.");
    }
  }

  /**
   * Deletes a document URL from S3 and updates property metadata.
   * @param {string} urlToDelete - The URL of the document to delete.
   * @param {string} documentType - The type of document being deleted.
   */
  const handleDeleteUrl = async (urlToDelete, documentType) => {
    try {
      const url = new URL(urlToDelete);

      console.log("Url from URL", url);

      // Extract the bucket name and encoded key from the URL
      const bucketName = url.hostname.split(".")[0];
      let encodedKey = url.pathname.slice(1);

      // Remove any '+' or '%20' from the encoded key
      encodedKey = encodedKey.replace(/\+|%20/g, " ");

      console.log("encodedKey", encodedKey);

      // Delete the object from the S3 bucket using the original key
      await s3
        .deleteObject({
          Bucket: bucketName,
          Key: encodedKey,
        })
        .promise();
    } catch (error) {
      console.error("Error deleting object from S3:", error);
    }
    updatedPropertyMetadata((prevData) => ({
      ...prevData,
      documents: {
        ...prevData.documents,
        [documentType]: prevData.documents[documentType]
          ? prevData.documents[documentType].filter(
              (url) => url !== urlToDelete
            )
          : [],
      },
    }));
  };

  /**
   * Handles file uploads to S3 and updates property metadata with new document URLs.
   * @param {Object} e - The event object from the file input.
   * @param {string} selectedDocumentType - The type of document being uploaded.
   */
  async function handleFileChange(e, selectedDocumentType) {
    const files = Array.from(e.target.files);

    try {
      // upload files to S3
      const fileUploadPromises = files.map(async (file) => {
        const fileParams = {
          Bucket: "property-title-recorder",
          Key: `documents/${file.name}`,
          Body: file,
          ContentType: "application/pdf",
          ContentDisposition: 'inline; filename="' + file.name + '"',
        };

        const uploadResult = await s3.upload(fileParams).promise();
        console.log(`File ${file.name} uploaded to S3:`, uploadResult.Location);
        return uploadResult.Location;
      });

      console.log("fileUpload", fileUploadPromises);

      const uploadFileUrls = await Promise.all(fileUploadPromises);

      updatedPropertyMetadata((prevData) => {
        return {
          ...prevData,
          documents: {
            ...prevData.documents,
            [selectedDocumentType]: [
              // Here, spread the existing documents before adding the new ones
              ...(Array.isArray(prevData.documents?.[selectedDocumentType])
                ? prevData.documents[selectedDocumentType]
                : []),
              ...uploadFileUrls,
            ],
          },
        };
      });
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Saves updated property metadata with new documents to S3 and the blockchain.
   */
  async function handleAddDocumentModalSave() {
    if (!selectedDocumentType) {
      return showAlert(true, "Please select a Document Type(e.g, Deed)");
    } else if (
      !propertyMetadata.documents[selectedDocumentType] ||
      propertyMetadata.documents[selectedDocumentType].length === 0
    ) {
      return showAlert(true, "Please upload a document");
    }

    setActiveTransaction(true);

    // Get the tokens URL of the metadata of the current tokenID
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      signer
    );

    // We add the newMetaDataUri +  the propertyToUpdate tokenID selected from clicking on Add Additional Documents
    let propertyTokenURI = await marketContract.tokenURI(
      propertyToUpdate.tokenId
    );

    const url = new URL(propertyTokenURI);

    // Extract the bucket name and encoded key from the URL
    const bucketName = url.hostname.split(".")[0];
    let encodedKey = url.pathname.slice(1);

    // Remove any '+' or '%20' from the encoded key
    encodedKey = encodedKey.replace(/\+|%20/g, " ");

    console.log("encodedKey", encodedKey);

    try {
      // Get the existing JSON file from Amazon S3
      const getParams = {
        Bucket: bucketName,
        Key: encodedKey,
      };

      const existingData = await s3.getObject(getParams).promise();
      const existingMetadata = JSON.parse(existingData.Body.toString());

      // Update the existing metadata with the new document information
      existingMetadata.documents = {
        ...existingMetadata.documents,
        ...propertyMetadata.documents,
      };

      // Convert the updated metadata to a string
      const updatedMetadata = JSON.stringify(existingMetadata);

      console.log("updatedMetadata", updatedMetadata);

      const putParams = {
        Bucket: bucketName,
        Key: encodedKey,
        Body: updatedMetadata,
        ContentType: "application/json",
      };

      // Upload the updated metadata to S3
      await s3.putObject(putParams).promise();

      // Get the URL of the updated metadata
      const newMetadataUri = `https://${bucketName}.s3.amazonaws.com/${encodedKey}`;

      // Update the already existing property metadata URI on-chain with the new metadata URI
      // that reflect the new additional documents if there any
      await updatePropertyMetadata(propertyToUpdate.tokenId, newMetadataUri);
      const updatedProperties = myPropertiesTitles.map((property) =>
        property.tokenId === propertyToUpdate.tokenId
          ? { ...property, ...existingMetadata }
          : property
      );
      setMyPropertiesTitles(updatedProperties);
      setActiveTransaction(false);
    } catch (error) {
      console.error("Error updating metadata:", error);
    }
  }

  /**
   * Approves a property status on the blockchain and updates S3 metadata.
   * @param {number} tokenId - The token ID of the property to approve.
   */
  async function approvePropertyStatus(tokenId) {
    setActiveTransactions((prev) => ({ ...prev, [tokenId]: true }));
    showAlert(true, "Property approval is in progress. Please wait...");

    try {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();

      const marketContract = new ethers.Contract(
        propertyContractAddress,
        propertyInterface.abi,
        signer
      );

      // Get Property Token URI
      let propertyTokenURI = await marketContract.tokenURI(tokenId);

      // Change status on chain //
      let transaction = await marketContract.approvedPropertyStatus(tokenId);
      await transaction.wait();

      // Change status of the property on Amazon S3 bucket targeted by key
      const url = new URL(propertyTokenURI);

      console.log("Url from URL", url);

      // Extract the bucket name and encoded key from the URL
      const bucketName = url.hostname.split(".")[0];
      let encodedKey = url.pathname.slice(1);

      // Remove any '+' or '%20' from the encoded key
      encodedKey = encodedKey.replace(/\+|%20/g, " ");

      console.log("encodedKey", encodedKey);

      // Get the existing JSON file from Amazon S3
      const getParams = {
        Bucket: bucketName,
        Key: encodedKey,
      };

      const existingData = await s3.getObject(getParams).promise();
      const existingMetadata = JSON.parse(existingData.Body.toString());

      console.log("existingData", existingData);
      console.log("existingMetadata ", existingMetadata);

      // Update the status field in the existing metadata
      existingMetadata.status = "Approved";

      // Convert the updated metadata to a string
      const updatedMetadata = JSON.stringify(existingMetadata);

      // Create parameters for S3 upload
      const putParams = {
        Bucket: bucketName,
        Key: encodedKey,
        Body: updatedMetadata,
        ContentType: "application/json",
      };

      // Upload the updated metadata to S3
      await s3.putObject(putParams).promise();

      // Updating the property status in the state
      const updatedProperties = myPropertiesTitles.map((property) =>
        property.tokenId === tokenId
          ? { ...property, status: "Approved" }
          : property
      );
      setMyPropertiesTitles(updatedProperties);
      showAlert(true, "Property has been approved successfully!");
    } catch (err) {
      showAlert(
        true,
        "Transaction failed: There was an error while processing your request. Please try again later or contact support for assistance."
      );
    }
    setActiveTransactions((prev) => ({ ...prev, [tokenId]: false }));
  }

  /**
   * Checks if the connected user is a manager.
   */
  async function IsUserManager() {
    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      signer
    );
    if (blockchain.walletConnected) {
      const data = await marketContract.isManager(blockchain.account);
      setIsManager(data);
    }
  }

  /**
   * Loads all property titles for a manager from the blockchain.
   */
  async function LoadMyPropertiesTitles() {
    IsUserManager();

    const web3Modal = new Web3Modal({
      network: "mainnet",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      signer
    );

    // check if the connected address is a manager(true)
    if (isManager) {
      /* Returns all unsold market items (array of arrays) */
      const data = await marketContract.fetchAllPropertiesByManagers();
      console.log("fetch Property By Managers", data);

      const items = await Promise.all(
        data.map(async (i) => {
          // get NFT URI to fetch the metadata
          const tokenUri = await marketContract.tokenURI(i.tokenId);
          console.log("Token Id", tokenUri);

          //fetch the meta data from the URI
          const meta = await axios.get(tokenUri);
          console.log("metaaa", meta);
          console.log(typeof i.instrumentNumber.toNumber());

          let item = {
            tokenId: i.tokenId.toNumber(),
            recorder: i.recorder,
            database: i.database,
            instrumentNum: i.instrumentNumber.toNumber(),
            name: meta.data.name,
            propertyAddress: meta.data.propertyAddress,
            deedNumber: meta.data.deedNumber,
            saleDate: meta.data.saleDate,
            salePrice: meta.data.salePrice,
            zoning: meta.data.zoning,
            subdivision: meta.data.subdivision,
            constructionYear: meta.data.constructionYear,
            livingSpace: meta.data.livingSpace,
            documents: meta.data.documents || {},
            state: meta.data.state,
            county: meta.data.county,
            status: i.status,
          };

          return item;
        })
      );

      console.log("NFTs Array Object", items);
      setMyPropertiesTitles(items);
      setLoadingState("loaded");
    }
  }

  /**
   * Checks if the user is not a manager but wallet is connected, then displays an unauthorized message.
   */
  if (!isManager && blockchain.walletConnected)
    return (
      <h4 className="loader-container">
        Your address isn't authorized to access the recorder's office
      </h4>
    );

  /**
   * Checks if data isn’t loading and wallet is disconnected, then displays a connect wallet message.
   */
  if (!loadingData && !blockchain.walletConnected)
    return (
      <h4 className="loader-container">
        Please connect your wallet to be able to view your recorded properties!
      </h4>
    );

  /**
   * Checks if data is loaded but no properties exist, then displays a no properties message.
   */
  if (loadingState == "loaded" && !myPropertiesTitles.length)
    return (
      <h1 className="loader-container">
        No properties have been recorded yet!
      </h1>
    );

  return (
    <section className="blog-grid section-padding position-re">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="sec-head text-center">
              <h2 className="wow fadeIn" data-wow-delay=".5s">
                Recorder's Office
              </h2>
            </div>
          </div>
        </div>

        <div className="content-wrapper">
          {loadingData ? (
            <div className="loading-container">
              <CopperLoading fill="#fff" size={50} strokeWidth={3} />
            </div>
          ) : (
            isManager && (
              <div className="row">
                {myPropertiesTitles.map((item, index) => (
                  <div
                    className="col-lg-4 wow fadeInUp"
                    data-wow-delay=".3s"
                    key={index}>
                    <div className="item bg-img">
                      <div className="cont">
                        <h6>
                          {" "}
                          <span className="fw">Owner Name: </span> {item.name}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Property Address: </span>{" "}
                          {item.propertyAddress}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Deed Number: </span>{" "}
                          {item.deedNumber}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Instrument Number: </span>{" "}
                          {item.instrumentNum}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Property Address: </span>{" "}
                          {item.propertyAddress}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Sale Date: </span>{" "}
                          {item.saleDate}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Sale Price: </span> $
                          {item.salePrice}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Zoning: </span> {item.zoning}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Subdivision: </span>{" "}
                          {item.subdivision}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Construction Year: </span>{" "}
                          {item.constructionYear}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">Living Space(sq ft): </span>{" "}
                          {item.livingSpace}
                        </h6>
                        <h6>
                          {" "}
                          <span className="fw">State: </span> {item.state}
                        </h6>
                        <h6>
                          <span className="fw">County: </span> {item.county}
                        </h6>
                        <h6
                          className={`status-${
                            item.status ? item.status.toLowerCase() : "default"
                          }`}>
                          <span className="fw">Status: </span> {item.status}
                        </h6>
                        <h6 className="fw-600">Property Document(s) :</h6>
                        {Object.entries(item.documents).map(
                          ([documentType, urls], index) => {
                            return (
                              <div key={index}>
                                <h5 id="documentType">
                                  <span className="fw ">{documentType}:</span>
                                </h5>
                                {Array.isArray(urls) &&
                                  urls.map((url, urlIndex) => (
                                    <div className="btn-more" key={urlIndex}>
                                      <Link href="/" legacyBehavior>
                                        <a
                                          className="simple-btn"
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer">
                                          View {documentType} Document{" "}
                                          {urlIndex + 1}
                                        </a>
                                      </Link>
                                    </div>
                                  ))}
                              </div>
                            );
                          }
                        )}
                        <button
                          className="nb butn fw light mt-30 full-width"
                          onClick={() => openAddDocumentModal(item)}>
                          Add Additional Document(s)
                        </button>

                        <button
                          className={`nb butn fw light mt-30 full-width ${
                            item.status === "approved"
                              ? "disabled no-hover"
                              : ""
                          }`}
                          onClick={() => approvePropertyStatus(item.tokenId)}
                          disabled={
                            item.status === "Approved" ||
                            activeTransactions[item.tokenId]
                          }>
                          {activeTransactions[item.tokenId]
                            ? "Transaction in Progress"
                            : item.status === "approved"
                              ? "Property Already Approved"
                              : "Approve Property"}
                        </button>
                        <div className="msgError">
                          <p id={`msgError-Modal-${item.tokenId}`}>
                            {alert.show && alert.msg}
                          </p>
                        </div>

                        <button
                          className="nb butn fw light mt-30 full-width"
                          onClick={() => openEditInformationModal(item)}>
                          Edit Property Information
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <Modal
        show={isAddDocumentModalOpen}
        onRequestClose={handleAddDocumentModalClose}
        shouldCloseOnOverlayClick={false}
        className="modal-font">
        <Modal.Header>
          <Modal.Title>Add Document to Property</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="form-group">
              <label htmlFor="document-type">Document Type</label>
              <select
                id="document-type"
                className="form-control"
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}>
                <option value="">Select a document type</option>
                <option value="deed">Deed</option>
                <option value="conveyance">Conveyance</option>
                <option value="title">Title</option>
                <option value="otherDocuments">Other Document(s)</option>
                {/* can add other document types as necessary */}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="document-file">
                {selectedDocumentType
                  ? `Upload ${
                      selectedDocumentType.charAt(0).toUpperCase() +
                      selectedDocumentType.slice(1)
                    } Document(s)`
                  : "Document(s)"}
              </label>
              <input
                type="file"
                id="document-file"
                className="form-control"
                disabled={!selectedDocumentType}
                onChange={(e) => handleFileChange(e, selectedDocumentType)}
                multiple
              />
              {propertyMetadata &&
                propertyMetadata.documents &&
                propertyMetadata.documents[selectedDocumentType] &&
                propertyMetadata.documents[selectedDocumentType].length > 0 && (
                  <ul className="viewUrl-style">
                    {propertyMetadata.documents[selectedDocumentType].map(
                      (url, index) => (
                        <li key={index}>
                          <IconButton
                            aria-label="delete"
                            size="small"
                            onClick={() =>
                              handleDeleteUrl(url, selectedDocumentType)
                            }>
                            <DeleteForeverOutlinedIcon id="deleteStyle" />
                          </IconButton>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer">
                            View Document {index + 1}
                          </a>
                        </li>
                      )
                    )}
                  </ul>
                )}
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={activeTransaction ? 1 : 0}
            onClick={handleAddDocumentModalClose}>
            Close
          </Button>

          <Button variant="primary" onClick={handleAddDocumentModalSave}>
            <span>{activeTransaction ? "Busy..." : "Upload Document(s)"}</span>
          </Button>
        </Modal.Footer>
        <div className="msgError">
          <p id="msgError-Modal">{alert.show && alert.msg}</p>
        </div>
      </Modal>

      <Modal
        show={isEditInformationModalOpen}
        onRequestClose={handleEditInformationModalClose}
        shouldCloseOnOverlayClick={false}
        className="modal-font">
        <Modal.Header>
          <Modal.Title>Edit Property Information</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <form onSubmit={handleSubmit}>
            <div className="form-group row">
              <div className="col-6">
                <label htmlFor="name">Name:</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={propertyToUpdate?.name || ""}
                  onChange={handleChange}
                  placeholder="Owner Name"
                  required
                />
              </div>

              <div className="col-6">
                <label htmlFor="propertyAddress">Property Address:</label>
                <input
                  className="form-control"
                  type="text"
                  name="propertyAddress"
                  value={propertyToUpdate?.propertyAddress || ""}
                  onChange={handleChange}
                  placeholder="Property Address"
                  required
                />
              </div>
            </div>

            <div className="form-group row">
              <div className="col-6">
                <label htmlFor="document-type">Deed Number:</label>
                <input
                  type="text"
                  className="form-control"
                  name="deedNumber"
                  value={propertyToUpdate?.deedNumber || ""}
                  onChange={handleChange}
                  placeholder="Deed Number"
                  required
                />
              </div>

              <div className="col-6">
                <label htmlFor="document-type">Instrument Number:</label>
                <input
                  type="text"
                  className="form-control"
                  name="instrumentNumber"
                  value={propertyToUpdate?.instrumentNum || ""}
                  onChange={handleChange}
                  placeholder="Instrument Number"
                  required
                />
              </div>
            </div>

            <div className="form-group row">
              <div className="col-6">
                <label htmlFor="document-type">Sale Date:</label>
                <input
                  type="text"
                  name="saleDate"
                  className="form-control"
                  value={propertyToUpdate?.saleDate || ""}
                  onChange={handleChange}
                  placeholder="Sale Date"
                  required
                />
              </div>

              <div className="col-6">
                <label htmlFor="document-type">Sale Price:</label>
                <input
                  type="text"
                  name="salePrice"
                  className="form-control"
                  value={propertyToUpdate?.salePrice || ""}
                  onChange={handleChange}
                  placeholder="Sale Price"
                  required
                />
              </div>
            </div>

            <div className="form-group row">
              <div className="col-6">
                <label htmlFor="document-type">Zoning:</label>
                <input
                  type="text"
                  name="zoning"
                  className="form-control"
                  value={propertyToUpdate?.zoning || ""}
                  onChange={handleChange}
                  placeholder="Zoning"
                  required
                />
              </div>

              <div className="col-6">
                <label htmlFor="document-type">Subdivision:</label>
                <input
                  type="text"
                  name="subdivision"
                  className="form-control"
                  value={propertyToUpdate?.subdivision || ""}
                  onChange={handleChange}
                  placeholder="Subdivision"
                  required
                />
              </div>
            </div>

            <div className="form-group row">
              <div className="col-6">
                <label htmlFor="document-type">Construction Year:</label>
                <input
                  type="text"
                  name="constructionYear"
                  className="form-control"
                  value={propertyToUpdate?.constructionYear || ""}
                  onChange={handleChange}
                  placeholder="Construction Year"
                  required
                />
              </div>

              <div className="col-6">
                <label htmlFor="document-type">Living Space:</label>
                <input
                  type="text"
                  name="livingSpace"
                  className="form-control"
                  value={propertyToUpdate?.livingSpace || ""}
                  onChange={handleChange}
                  placeholder="Living Space"
                  required
                />
              </div>
            </div>

            <div className="form-group row">
              <div className="col-6">
                <select
                  name="state"
                  className="form-control"
                  value={propertyToUpdate?.state || ""}
                  onChange={handleChange}
                  required>
                  <option value="">Select State</option>
                  <option value="arizona">Arizona</option>
                  <option value="newyork">New York</option>
                  <option value="california">California</option>
                </select>
              </div>

              <div className="col-6">
                <select
                  name="county"
                  className="form-control"
                  value={propertyToUpdate?.county || ""}
                  onChange={handleChange}
                  required>
                  <option value="">Select County</option>
                  <option value="maricopa">Maricopa</option>
                  <option value="pima">Pima</option>
                  <option value="pinal">Pinal</option>
                </select>
              </div>
            </div>
          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            disabled={activeTransaction ? 1 : 0}
            onClick={handleEditInformationModalClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            <span>
              {activeTransaction
                ? "Transaction in Progress..."
                : "Submit Changes"}
            </span>
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
};

export default RecorderOfficeTitles;
