// React and hooks
import React, { useState, useRef, useEffect } from "react";

// Redux
import { useDispatch, useSelector } from "react-redux";
import { connect } from "../../redux/blockchain/blockchainActions";
import { fetchData } from "../../redux/data/dataActions";

// Material-UI
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import IconButton from "@mui/material/IconButton";

// Blockchain-related
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import { propertyContractAddress } from "../../../config";
import propertyInterface from "../../../public/config/abi.json";

// AWS config
import { s3 } from "../../config/awsConfig.js";

// Custom hooks
import useAlert from "../useAlert";

import { BlockchainStates } from "../../models/blockchainStates";
import { RootState, AppDispatch } from "../../redux/store";
import { PropertyData } from "../../models/property";

const RecordTitles = (): JSX.Element => {
  const formRef = useRef<HTMLFormElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const blockchain = useSelector<RootState, BlockchainStates>(
    (state) => state.blockchain
  );
  const [activeTransaction, setActiveTransaction] = useState<boolean>(false);
  const [selectedDocuments, setSelectedDocuments] = useState<
    Record<string, string>
  >({});
  const [alert, showAlert] = useAlert(10000);
  const [propertyData, updatePropertyData] = useState<PropertyData>({
    name: "",
    propertyAddress: "",
    deedNumber: "",
    instrumentNum: "",
    saleDate: "",
    salePrice: "",
    zoning: "",
    subdivision: "",
    constructionYear: "",
    livingSpace: "",
    state: "",
    county: "",
    documents: {},
    documentType: "",
  });

  // Document labels type
  const documentLabels: Record<string, string> = {
    deed: "Deed Document(s)",
    conveyance: "Conveyance Document(s)",
    title: "Title Document(s)",
  };

  // State counties mapping
  const stateCounties: Record<string, string[]> = {
    arizona: ["Maricopa", "Yavapai", "Coconino"],
    newyork: ["Kings", "Queens", "New York", "Bronx", "Richmond"],
    california: [
      "Los Angeles",
      "San Diego",
      "Orange",
      "Riverside",
      "San Bernardino",
    ],
  };

  /**
   * Fetches blockchain data when account and smart contract are available.
   */
  useEffect(() => {
    if (blockchain.account !== "" && blockchain.smartContract !== null) {
      dispatch(fetchData());
    }
  }, [blockchain.smartContract, dispatch]);

  /**
   * Reconnects the wallet on page refresh if previously connected.
   */
  useEffect(() => {
    const onPageConnected = async () => {
      if (localStorage?.getItem("isWalletConnected") === "true") {
        try {
          dispatch(connect());
        } catch (err) {
          console.log(err);
        }
      }
    };
    onPageConnected();
  }, []);

  /**
   * Deletes a document URL from S3 and updates property data.
   * @param {string} urlToDelete - The URL of the document to delete.
   * @param {string} documentType - The type of document being deleted.
   */
  const handleDeleteUrl = async (
    urlToDelete: string,
    documentType: string
  ): Promise<void> => {
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
      // Handle the error, show an error message, etc.
    }

    updatePropertyData((prevData) => {
      // Make a deep copy of the propertyData
      const newData = {
        ...prevData,
        documents: { ...prevData.documents },
      };

      // Check if the documentType exists in the documents object
      if (newData.documents[documentType]) {
        // Filter out the URL to delete for the specific documentType
        newData.documents[documentType] = newData.documents[
          documentType
        ].filter((url) => url !== urlToDelete);
      }

      // Return the new propertyData object
      return newData;
    });
  };

  /**
   * Uploads multiple files to S3 and updates property data with new document URLs.
   * @param {Object} e - The event object from the file input.
   * @param {string} documentType - The type of document being uploaded.
   */
  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ): Promise<void> {
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

      const uploadNewFilesUrls = await Promise.all(fileUploadPromises);

      // Update the propertyData state allowing multiple files per document type
      updatePropertyData((prevData) => ({
        ...prevData,
        documents: {
          ...prevData.documents,
          [documentType]: [
            ...(prevData.documents[documentType] || []), // copying existing URLs for this type
            ...uploadNewFilesUrls, // adding new URLs for that type
          ],
        },
      }));
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Records property metadata in S3 by uploading a JSON file.
   */
  async function recordPropertyInS3(): Promise<void> {
    const {
      name,
      propertyAddress,
      instrumentNum,
      deedNumber,
      saleDate,
      salePrice,
      zoning,
      subdivision,
      constructionYear,
      livingSpace,
      state,
      county,
      documents,
    } = propertyData;

    if (
      !name ||
      !propertyAddress ||
      !instrumentNum ||
      !deedNumber ||
      !saleDate ||
      !salePrice ||
      !zoning ||
      !subdivision ||
      !constructionYear ||
      !livingSpace ||
      !state ||
      !county
    ) {
      showAlert(true, "Please fill all required fields");
      return;
    }

    try {
      const data = {
        name,
        propertyAddress,
        deedNumber,
        instrumentNum,
        saleDate,
        salePrice,
        zoning,
        subdivision,
        constructionYear,
        livingSpace,
        state,
        county,
        documents,
        status: "pending",
      };
      console.log("data before stringify it", data);

      // Convert data to a string
      const jsonData = JSON.stringify(data);

      const metadataFilename = `${propertyData.name}_metadata.json`;

      // Create parameters for S3 upload
      const params = {
        Bucket: "property-title-recorder", // Replace with your bucket name
        Key: metadataFilename, // Change the filename if necessary
        Body: jsonData,
        ContentType: "application/json",
      };

      // Upload data to S3
      const uploadedData = await s3.upload(params).promise();

      // Get the URL of the uploaded data
      const url = uploadedData.Location;

      // Pass the URL to the function to record property metadata on the blockchain
      recordPropertyOnChain(url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }

  /**
   * Records a property on the blockchain using the provided metadata URL.
   * @param {string} url - The URL of the metadata to record on-chain.
   */
  async function recordPropertyOnChain(url: string): Promise<void> {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    /* mint the NFT/Property and List it */
    let contract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface,
      signer
    );
    console.log("contract instance", contract);
    let instrumentNum = propertyData.instrumentNum.toString();
    showAlert(
      true,
      "Your property title recording is being processed. Please wait..."
    );
    setActiveTransaction(true);

    try {
      const transaction = await contract.createProperty(url, instrumentNum);
      await transaction.wait();
      showAlert(
        true,
        "Your property title recording has been processed. Awaiting for the Recorder's office approval."
      );
      setActiveTransaction(false);
    } catch (err) {
      console.log("Transaction Failed", err);
      // An error occurred during the transaction
      setActiveTransaction(false);
      showAlert(
        true,
        "Transaction failed: There was an error while processing your property title recording. Please try again later or contact support for assistance."
      );
    }
  }

  /**
   * Submits the property recording process and resets the form.
   */
  async function recordOnSubmit() {
    await recordPropertyInS3();
    if (formRef.current) formRef.current.reset();
  }

  /**
   * Updates the selected documents state based on input value and document type.
   * @param {Object} e - The event object from the input.
   * @param {string} documentType - The type of document being selected.
   */
  const handleDocumentsState = (
    e: React.ChangeEvent<HTMLSelectElement>,
    documentType: string
  ): void => {
    const stateValue = e.target.value;
    setSelectedDocuments((prevStates) => ({
      ...prevStates,
      [stateValue]: documentType,
    }));
  };

  return (
    <section
      id="contact-arch"
      className="contact-sec style2 section-padding position-re bg-img">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="sec-head  text-center">
              <h2 className="wow fadeIn" data-wow-delay=".3s">
                Record title
              </h2>
            </div>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="form wow fadeInUp" data-wow-delay=".5s">
              <form
                ref={formRef}
                id="contact-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  recordOnSubmit();
                }}>
                <br />
                <div className="calendar-container"></div>

                <div className="controls">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_name"
                          type="text"
                          name="user_name"
                          placeholder="Owner Name"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_propertyAddress"
                          type="text"
                          name="form_propertyAddress"
                          placeholder="Property Address"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              propertyAddress: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_deedNumber"
                          type="text"
                          name="user_deedNumber"
                          placeholder="Asset Deed Number"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              deedNumber: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_instrumentNumber"
                          type="text"
                          name="user_instrumentNumber"
                          placeholder="Asset Instrument Number"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              instrumentNum: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_saleDate"
                          type="text"
                          name="user_saleDate"
                          placeholder="Sale Date"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              saleDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_salePrice"
                          type="text"
                          name="user_salePrice"
                          placeholder="Sale Price"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              salePrice: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_Zoning"
                          type="text"
                          name="user_Zoning"
                          placeholder="Zoning"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              zoning: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_Subdivision"
                          type="text"
                          name="user_Subdivision"
                          placeholder="Subdivision"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              subdivision: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_constructionYear"
                          type="text"
                          name="user_form_constructionYear"
                          placeholder="Construction Year"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              constructionYear: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          id="form_livingSpace"
                          type="text"
                          name="user_livingSpace"
                          placeholder="Living Space (sq ft)"
                          required
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updatePropertyData({
                              ...propertyData,
                              livingSpace: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="form-group">
                        <select
                          name="states"
                          onChange={(
                            e: React.ChangeEvent<HTMLSelectElement>
                          ) => {
                            updatePropertyData({
                              ...propertyData,
                              state: e.target.value,
                              county: "",
                            });
                          }}>
                          <option value="">States</option>
                          <option value="arizona">Arizona</option>
                          <option value="newyork">New York</option>
                          <option value="california">California</option>
                        </select>
                      </div>
                    </div>

                    {propertyData.state && (
                      <div className="col-lg-6">
                        <div className="form-group">
                          <select
                            name="counties"
                            onChange={(
                              e: React.ChangeEvent<HTMLSelectElement>
                            ) => {
                              updatePropertyData({
                                ...propertyData,
                                county: e.target.value,
                              });
                            }}>
                            <option value="">Select County</option>
                            {stateCounties[propertyData.state].map(
                              (county, index) => (
                                <option
                                  key={index}
                                  value={county.toLowerCase()}>
                                  {county}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="col-lg-6">
                      <div className="form-group">
                        <select
                          name="documentType"
                          onChange={(
                            e: React.ChangeEvent<HTMLSelectElement>
                          ) => {
                            const documentType = e.target.value;
                            handleDocumentsState(e, documentType);
                            updatePropertyData({
                              ...propertyData,
                              documentType: documentType,
                            });
                          }}>
                          <option value="">Upload Document(s)</option>
                          <option value="deed">Deed</option>
                          <option value="conveyance">Conveyance</option>
                          <option value="title">Title</option>
                          <option value="otherDocuments">
                            Other Document(s)
                          </option>
                        </select>
                      </div>
                    </div>

                    {Object.entries(selectedDocuments).map(
                      ([stateValue, documentType], index) => (
                        <React.Fragment key={index}>
                          {(documentType === "deed" ||
                            documentType === "conveyance" ||
                            documentType === "title" ||
                            documentType === "otherDocuments") && (
                            <div className="col-lg-6">
                              <div className="form-group document">
                                <label htmlFor="document">
                                  Upload{" "}
                                  {documentLabels[documentType] ||
                                    "Document(s)"}
                                </label>
                                <input
                                  type="file"
                                  id="document"
                                  name="document"
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>
                                  ) => handleFileChange(e, documentType)}
                                  className="my-4"
                                  accept=".pdf,.doc,.docx"
                                  multiple
                                />
                                {propertyData.documents &&
                                  propertyData.documents[documentType] &&
                                  propertyData.documents[documentType].length >
                                    0 && (
                                    <ul>
                                      {propertyData.documents[documentType].map(
                                        (url, index) => (
                                          <li key={index}>
                                            <IconButton
                                              aria-label="delete"
                                              size="small"
                                              onClick={() =>
                                                handleDeleteUrl(
                                                  url,
                                                  documentType
                                                )
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
                            </div>
                          )}
                        </React.Fragment>
                      )
                    )}

                    <div className="col-12">
                      <div className="text-center">
                        <button
                          type="submit"
                          disabled={activeTransaction}
                          className="nb butn light mt-30 full-width">
                          <span className="ls3 text-u">
                            {activeTransaction ? "Busy..." : "Record Title"}
                          </span>
                        </button>
                        <div className="msgError">
                          <p>{alert.show && alert.msg}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecordTitles;
