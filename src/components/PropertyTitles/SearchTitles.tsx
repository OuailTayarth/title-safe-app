// React and hooks
import React, { useState, useEffect } from "react";

// Next.js
import Link from "next/link";

// Web3
import { ethers } from "ethers";
import { propertyContractAddress } from "../../../config";
import propertyInterface from "../../../artifacts/contracts/PropertyRecorder.sol/PropertyRecorder.json";

// HTTP client
import axios from "axios";

// Custom hooks
import useAlert from "../useAlert";
import { CopperLoading } from "respinner";
import { Property } from "../../models/property";

const SearchTitles = (): JSX.Element => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [alert, showAlert] = useAlert(10000);
  const [loadingState, setLoadingState] = useState<"not-loaded" | "loaded">(
    "not-loaded"
  );
  const [instrumentNum, setInstrumentNum] = useState<string>("");
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(false);
  const [searchFailed, setSearchFailed] = useState<boolean>(false);
  const [searchClicked, setSearchClicked] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  /**
   * Delays setting the loading state to false after 3 seconds and clears the timeout on cleanup.
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
   * Loads all properties on component mount.
   */
  useEffect(() => {
    loadAllProperties();
  }, []);

  /**
   * Fetches and loads all properties from the blockchain.
   */
  async function loadAllProperties(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(
      `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
    );

    // create contract's instance
    const marketContract = new ethers.Contract(
      propertyContractAddress,
      propertyInterface.abi,
      provider
    );

    /* return all the properties data */
    const data = await marketContract.fetchAllProperties();
    console.log("fetch market Items", data);

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
    setProperties(items);
    setLoadingState("loaded");
    setSearchClicked(false);
  }

  /**
   * Fetches and loads properties filtered by instrument number from the blockchain.
   */
  async function loadFilteredProperties(): Promise<void> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
      );

      // create an instance of smart contracts
      const marketContract = new ethers.Contract(
        propertyContractAddress,
        propertyInterface.abi,
        provider
      );

      if (instrumentNum == "") {
        showAlert(true, "", "error");
        return;
      }

      // convert parse the InstrumentNumber to value that can be read on the blockchain.
      const instrumentNumber = ethers.utils.parseUnits(instrumentNum, 0);

      /* Returns the filtered data based on the instrumentNumber set in the search */
      const data = await marketContract.fetchPropertiesByNum(instrumentNumber);

      if (data.length == 0) {
        setSearchFailed(true);
        showAlert(true, "", "error");
      } else {
        setSearchFailed(false);

        const items = await Promise.all(
          data.map(async (i: any): Promise<Property> => {
            // get NFT URI to fetch the metadata
            const tokenUri = await marketContract.tokenURI(i.tokenId);

            //fetch the meta data from the URI
            const meta = await axios.get(tokenUri);

            let item = {
              tokenId: i.tokenId.toNumber(),
              recorder: i.recorder,
              database: i.database,
              instrumentNum: i.instrumentNumber.toNumber(),
              name: meta.data.name,
              status: i.status,
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
            };

            return item;
          })
        );
        setFilteredProperties(items);
        setLoadingState("loaded");
        setSearchClicked(true);
        setSearchFailed(false);
      }
    } catch (error) {
      console.error("Error filtering properties", error);
      setSearchFailed(true);
    }
  }

  /**
   * Updates search enablement based on selected location.
   * @param {Object} e - The event object from the select input.
   */
  function handleSelectedLocation(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedLocation = e.target.value;
    setIsSearchEnabled(selectedLocation !== "All");
  }

  const displayProperties: Property[] = searchClicked
    ? filteredProperties
    : properties;

  /**
   * Checks if data is loaded but no properties exist, then displays a no properties message.
   */
  if (loadingState == "loaded" && properties.length === 0)
    return (
      <h1 className="loader-container">No property have been recorded yet!</h1>
    );
  return (
    <section className="blog-grid section-padding position-re">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-md-10">
            <div className="sec-head text-center">
              <h2 className="wow fadeIn" data-wow-delay=".5s">
                Search Title
              </h2>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="form-wrapper">
              <form
                onSubmit={(e: React.ChangeEvent<HTMLFormElement>) =>
                  e.preventDefault()
                }>
                <div className="form-group d-flex align-items-center">
                  <label htmlFor="state" className="mr-2">
                    Search Property:
                  </label>
                  <div className="flex-grow-1">
                    <select
                      id="state"
                      name="selected value"
                      className="form-control"
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleSelectedLocation(e)
                      }>
                      <option value="All">All properties</option>
                      <option value="InstrumentNum">
                        By instrument number
                      </option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="form-wrapper">
              {isSearchEnabled && (
                <form
                  className="my-form"
                  onSubmit={(e: React.ChangeEvent<HTMLFormElement>) =>
                    e.preventDefault()
                  }>
                  <div className="form-group d-flex align-items-center">
                    <button
                      className="mr-2 nb searchBtn light"
                      onClick={loadFilteredProperties}
                      type="submit">
                      Search
                    </button>
                    <div className="flex-grow-1">
                      <input
                        id="form_instrumentNumber"
                        type="text"
                        className="input_instrumentNumber"
                        name="user_instrumentNumber"
                        placeholder="Asset Instrument Number"
                        required={true}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInstrumentNum(e.target.value)
                        }
                      />
                    </div>
                  </div>
                  {searchFailed && (
                    <div>
                      {alert.show && alert.type === "error" && (
                        <div
                          className="alert alert-warning"
                          role="alert"
                          style={{ textAlign: "center" }}>
                          Invalid input - No results found for the given
                          instrument number.
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="content-wrapper">
          {loadingData ? (
            <div className="loading-container">
              <CopperLoading fill="#fff" size={50} strokeWidth={3} />
            </div>
          ) : (
            <div className="row mt-30">
              {displayProperties.map((item, index) => (
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
                                    <Link href="" legacyBehavior>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SearchTitles;
