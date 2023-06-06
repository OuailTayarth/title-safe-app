const initialState = {
  loading: false,
  account: null,
  smartContract: null,
  web3: null,
  errorMsg: "",
  walletConnected: false,
};

const blockchainReducer = (state = initialState, action) => {
  switch (action.type) {
    case "CONNECTION_REQUEST":
      return {
        ...initialState,
        loading: false,
        walletConnected: false,
      };
    case "CONNECTION_SUCCESS":
      return {
        ...state,
        loading: false,
        account: action.payload.account,
        smartContract: action.payload.smartContract,
        web3: action.payload.web3,
        walletConnected: true,
      };

    case "DISCONNECTION_WALLET":
      return {
        ...state,
        loading: false,
        account: action.payload.account,
        smartContract: action.payload.smartContract,
        web3: action.payload.web3,
        walletConnected: false,
      };

    case "CONNECTION_FAILED":
      return {
        ...initialState,
        loading: false,
        errorMsg: action.payload,
        walletConnected: false,
      };
    case "UPDATE_ACCOUNT":
      return {
        ...state,
        account: action.payload.account,
        walletConnected: false,
      };
    default:
      return state;
  }
};

export default blockchainReducer;
