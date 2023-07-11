/* eslint-disable no-console */
import Controller from "@ember/controller";


let walletAccounts = [];
let selectedAddress = null;

export default Controller.extend({
  loading: false,
  username: '',
  password: '',
  error: '',
  tfa_token: '',
  user_id: null,

  init() {
    this._super(...arguments);
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
    try {
      const wallet = window.injectedWeb3?.[selectedWallet] || null;
      if (!wallet) { throw new Error('Wallet not found.'); }

      let injected;
      try {
        injected = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Wallet timeout. Please try again.'));
          }, 60000); // wait 60 sec

          if(wallet && wallet.enable) {
            wallet.enable('polkassembly')
              .then((value) => { clearTimeout(timeoutId); resolve(value); })
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

      const accounts = await injected.accounts.get();
      if (accounts.length === 0) {
        walletAccounts = []; //should be @tracked property
        console.log('walletAccounts ', walletAccounts);
        return;
      }

      accounts.forEach((account) => {
        // account.address = encodeAddress(account.address, 42) || account.address;
        account.address = (account.address) || account.address;
      });

      walletAccounts = accounts; //@tracked property
      if (accounts.length > 0) {
        selectedAddress = accounts[0].address; //@tracked property
        console.log('selectedAddress : ', selectedAddress);
      }
      return;
    } catch (e) {
      this.set('error', e.message);
      console.log(e);
    }
  },

  actions: {
    resetError() {
      this.set('error', '');
    },
    async submitWeb2Form() {
      this.username = document.getElementById("username_input").value;
      this.password = document.getElementById("password_input").value;
      this.submitWeb2Form(this.username, this.password);
    },
    async submit2FAForm(authCode) {
      this.submit2FAForm(authCode);
    },
    async fetchWalletAddresses(selectedWallet) {
      this.fetchWalletAddresses(selectedWallet);
    }
  }
});
