// React and hooks
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

// Next.js
import Link from "next/link";

// Material-UI components
import IconButton from "@mui/material/IconButton";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";

// Bootstrap components
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

// Blockchain-related
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { propertyContractAddress } from "../../../config";
import propertyInterface from "../../../artifacts/contracts/PropertyRecorder.sol/PropertyRecorder.json";

// HTTP client
import axios from "axios";

// AWS config
import { s3 } from "../../config/awsConfig.js";

// Custom hooks
import useAlert from "../useAlert";
import { CopperLoading } from "respinner";
import { RootState } from "../../redux/store";
import { BlockchainStates } from "../../models/blockchainStates";
import { Property, PropertyMetaData } from "../../models/property";

const MyPropertiesTitles = (): JSX.Element => {
  const [myPropertiesTitles, setMyPropertiesTitles] = useState<Property[]>([]);
  const [loadingState, setLoadingState] = useState<"not-loaded" | "loaded">(
    "not-loaded"
  );
  const [propertyToUpdate, setPropertyToUpdate] = useState<Property | null>(
    null
  );
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [alert, showAlert] = useAlert(10000);
  const [activeTransaction, setActiveTransaction] = useState<boolean>(false);
  const [propertyMetadata, setPropertyMetadata] = useState<PropertyMetaData>({
    documents: {},
  });
  const [loadingData, setLoadingData] = useState(true);
  const blockchain = useSelector<RootState, BlockchainStates>(
    (state) => state.blockchain
  );

  /**
   * Delays setting the loading state to false after 3 seconds.
   */
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    timer = setTimeout(() => {
      setLoadingData(false);
    }, 3000);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  /**
   * Loads user properties when the wallet is connected.
   */
  useEffect(() => {
    if (blockchain.walletConnected) {
      loadMyPropertiesTitles();
    }
  }, [blockchain.walletConnected]);

  /**
   * Opens the add document modal and sets the property to update.
   * @param {Object} property - The property to be updated.
   */
  function openAddDocumentModal(property: Property) {
    setPropertyToUpdate(property);
    setPropertyMetadata(property);
  }

  /**
   * Closes the add document modal and resets related states.
   */
  function handleAddDocumentModalClose() {
    setPropertyToUpdate(null);
    setSelectedDocumentType("");
  }

  /**
   * Fetches and loads the user's property titles from the blockchain.
   */
  async function loadMyPropertiesTitles(): Promise<void> {
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

    /* Returns recorded property by specific user based on their wallet address */
    const data = await marketContract.fetchUserProperty();

    const items = await Promise.all(
      data.map(async (i: any): Promise<Property> => {
        // get NFT URI to fetch the metadata
        const tokenUri = await marketContract.tokenURI(i.tokenId);

        //fetch the metadata from the URI
        const meta = await axios.get(tokenUri);
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
    setMyPropertiesTitles(items);
    setLoadingState("loaded");
  }

  /**
   * Updates the metadata URI for a property on the blockchain.
   * @param {number} tokenId - The token ID of the property to update.
   * @param {string} newMetadataUri - The new metadata URI to set.
   */
  async function updatePropertyMetadata(
    tokenId: string,
    newMetadataUri: string
  ): Promise<void> {
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
    setActiveTransaction(true);
    try {
      // We add the newMetaDataUri +  the propertyToUpdate tokenID selected from clicking on Add Additional Documents
      let transaction = await marketContract.setTokenURI(
        tokenId,
        newMetadataUri
      );
      transaction.wait();

      showAlert(true, "Document(s) uploaded successfully!");
      setActiveTransaction(false);
    } catch {
      setActiveTransaction(false);
      showAlert(true, "Upload failed. Try again later or contact support.");
    }
  }

  /**
   * Deletes a document URL from S3 and updates property metadata.
   * @param {string} urlToDelete - The URL of the document to delete.
   * @param {string} documentType - The type of document being deleted.
   */
  const handleDeleteUrl = async (
    urlToDelete: string,
    documentType: string
  ): Promise<void> => {
    try {
      const url = new URL(urlToDelete);

      // Extract the bucket name and encoded key from the URL
      const bucketName = url.hostname.split(".")[0];
      let encodedKey = url.pathname.slice(1);

      // Remove any '+' or '%20' from the encoded key
      encodedKey = encodedKey.replace(/\+|%20/g, " ");

      // Delete the object from the S3 bucket using the original key
      await s3
        .deleteObject({
          Bucket: bucketName,
          Key: encodedKey,
        })
        .promise();
    } catch (error) {
      console.error("Error deleting object from S3:", error);
      // Handle the error, show an error message, etc.
    }
    setPropertyMetadata((prevData: PropertyMetaData) => ({
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
  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    selectedDocumentType: string
  ): Promise<void> {
    if (!selectedDocumentType) {
      showAlert(true, "Please select document Type(e,g, Deed,...");
      return;
    }

    const files = e.target.files ? Array.from(e.target.files) : [];

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

      const uploadFileUrls = await Promise.all(fileUploadPromises);

      setPropertyMetadata((prevData) => {
        return {
          ...prevData,
          documents: {
            ...prevData.documents,
            [selectedDocumentType]: [
              // spread the existing documents before adding the new ones
              ...(Array.isArray(prevData.documents?.[selectedDocumentType])
                ? prevData.documents[selectedDocumentType]
                : []),
              ...uploadFileUrls,
            ],
          },
        };
      });

      console.log("Property from upload files", propertyMetadata);
    } catch (err) {
      console.log(err);
    }
  }

  /**
   * Saves updated property metadata with new documents to S3 and the blockchain.
   */
  async function handleAddDocumentModalSave(): Promise<void> {
    if (!selectedDocumentType) {
      // You could show an error message here
      return showAlert(true, "Please select a Document Type(e.g, Deed)");
    } else if (
      !propertyMetadata.documents[selectedDocumentType] ||
      propertyMetadata.documents[selectedDocumentType].length === 0
    ) {
      return showAlert(true, "Please upload a document");
    }

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
      propertyToUpdate!.tokenId
    );

    console.log("property URI", propertyTokenURI);

    const url = new URL(propertyTokenURI);

    console.log("Url from URL", url);

    // Extract the bucket name and encoded key from the URL
    const bucketName = url.hostname.split(".")[0];
    let encodedKey = url.pathname.slice(1);

    // Remove any '+' or '%20' from the encoded key
    encodedKey = encodedKey.replace(/\+|%20/g, " ");

    try {
      // Get the existing JSON file from Amazon S3
      const getParams = {
        Bucket: bucketName,
        Key: encodedKey,
      };

      const existingData = await s3.getObject(getParams).promise();
      const body = existingData.Body as Buffer;
      const existingMetadata = JSON.parse(body.toString());

      // Update the existing metadata with the new document information
      existingMetadata.documents = {
        ...existingMetadata.documents,
        ...propertyMetadata.documents,
      };

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

      // Get the URL of the updated metadata
      const newMetadataUri = `https://${bucketName}.s3.amazonaws.com/${encodedKey}`;

      console.log("newMetadataUri", newMetadataUri);

      // Update the property metadata on-chain with the new metadata URI
      await updatePropertyMetadata(propertyToUpdate!.tokenId, newMetadataUri);
      const updatedProperties = myPropertiesTitles.map((property) =>
        property.tokenId === propertyToUpdate!.tokenId
          ? { ...property, ...existingMetadata }
          : property
      );
      setMyPropertiesTitles(updatedProperties);
    } catch (error) {
      console.error("Error updating metadata:", error);
    }
  }

  // Checks if wallet is disconnected and loadingData is false. show the message
  if (!loadingData && !blockchain.walletConnected)
    return (
      <h4 className="loader-container">
        Please connect your wallet to be able to view your recorded properties!
      </h4>
    );

  // Checks if data is loaded but no properties exist
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
                My Recorded Titles
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
                        <span className="fw">Sale Date: </span> {item.saleDate}
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal
        show={propertyToUpdate !== null}
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
            disabled={activeTransaction}
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
    </section>
  );
};

export default MyPropertiesTitles;
