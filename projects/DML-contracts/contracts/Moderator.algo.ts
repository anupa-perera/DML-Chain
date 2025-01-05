import { Contract } from '@algorandfoundation/tealscript';

export class DMLChain extends Contract {
  // store hash on global state
  ipfsHash = GlobalStateKey<string>();

  // get hash method
  gethash(ipfsHash: string): string {
    return 'hash is present and ' + ipfsHash;
  }
}
