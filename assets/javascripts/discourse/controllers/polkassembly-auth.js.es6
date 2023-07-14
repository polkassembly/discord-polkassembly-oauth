/* eslint-disable no-console */
import Controller from "@ember/controller";

export default Controller.extend({
  loading: false,
  username: '',
  password: '',
  error: '',
  tfa_token: '',
  user_id: null,
  auth_code: '',
  walletAddresses: [],
  selectedAddress: '',
  selectedWallet: '',

  init() {
    this._super(...arguments);
  },

  stringToHex(input) {
    let hexString = '';

    for (let i = 0; i < input.length; i++) {
      const hex = input.charCodeAt(i).toString(16);
      hexString += hex.padStart(2, '0');
    }

    return '0x' + hexString;
  },

	async submitWeb2Form(username, password) {
    if(!username || !password) { throw new Error('Username and password are required.'); }

    this.set('loading', true);

    try {
      const response = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/login`, {
        body: JSON.stringify({ username, password }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const resJSON = await response.json() || null;

      if(response.status !== 200 || !resJSON) { throw new Error(resJSON?.message || 'Polkassembly API fetch error.'); }

      console.log('submitWeb2Form response : ', resJSON);

      if(resJSON?.token) {
        //TODO:  Decode token and send whatever you need to your backend to make things work!
				return resJSON.token;
			} else if(resJSON?.isTFAEnabled) {
				if(!resJSON?.tfa_token) { throw new Error(resJSON?.error || 'TFA token missing. Please try again.'); }
        this.set('user_id', resJSON.user_id);
        this.set('tfa_token', resJSON.tfa_token);
			}
    } catch (e) {
      this.set('error', e.message);
      console.log(e);
    } finally {
      this.set('loading', false);
    }
	},

  async submit2FAForm(authCode) {
    if(isNaN(authCode)) { throw new Error('Invalid authentication code.'); };

    this.set('loading', true);
    try {
      const response = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/2fa/validate`, {
        body: JSON.stringify({
          tfa_token: this.tfa_token,
          user_id: Number(this.user_id), //tracked property,
          auth_code: String(authCode)
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const resJSON = await response.json() || null;

      if(response.status !== 200 || !resJSON) { throw new Error(resJSON?.message || 'Polkassembly API fetch error.'); }

      console.log('submit2FAForm response : ', resJSON);

      if(resJSON?.token) {
        //TODO:  Decode token and send whatever you need to your backend to make things work!
				return resJSON.token;
			}
    } catch (e) {
      console.log(e);
      this.set('error', e.message);
    } finally {
      this.set('loading', false);
    }
  },

  async fetchWalletAddresses(selectedWallet) {
    let accounts = [];

    try {
      if(selectedWallet === 'metamask') {
        if(!window.ethereum) { throw new Error('Metamask not found.'); }

        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        accounts = accounts.map((address) => {
          const account = {
            address: address.toLowerCase(),
            meta: {
              genesisHash: null,
              name: 'metamask',
              source: 'metamask'
            }
          };

          return account;
        });
      } else {
        const wallet = window.injectedWeb3?.[selectedWallet] || null;
        if (!wallet) { throw new Error('Wallet not found.'); }

        let injected;
        try {
          injected = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Wallet timeout. Please try again.'));
            }, 60000); // wait 60 sec

            if(wallet && wallet.enable) {
              wallet.enable('discourse-polkassembly-auth')
                .then((value) => {
                  clearTimeout(timeoutId);
                  resolve(value);
                })
                .catch((e) => { reject(e); });
            }
          });
        } catch (err) {
          if (err?.message === 'Rejected') {
            throw new Error('Wallet authorisation rejected. Please try again.');
          } else if (
            err?.message ===
            'Pending authorisation request already exists for this site. Please accept or reject the request.'
          ) {
            throw new Error('Pending authorisation request already exists for this site. Please accept or reject the request in your wallet.');
          } else if (err?.message === 'Wallet Timeout') {
            throw new Error('Wallet authorisation timed out. Please accept or reject the request on the wallet extension and try again.');
          }
        }

        if (!injected) { throw new Error('Wallet error. Please refresh and try again.'); }

        accounts = await injected.accounts.get();
      }

      if (accounts.length === 0) {
        this.set('walletAddresses', []);
        return;
      }

      this.set('walletAddresses', accounts);

      if (accounts.length > 0) {
        this.set('selectedAddress', accounts[0].address);
      }
      return;
    } catch (e) {
      this.set('error', e.message);
      console.log(e);
    }
  },

  async signWithMetamask(signMessage) {
    return new Promise((resolve, reject) => {
      window.ethereum.sendAsync({
        method: 'personal_sign',
        params: [signMessage, this.selectedAddress],
        from: this.selectedAddress
      }, (err, result) => {
        if (err) {
          reject(err);
        } else if (result.error) {
          reject(result.error);
        } else {
          resolve(result.result);
        }
      });
    });
  },

  async signupWithWeb3(signRaw) {
    const addressSignupStartResponse = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/addressSignupStart`, {
      body: JSON.stringify({ address: this.selectedAddress }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    const addressSignupStartResJSON = await addressSignupStartResponse.json() || null;

    if(addressSignupStartResponse.status !== 200 || !addressSignupStartResJSON) { throw new Error(addressSignupStartResJSON?.message || 'Polkassembly API fetch error.'); }

    console.log('addressSignupStartResJSON : ', addressSignupStartResJSON);

    const signMessage = addressSignupStartResJSON?.signMessage;
    if (!signMessage) { throw new Error('Challenge message not found'); }

    let signature;

    if(this.selectedWallet === 'metamask') {
      signature = await this.signWithMetamask(signMessage);
    } else {
      if(!signRaw) { throw new Error('SignRaw function not found. Please try again.'); }

      const { signature: signedMsg } = await signRaw({
        address: this.selectedAddress,
        data: this.stringToHex(signMessage),
        type: 'bytes'
      });

      signature = signedMsg;
    }

    const addressSignupResponse = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/addressSignupConfirm`, {
      body: JSON.stringify({ address: this.selectedAddress, signature, wallet: this.selectedWallet }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    const addressSignupResJSON = await addressSignupResponse.json() || null;
    if(addressSignupResponse.status !== 200 || !addressSignupResJSON) { throw new Error(addressSignupResJSON?.message || 'Polkassembly API fetch error.'); }

    if(addressSignupResJSON?.token) {
      console.log('got addressSignupResJSON.token');
      //TODO:  Decode token and send whatever you need to your backend to make things work!
      return addressSignupResJSON.token;
    }
  },

  async getLoginStartSignMessage() {
    const loginStartResponse = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/addressLoginStart`, {
        body: JSON.stringify({ address: this.selectedAddress, wallet: this.selectedWallet }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const loginStartResJSON = await loginStartResponse.json() || null;

      if(loginStartResponse.status !== 200 || !loginStartResJSON) { throw new Error(loginStartResJSON?.message || 'Polkassembly API fetch error.'); }

      console.log('loginStartResponse : ', loginStartResJSON);

      const signMessage = loginStartResJSON?.signMessage;
			if (!signMessage) { throw new Error('Challenge message not found'); }
      return signMessage;
  },

  async getAddressLoginResponse(signature) {
    const addressLoginResponse = await fetch(`https://api.polkassembly.io/api/v1/auth/actions/addressLogin`, {
        body: JSON.stringify({ address: this.selectedAddress, signature, wallet: this.selectedWallet }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      });

      const addressLoginResJSON = await addressLoginResponse.json() || null;
      return addressLoginResJSON;
  },

  async handleAddressLogin(signature, signRaw) {
    const addressLoginResJSON = await this.getAddressLoginResponse(signature);

    // signup if not signed up
    if (addressLoginResJSON.message === 'Please sign up prior to logging in with a web3 address') {
      await this.signupWithWeb3(signRaw);
      return;
    }

    if(addressLoginResJSON?.token) {
      console.log('got addressLoginResJSON.token');
      //TODO:  Decode token and send whatever you need to your backend to make things work!
      return addressLoginResJSON.token;
    } else if(addressLoginResJSON?.isTFAEnabled) {
      if(!addressLoginResJSON?.tfa_token) { throw new Error(addressLoginResJSON?.error || 'TFA token missing. Please try again.'); }
      this.set('user_id', addressLoginResJSON.user_id);
      this.set('tfa_token', addressLoginResJSON.tfa_token);
    }
  },

  async submitWeb3Form(selectedAddress) {
    if(!selectedAddress) { throw new Error('Address is required.'); }
    this.set('loading', true);

    try {
      const signMessage = await this.getLoginStartSignMessage();

      if(this.selectedWallet === 'metamask') {
        const signature = await this.signWithMetamask(signMessage);
        await this.handleAddressLogin(signature);
      } else {
        const wallet = window.injectedWeb3[this.selectedWallet];
        const injected = wallet && await wallet?.enable('discourse-polkassembly-auth');

        const signRaw = injected && injected.signer && injected.signer.signRaw;
        if (!signRaw) { return console.error('Signer not available'); }

        const { signature } = await signRaw({
          address: this.selectedAddress,
          data: this.stringToHex(signMessage),
          type: 'bytes'
        });

        await this.handleAddressLogin(signature);
      }

    } catch (e) {
      this.set('error', e.message);
      console.log(e);
    } finally {
      this.set('loading', false);
    }
	},

  actions: {
    resetState() {
      this.set('error', '');
      this.set('loading', false);
      this.set('username', '');
      this.set('password', '');
      this.set('tfa_token', '');
      this.set('user_id', null);
      this.set('auth_code', '');
      this.set('walletAddresses', []);
      this.set('selectedAddress', '');
      this.set('selectedWallet', '');
    },
    async submitWeb2Form() {
      this.username = document.getElementById("username_input").value;
      this.password = document.getElementById("password_input").value;
      this.submitWeb2Form(this.username, this.password);
    },
    async submit2FAForm() {
      this.auth_code = document.getElementById("auth_code_input").value;
      this.submit2FAForm(this.auth_code);
    },
    async fetchWalletAddresses(selectedWallet) {
      this.set('selectedWallet', selectedWallet);
      this.fetchWalletAddresses(selectedWallet);
    },
    async submitWeb3Form() {
      this.selectedAddress = document.getElementById("wallet_address_select").value;
      this.submitWeb3Form(this.selectedAddress);
    }
  }
});
