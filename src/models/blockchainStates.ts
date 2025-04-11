export interface BlockchainStates {
  loading: boolean;
  account: string | null;
  smartContract: any;
  web3: any;
  errorMsg: string;
  walletConnected: boolean;
}
